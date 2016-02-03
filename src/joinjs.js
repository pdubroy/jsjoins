'use strict';

/* eslint-env node */

let es5 = require('ohm-js/examples/ecmascript/es5');
let fs = require('fs');
let ohm = require('ohm-js');
let path = require('path');

const GRAMMAR_PATH = path.join(__dirname, 'joinjs.ohm');

let grammar = ohm.grammar(fs.readFileSync(GRAMMAR_PATH), {ES5: es5.grammar});
let semantics = grammar.extendSemantics(es5.semantics);

// Implement `modifiedSource`, which returns the JavaScript source code for
// any new language constructs.
/* eslint-disable camelcase */
semantics.extendAttribute('modifiedSource', {
  Declaration_channels(asynckw, channelkw, ids, _) {
    let ctor = asynckw.numChildren > 0 ? 'AsyncChannel()' : 'Channel()';
    let initializers = ids.ast.map(id => id + ' = joins.' + ctor);
    return 'var ' + initializers.join(', ') + ';';
  },
  Declaration_join(_, defs, body) {
    let chans = defs.ast;
    let src = 'joins.when(' + chans[0].id + ')';
    let paramList = chans[0].params;
    chans.slice(1).forEach(c => {
      c.params.forEach(p => {
        if (paramList.indexOf(p) >= 0) {
          throw new Error("Duplicate parameter '" + p + "' in join pattern");
        }
      });
      paramList.push.apply(paramList, c.params);
      src += '.and(' + c.id + ')';
    });
    src += '.do(function(' + paramList.join(', ') + ') ' + body.asES5 + ');';
    return src;
  }
});

// A helper attribute used by our implementation of `modifiedSource`.
semantics.addAttribute('ast', {
  ChannelDefinition(id, open, params, close) {
    return {id: id.ast, params: params.ast};
  },
  FormalParameterList_many: (first, rest) => [first.ast].concat(rest.ast),
  FormalParameterList_zero: () => [],
  CommaFormalParameter: (_, param) => param.ast,
  identifier(_) {
    return this.interval.contents;
  },
  NonemptyListOf: (first, _, rest) => [first.ast].concat(rest.ast),
  EmptyListOf: () => []
});
/* eslint-enable camelcase */

// Parse the JoinJS code given by `src`, and return the ES5 object code.
function translate(src) {
  let r = grammar.match(src);
  if (r.failed()) {
    throw new Error(r.message);
  }
  return semantics(r).asES5;
}

module.exports = {translate, grammar, semantics};
