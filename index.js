// Copyright (c) 2015 Patrick Dubroy <pdubroy@gmail.com>
// This software is distributed under the terms of the MIT License.

'use strict';

var assert = require('assert');
var csp = require('js-csp');
var inherits = require('inherits');

var BUFFER_SIZE = 512;

function JoinPattern(chan) {
  this._channels = [chan];
  this._syncChannel = chan.isSynchronous() ? chan : null;
}

JoinPattern.prototype.isReady = function() {
  return this._channels.every(function(c) { return !c.isEmpty(); });
};

function getMatches(patt) {
  return patt._channels.map(function(c) { return c._take(); });
}

Object.defineProperty(JoinPattern.prototype, 'length', {
  get: function() { return this._channels.length; }
});

function Reaction(pattern, fn) {
  this._pattern = pattern;
  this._body = fn;

  for (var i = 0; i < pattern._channels.length; ++i) {
    pattern._channels[i]._addReaction(this);
  }
}

Reaction.prototype.try = function() {
  if (this._pattern.isReady()) {
    return {value: this.run()};
  }
};

Reaction.prototype.run = function() {
  return this._body.apply(null, getMatches(this._pattern));
};

JoinPattern.prototype.and = function(chan) {
  this._channels.push(chan);
  return this;
};

JoinPattern.prototype.do = function(fn) {
  return new Reaction(this, fn);
};

function Channel() {
  if (!(this instanceof Channel)) {
    return new Channel();
  }
  this._chan = csp.chan(BUFFER_SIZE);
  this._waiting = [];
  this._queue = [];
}

Channel.prototype.isSynchronous = function() {
  return true;
};

Channel.prototype.isEmpty = function() {
  return this._chan.buf.count() === 0;
};

// Should be yield()ed from.
Channel.prototype.send = function(val) {
  csp.offer(this._chan, val);

  // Run up to one reaction that is waiting on this channel.
  // TODO: Should we try to run as many as possible?
  for (var i = 0; i < this._waiting.length; ++i) {
    var reaction = this._waiting[i];
    var result = reaction.try();
    if (result) {
      // If this is an asynchronous channel, don't return the result
      // directly -- pump it into the iterator any iterator that is
      // waiting on the synchronous channel associated with this pattern.
      if (this.isSynchronous()) {
        return result.value;
      }
      // TODO: Refactor this.
      var chan = reaction._pattern._channels[0];
      if (chan.isSynchronous() && chan._queue.length >= 0) {
        var proc = chan._queue.shift();
        proc.step(result.value);
      }
      return;  // eslint-disable-line consistent-return
    }
  }
  return {status: 'BLOCKING', channel: this};
};

Channel.prototype._take = function() {
  assert(!this.isEmpty(), "Can't take from an empty channel");
  return csp.poll(this._chan);
};

Channel.prototype._addReaction = function(r) {
  this._waiting.push(r);
};

function AsyncChannel() {
  if (!(this instanceof AsyncChannel)) {
    return new AsyncChannel();
  }
  Channel.call(this);
}
inherits(AsyncChannel, Channel);

AsyncChannel.prototype.isSynchronous = function() {
  return false;
};

class Process {
  constructor(fn, optArgs, optThisArg) {
    assert.equal(typeof fn, 'function', 'Expected a generator function');
    this._iter = fn.apply(optThisArg, optArgs || []);
  }

  step(value) {
    var result = this._iter.next(value);
    var state = this._state = result.value;
    if (typeof state === 'object' && state.status === 'BLOCKING') {
      state.channel._queue.push(this);
    }
    this._done = result.done;
  }

  isComplete() {
    return this._done;
  }
}

function when(chan) {
  return new JoinPattern(chan);
}

function spawn(fn, optArgs, optThisArg) {
  var p = new Process(fn, optArgs, optThisArg);
  p.step();
  return p;
}

module.exports = {
  AsyncChannel: AsyncChannel,
  Channel: Channel,
  spawn: spawn,
  when: when
};
