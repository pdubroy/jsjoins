'use strict';

var joins = require('..');
var test = require('tape');

test('simple synchronous send', function (t) {
  var chan1 = joins.Channel();
  var results = [];

  joins.when(chan1).do(function(s) {
    results.push(s);
    return s;
  });
  chan1.send('Hello, joins!');
  t.deepEqual(results, ['Hello, joins!']);

  t.equal(chan1.send('another'), 'another');
  t.equal(chan1.send('and another'), 'and another');

  t.equal(results.length, 3);
  t.deepEqual(results, ['Hello, joins!', 'another', 'and another']);

  t.end();
});
