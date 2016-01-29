// Copyright (c) 2015 Patrick Dubroy <pdubroy@gmail.com>
// This software is distributed under the terms of the MIT License.

'use strict';

var assert = require('assert');
var csp = require('js-csp');

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
    var result = this._waiting[i].try();
    if (result) {
      return result.value;
    }
  }
  throw new Error('FIXME - Block here');
};

Channel.prototype._take = function() {
  assert(!this.isEmpty(), "Can't take from an empty channel");
  return csp.poll(this._chan);
};

Channel.prototype._addReaction = function(r) {
  this._waiting.push(r);
};

function AsyncChannel() {
}

AsyncChannel.prototype.isSynchronous = function() {
  return false;
};

function when(chan) {
  return new JoinPattern(chan);
}

module.exports = {
  AsyncChannel: AsyncChannel,
  Channel: Channel,
  when: when
};
