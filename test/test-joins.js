'use strict';

let joins = require('..');
let test = require('tape');

function doesSendBlock(chan, message) {
  let result = chan(message);
  return typeof result === 'object' && result.status === 'BLOCKING';
}

function arrayOf(ctor, n) {
  let result = [];
  while (result.length < n) {
    result.push(ctor());
  }
  return result;
}

test('simple synchronous send', (t) => {
  let chan = joins.Channel();
  let results = [];

  joins.when(chan).do((s) => {
    results.push(s);
    return s;
  });
  chan('Hello, joins!');
  t.deepEqual(results, ['Hello, joins!']);

  t.equal(chan('another'), 'another');
  t.equal(chan('and another'), 'and another');

  t.equal(results.length, 3);
  t.deepEqual(results, ['Hello, joins!', 'another', 'and another']);

  t.end();
});

test('simple sync and async combination', (t) => {
  let chan = joins.Channel();
  let asyncChan = joins.AsyncChannel();

  joins.when(chan).and(asyncChan).do((syncVal, asyncVal) => {
    return syncVal + asyncVal;
  });
  asyncChan.send(' async');
  t.equal(chan('Hello'), 'Hello async');

  asyncChan.send(' again!');
  t.equal(chan('Hello'), 'Hello again!');

  asyncChan.send('?');
  asyncChan.send('!');
  t.equal(chan('wut'), 'wut?');
  t.equal(chan('wut'), 'wut!');

  t.ok(doesSendBlock(chan, 'this will block'), 'blocks without async message');

  t.end();
});

test('blocking synchronous send', (t) => {
  let chan = joins.Channel();
  let asyncChan = joins.AsyncChannel();

  joins.when(chan).and(asyncChan).do((syncVal, asyncVal) => {
    return syncVal + asyncVal;
  });

  // Spawn a new process which will block on `chan` until a message is
  // received on `asyncChan`.
  let result;
  let proc = joins.spawn(function*() {
    result = yield chan('Hello');
  });
  joins._runPendingTasks();

  t.notOk(proc.isComplete(), 'proc is blocking');
  asyncChan.send(' async');

  joins._runPendingTasks();
  t.ok(proc.isComplete(), 'proc finishes after async send');
  t.equal(result, 'Hello async');

  t.end();
});

test('purely asynchronous chords', (t) => {
  let chans = [joins.AsyncChannel(), joins.AsyncChannel()];
  let result;
  joins.when(chans[0]).and(chans[1]).do((a, b) => {
    result = a + b;
  });
  chans[0].send(1);
  joins._runPendingTasks();

  t.notOk(result);
  chans[1].send(9);
  joins._runPendingTasks();

  t.equal(result, 10);

  t.end();
});

test('dining philosophers', (t) => {
  const COUNT = 5;
  const ALL_TRUE = arrayOf(() => true, COUNT);

  let hungry = arrayOf(joins.Channel, COUNT);
  let chopsticks = arrayOf(joins.AsyncChannel, COUNT);

  let eaten = arrayOf(() => false, COUNT);

  hungry.forEach((h, i) => {
    let left = chopsticks[i];
    let right = chopsticks[(i + 1) % chopsticks.length];

    joins.when(h).and(left).and(right).do(() => {
      eaten[i] = true;
      left.send();
      right.send();
    });
  });

  function *runPhilosopher(hungryChan) {
    yield hungryChan();
  }

  // Spawn the philosophers and put out the chopsticks.
  let phils = hungry.map(h => joins.spawn(runPhilosopher, [h]));
  chopsticks.forEach(c => c.send());
  joins._runPendingTasks();

  t.deepEqual(eaten, ALL_TRUE, 'everyone has eaten');
  t.deepEqual(phils.map(p => p.isComplete()), ALL_TRUE, 'all procs complete');

  // A second round to that it still works when the processes are spawned
  // after the chopsticks are ready.
  phils = hungry.map(h => joins.spawn(runPhilosopher, [h]));
  joins._runPendingTasks();
  t.deepEqual(eaten, ALL_TRUE, 'everyone has eaten');
  t.deepEqual(phils.map(p => p.isComplete()), ALL_TRUE, 'all procs complete');

  t.end();
});
