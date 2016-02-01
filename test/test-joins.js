'use strict';

var joins = require('..');
var test = require('tape');

function doesSendBlock(chan, message) {
  var result = chan.send(message);
  return typeof result === 'object' && result.status === 'BLOCKING';
}

function arrayOf(ctor, n) {
  var result = [];
  while (result.length < n) {
    result.push(ctor());
  }
  return result;
}

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

  t.ok(doesSendBlock(chan, 'this will block'), 'blocks without async message');

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

test('purely asynchronous chords', function(t) {
  var chans = [joins.AsyncChannel(), joins.AsyncChannel()];
  var result;
  joins.when(chans[0]).and(chans[1]).do(function(a, b) {
    result = a + b;
  });
  chans[0].send(1);
  t.notOk(result);
  chans[1].send(9);
  t.equal(result, 10);

  t.end();
});

test('dining philosophers', function(t) {
  var COUNT = 5;
  var hungry = arrayOf(joins.Channel, COUNT);
  var chopsticks = arrayOf(joins.AsyncChannel, COUNT);

  var eaten = arrayOf(() => false, COUNT);

  hungry.forEach((h, i) => {
    var left = chopsticks[i];
    var right = chopsticks[(i + 1) % chopsticks.length];
    joins.when(h).and(left).and(right).do(() => {
      eaten[i] = true;
      left.send();
      right.send();
    });
  });

  function *runPhilosopher(hungryChan) {
    yield hungryChan.send();
  }

  // Spawn the philosophers and put out the chopsticks.
  var phils = hungry.map(h => joins.spawn(runPhilosopher, [h]));
  chopsticks.forEach(c => c.send());

  var ALL_TRUE = arrayOf(() => true, COUNT);
  t.deepEqual(eaten, ALL_TRUE, 'everyone has eaten');
  t.deepEqual(phils.map(p => p.isComplete()), ALL_TRUE, 'all procs complete');

  // A second round to that it still works when the processes are spawned
  // after the chopsticks are ready.
  phils = hungry.map(h => joins.spawn(runPhilosopher, [h]));
  t.deepEqual(eaten, ALL_TRUE, 'everyone has eaten');
  t.deepEqual(phils.map(p => p.isComplete()), ALL_TRUE, 'all procs complete');

  t.end();
});
