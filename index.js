// Copyright (c) 2015 Patrick Dubroy <pdubroy@gmail.com>
// This software is distributed under the terms of the MIT License.

'use strict';

var assert = require('assert');
var csp = require('js-csp');

var BUFFER_SIZE = 512;

// Helpers
// -------

function getMatches(patt) {
  return patt._channels.map(function(c) { return c._take(); });
}

// Reaction
// --------

class Reaction {
  constructor(pattern, bodyFn) {
    this._pattern = pattern;
    this._body = bodyFn;

    for (var i = 0; i < pattern._channels.length; ++i) {
      pattern._channels[i]._addReaction(this);
    }
  }

  // If the pattern is ready, execute the reaction, and return an object
  // with a `value` property. Otherwise, return null.
  try(chan) {
    if (this._pattern.isReady()) {
      return {value: this.run()};
    }
    return null;
  }

  // Like `try`, but if the reaction is executed, the result will be injected
  // into the first process that is blocked on the pattern's synchronous
  // channel (if there is one). Return true if the reaction was executed,
  // otherwise false.
  tryAndMaybeReply() {
    var result = this.try();
    if (result) {
      var replyChan = this._pattern.getSynchronousChannel();
      if (replyChan) {
        replyChan.reply(result.value);
      }
      return true;
    }
    return false;
  }

  run() {
    return this._body.apply(null, getMatches(this._pattern));
  }
}

// JoinPattern
// -----------

class JoinPattern {
  constructor(chan) {
    this._channels = [chan];
    this._synchronousChannel = chan.isSynchronous() ? chan : null;
  }

  isReady() {
    return this._channels.every(function(c) { return !c.isEmpty(); });
  }

  get length() {
    return this._channels.length;
  }

  // Return the synchronous channel for this pattern, if there is one.
  // Otherwise, return null.
  getSynchronousChannel() {
    return this._synchronousChannel;
  }

  and(chan) {
    this._channels.push(chan);
    return this;
  }

  do(fn) {
    return new Reaction(this, fn);
  }
}

// Channel
// -------

class Channel {
  constructor() {
    this._chan = csp.chan(BUFFER_SIZE);
    this._reactions = [];
    this._queue = [];
  }

  isSynchronous() {
    return true;
  }

  isEmpty() {
    return this._chan.buf.count() === 0;
  }

  // Should be yield()ed from.
  send(val) {
    csp.offer(this._chan, val);

    // Run up to one reaction that is waiting on this channel.
    for (var i = 0; i < this._reactions.length; ++i) {
      var result = this._reactions[i].try();
      if (result) {
        return result.value;
      }
    }
    return {status: 'BLOCKING', channel: this};
  }

  reply(val) {
    assert(this.isSynchronous(), "Can't reply on an asynchronous channel");
    assert(this._queue.length > 0, "Can't reply: no processes waiting");

    // Pump the value into the process at the head of the queue.
    var proc = this._queue.shift();
    proc.step(val);
  }

  _take() {
    assert(!this.isEmpty(), "Can't take from an empty channel");
    return csp.poll(this._chan);
  };

  _addReaction(r) {
    this._reactions.push(r);
  }
}

// AsyncChannel
// ------------

class AsyncChannel extends Channel {
  isSynchronous() {
    return false;
  }

  send(val) {
    csp.offer(this._chan, val);
    this._reactions.find(r => r.tryAndMaybeReply());
  }
}

// Process
// -------

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

// Exports
// -------

function when(chan) {
  return new JoinPattern(chan);
}

function spawn(fn, optArgs, optThisArg) {
  var p = new Process(fn, optArgs, optThisArg);
  p.step();
  return p;
}

module.exports = {
  AsyncChannel: () => new AsyncChannel(),
  Channel: () => new Channel(),
  spawn: spawn,
  when: when
};
