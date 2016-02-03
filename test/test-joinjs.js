'use strict';

let joinjs = require('../src/joinjs');
let test = require('tape');

const PREAMBLE = "var joins = require('..');";

function _eval(src) {
  let newSrc = joinjs.translate(src);
  return eval(PREAMBLE + '\n' + newSrc);  // eslint-disable-line no-eval
}

test('defs', (t) => {
  let g = joinjs.grammar;
  let src = `
    channel foo;
    def foo(a) {
      return a;
    }
    foo(99);
  `;
  t.ok(g.match(src).succeeded(), 'match succeeds');
  t.equal(_eval(src), 99);

  src = `
    channel foo;
    async channel bar;
    def foo(x) & bar(y) {
      return x + y;
    }
    bar.send(2);
    foo(3);
  `;
  t.ok(g.match(src).succeeded(), 'match succeeds');
  t.equal(_eval(src), 5);

  t.end();
});
