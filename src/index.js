// Copyright (c) 2015 Patrick Dubroy <pdubroy@gmail.com>
// This software is distributed under the terms of the MIT License.
/* global setImmediate, clearImmediate */

'use strict';

let assert = require('assert');
require('setimmediate');  // Polyfill for `setImmediate` and `clearImmediate`.

let nextTaskId = 0;
let pendingTasks = Object.create(null);

// Helpers
// -------

function getMatches(patt) {
  return patt._channels.map(function(c) { return c._take(); });
}

function isChannel(obj) {
  return obj instanceof Channel;  // eslint-disable-line no-use-before-define
}

// Enqueues a function as a macrotask to be executed asynchronously using `setImmediate`.
// See https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/setImmediate/Overview.html.
function enqueueTask(fn) {
  let id = nextTaskId++;
  let handle = null;
  pendingTasks[id] = () => {
    if (id in pendingTasks) {
      fn.apply(null, arguments);
      clearImmediate(handle);
      delete pendingTasks[id];
    }
  };
  handle = setImmediate(pendingTasks[id]);
}

// Queue
// -----

class Queue {
  constructor() {
    this._contents = [];
  }

  enqueue(val) {
    this._contents.push(val);
  }

  dequeue(val) {
    return this._contents.shift();
  }

  get length() {
    return this._contents.length;
  }
}

// Reaction
// --------

class Reaction {
  constructor(pattern, bodyFn) {
    this._pattern = pattern;
    this._body = bodyFn;

    for (let i = 0; i < pattern._channels.length; ++i) {
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
    if (this._pattern.isReady()) {
      let replyChan = this._pattern.getSynchronousChannel();
      enqueueTask(() => {
        let result = this.run();
        if (replyChan) {
          replyChan.reply(result);
        }
      });
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
  constructor(chanOrProxy) {
    let chan = isChannel(chanOrProxy) ? chanOrProxy : chanOrProxy._inst;
    assert(isChannel(chan), 'Not a channel');
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
    this._messages = new Queue();
    this._reactions = [];
    this._waiting = new Queue();
  }

  isSynchronous() {
    return true;
  }

  isEmpty() {
    return this._messages.length === 0;
  }

  // Should be yield()ed from.
  send(val) {
    this._messages.enqueue(val);

    // Run up to one reaction that is waiting on this channel.
    for (let i = 0; i < this._reactions.length; ++i) {
      let result = this._reactions[i].try();
      if (result) {
        return result.value;
      }
    }
    return {status: 'BLOCKING', channel: this};
  }

  reply(val) {
    assert(this.isSynchronous(), "Can't reply on an asynchronous channel");
    assert(this._waiting.length > 0, "Can't reply: no processes waiting");

    // Pump the value into the process at the head of the queue.
    let proc = this._waiting.dequeue();
    proc.step(val);
  }

  _take() {
    assert(!this.isEmpty(), "Can't take from an empty channel");
    return this._messages.dequeue();
  };

  _addReaction(r) {
    this._reactions.push(r);
  }

  _enqueue(proc) {
    this._waiting.enqueue(proc);
  }
}

// AsyncChannel
// ------------

class AsyncChannel extends Channel {
  isSynchronous() {
    return false;
  }

  send(val) {
    this._messages.enqueue(val);
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
    let result = this._iter.next(value);
    let state = this._state = result.value;
    if (typeof state === 'object' && state.status === 'BLOCKING') {
      state.channel._enqueue(this);
      this._done = result.done;
    } else {
      this._done = true;
    }
  }

  isComplete() {
    return this._done;
  }
}

// Exports
// -------

function spawn(fn, optArgs, optThisArg) {
  let p = new Process(fn, optArgs, optThisArg);
  enqueueTask(p.step.bind(p));
  return p;
}

function when(chan) {
  return new JoinPattern(chan);
}

// Create a new synchronous channel, and return a function which seends a
// message on that channel.
function newChannel() {
  let chan = new Channel();
  let result = chan.send.bind(chan);
  result._inst = chan;
  return result;
}

// Runs all of the tasks that are currently pending.
// If any tasks cause new tasks to be enqueued, those tasks will not be run.
function _runPendingTasks() {
  for (let id in pendingTasks) {
    pendingTasks[id]();
  }
}

module.exports = {
  AsyncChannel: () => new AsyncChannel(),
  Channel: newChannel,
  spawn,
  when,
  _runPendingTasks
};
