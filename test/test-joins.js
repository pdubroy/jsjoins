'use strict';

var joins = require('..');
var test = require('tape');

test('simple synchronous send', function (t) {
  var chan = joins.Channel();
  var results = [];

  joins.when(chan).do(function(s) {
    results.push(s);
    return s;
  });
  chan.send('Hello, joins!');
  t.deepEqual(results, ['Hello, joins!']);

  t.equal(chan.send('another'), 'another');
  t.equal(chan.send('and another'), 'and another');

  t.equal(results.length, 3);
  t.deepEqual(results, ['Hello, joins!', 'another', 'and another']);

  t.end();
});

test('simple sync and async combination', function (t) {
  var chan = joins.Channel();
  var asyncChan = joins.AsyncChannel();

  joins.when(chan).and(asyncChan).do(function(syncVal, asyncVal) {
    return syncVal + asyncVal;
  });
  asyncChan.send(' async');
  t.equal(chan.send('Hello'), 'Hello async');

  asyncChan.send(' again!');
  t.equal(chan.send('Hello'), 'Hello again!');

  asyncChan.send('?');
  asyncChan.send('!');
  t.equal(chan.send('wut'), 'wut?');
  t.equal(chan.send('wut'), 'wut!');

  t.end();
});

test('blocking synchronous send', function (t) {
  var chan = joins.Channel();
  var asyncChan = joins.AsyncChannel();

  joins.when(chan).and(asyncChan).do(function(syncVal, asyncVal) {
    return syncVal + asyncVal;
  });

  // Spawn a new process which will block on `chan` until a message is
  // received on `asyncChan`.
  var result;
  var proc = joins.spawn(function*() {
    result = yield chan.send('Hello');
  });
  t.notOk(proc.isComplete(), 'proc is blocking');
  asyncChan.send(' async');
  t.ok(proc.isComplete(), 'proc finishes after async send');
  t.equal(result, 'Hello async');

  t.end();
});
