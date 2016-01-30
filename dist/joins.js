!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.joins=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":5}],2:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],5:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiJdfQ==
},{"./support/isBuffer":4,"_process":3,"inherits":2}],6:[function(require,module,exports){
module.exports=require(2)
},{"/Users/dubroy/dev/cdg/joins/node_modules/browserify/node_modules/inherits/inherits_browser.js":2}],7:[function(require,module,exports){
"use strict";

var buffers = require("./impl/buffers");
var channels = require("./impl/channels");
var select = require("./impl/select");
var process = require("./impl/process");
var timers = require("./impl/timers");

function spawn(gen, creator) {
  var ch = channels.chan(buffers.fixed(1));
  (new process.Process(gen, function(value) {
    if (value === channels.CLOSED) {
      ch.close();
    } else {
      process.put_then_callback(ch, value, function(ok) {
        ch.close();
      });
    }
  }, creator)).run();
  return ch;
};

function go(f, args) {
  args = args || [];

  var gen = f.apply(null, args);
  return spawn(gen, f);
};

function chan(bufferOrNumber, xform, exHandler) {
  var buf;
  if (bufferOrNumber === 0) {
    bufferOrNumber = null;
  }
  if (typeof bufferOrNumber === "number") {
    buf = buffers.fixed(bufferOrNumber);
  } else {
    buf = bufferOrNumber;
  }
  return channels.chan(buf, xform, exHandler);
};


module.exports = {
  buffers: {
    fixed: buffers.fixed,
    dropping: buffers.dropping,
    sliding: buffers.sliding
  },

  spawn: spawn,
  go: go,
  chan: chan,
  DEFAULT: select.DEFAULT,
  CLOSED: channels.CLOSED,

  put: process.put,
  take: process.take,
  offer: process.offer,
  poll: process.poll,
  sleep: process.sleep,
  alts: process.alts,
  putAsync: process.put_then_callback,
  takeAsync: process.take_then_callback,
  NO_VALUE: process.NO_VALUE,

  timeout: timers.timeout
};

},{"./impl/buffers":11,"./impl/channels":12,"./impl/process":14,"./impl/select":15,"./impl/timers":16}],8:[function(require,module,exports){
"use strict";

var csp = require("./csp.core");
var operations = require("./csp.operations");
var pipeline = require('./csp.pipeline');

csp.operations = operations;
csp.operations.pipeline = pipeline.pipeline;
csp.operations.pipelineAsync = pipeline.pipelineAsync;

module.exports = csp;

},{"./csp.core":7,"./csp.operations":9,"./csp.pipeline":10}],9:[function(require,module,exports){
"use strict";

var Box = require("./impl/channels").Box;

var csp = require("./csp.core"),
    go = csp.go,
    take = csp.take,
    put = csp.put,
    takeAsync = csp.takeAsync,
    putAsync = csp.putAsync,
    alts = csp.alts,
    chan = csp.chan,
    CLOSED = csp.CLOSED;


function mapFrom(f, ch) {
  return {
    is_closed: function() {
      return ch.is_closed();
    },
    close: function() {
      ch.close();
    },
    _put: function(value, handler) {
      return ch._put(value, handler);
    },
    _take: function(handler) {
      var result = ch._take({
        is_active: function() {
          return handler.is_active();
        },
        commit: function() {
          var take_cb = handler.commit();
          return function(value) {
            return take_cb(value === CLOSED ? CLOSED : f(value));
          };
        }
      });
      if (result) {
        var value = result.value;
        return new Box(value === CLOSED ? CLOSED : f(value));
      } else {
        return null;
      }
    }
  };
}

function mapInto(f, ch) {
  return {
    is_closed: function() {
      return ch.is_closed();
    },
    close: function() {
      ch.close();
    },
    _put: function(value, handler) {
      return ch._put(f(value), handler);
    },
    _take: function(handler) {
      return ch._take(handler);
    }
  };
}

function filterFrom(p, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(function*() {
    while (true) {
      var value = yield take(ch);
      if (value === CLOSED) {
        out.close();
        break;
      }
      if (p(value)) {
        yield put(out, value);
      }
    }
  });
  return out;
}

function filterInto(p, ch) {
  return {
    is_closed: function() {
      return ch.is_closed();
    },
    close: function() {
      ch.close();
    },
    _put: function(value, handler) {
      if (p(value)) {
        return ch._put(value, handler);
      } else {
        return new Box(!ch.is_closed());
      }
    },
    _take: function(handler) {
      return ch._take(handler);
    }
  };
}

function removeFrom(p, ch) {
  return filterFrom(function(value) {
    return !p(value);
  }, ch);
}

function removeInto(p, ch) {
  return filterInto(function(value) {
    return !p(value);
  }, ch);
}

function* mapcat(f, src, dst) {
  while (true) {
    var value = yield take(src);
    if (value === CLOSED) {
      dst.close();
      break;
    } else {
      var seq = f(value);
      var length = seq.length;
      for (var i = 0; i < length; i++) {
        yield put(dst, seq[i]);
      }
      if (dst.is_closed()) {
        break;
      }
    }
  }
}

function mapcatFrom(f, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(mapcat, [f, ch, out]);
  return out;
}

function mapcatInto(f, ch, bufferOrN) {
  var src = chan(bufferOrN);
  go(mapcat, [f, src, ch]);
  return src;
}

function pipe(src, dst, keepOpen) {
  go(function*() {
    while (true) {
      var value = yield take(src);
      if (value === CLOSED) {
        if (!keepOpen) {
          dst.close();
        }
        break;
      }
      if (!(yield put(dst, value))) {
        break;
      }
    }
  });
  return dst;
}

function split(p, ch, trueBufferOrN, falseBufferOrN) {
  var tch = chan(trueBufferOrN);
  var fch = chan(falseBufferOrN);
  go(function*() {
    while (true) {
      var value = yield take(ch);
      if (value === CLOSED) {
        tch.close();
        fch.close();
        break;
      }
      yield put(p(value) ? tch : fch, value);
    }
  });
  return [tch, fch];
}

function reduce(f, init, ch) {
  return go(function*() {
    var result = init;
    while (true) {
      var value = yield take(ch);
      if (value === CLOSED) {
        return result;
      } else {
        result = f(result, value);
      }
    }
  }, [], true);
}

function onto(ch, coll, keepOpen) {
  return go(function*() {
    var length = coll.length;
    // FIX: Should be a generic looping interface (for...in?)
    for (var i = 0; i < length; i++) {
      yield put(ch, coll[i]);
    }
    if (!keepOpen) {
      ch.close();
    }
  });
}

// TODO: Bounded?
function fromColl(coll) {
  var ch = chan(coll.length);
  onto(ch, coll);
  return ch;
}

function map(f, chs, bufferOrN) {
  var out = chan(bufferOrN);
  var length = chs.length;
  // Array holding 1 round of values
  var values = new Array(length);
  // TODO: Not sure why we need a size-1 buffer here
  var dchan = chan(1);
  // How many more items this round
  var dcount;
  // put callbacks for each channel
  var dcallbacks = new Array(length);
  for (var i = 0; i < length; i ++) {
    dcallbacks[i] = (function(i) {
      return function(value) {
        values[i] = value;
        dcount --;
        if (dcount === 0) {
          putAsync(dchan, values.slice(0));
        }
      };
    }(i));
  }
  go(function*() {
    while (true) {
      dcount = length;
      // We could just launch n goroutines here, but for effciency we
      // don't
      for (var i = 0; i < length; i ++) {
        try {
          takeAsync(chs[i], dcallbacks[i]);
        } catch (e) {
          // FIX: Hmm why catching here?
          dcount --;
        }
      }
      var values = yield take(dchan);
      for (i = 0; i < length; i ++) {
        if (values[i] === CLOSED) {
          out.close();
          return;
        }
      }
      yield put(out, f.apply(null, values));
    }
  });
  return out;
}

function merge(chs, bufferOrN) {
  var out = chan(bufferOrN);
  var actives = chs.slice(0);
  go(function*() {
    while (true) {
      if (actives.length === 0) {
        break;
      }
      var r = yield alts(actives);
      var value = r.value;
      if (value === CLOSED) {
        // Remove closed channel
        var i = actives.indexOf(r.channel);
        actives.splice(i, 1);
        continue;
      }
      yield put(out, value);
    }
    out.close();
  });
  return out;
}

function into(coll, ch) {
  var result = coll.slice(0);
  return reduce(function(result, item) {
    result.push(item);
    return result;
  }, result, ch);
}

function takeN(n, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(function*() {
    for (var i = 0; i < n; i ++) {
      var value = yield take(ch);
      if (value === CLOSED) {
        break;
      }
      yield put(out, value);
    }
    out.close();
  });
  return out;
}

var NOTHING = {};

function unique(ch, bufferOrN) {
  var out = chan(bufferOrN);
  var last = NOTHING;
  go(function*() {
    while (true) {
      var value = yield take(ch);
      if (value === CLOSED) {
        break;
      }
      if (value === last) {
        continue;
      }
      last = value;
      yield put(out, value);
    }
    out.close();
  });
  return out;
}

function partitionBy(f, ch, bufferOrN) {
  var out = chan(bufferOrN);
  var part = [];
  var last = NOTHING;
  go(function*() {
    while (true) {
      var value = yield take(ch);
      if (value === CLOSED) {
        if (part.length > 0) {
          yield put(out, part);
        }
        out.close();
        break;
      } else {
        var newItem = f(value);
        if (newItem === last || last === NOTHING) {
          part.push(value);
        } else {
          yield put(out, part);
          part = [value];
        }
        last = newItem;
      }
    }
  });
  return out;
}

function partition(n, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(function*() {
    while (true) {
      var part = new Array(n);
      for (var i = 0; i < n; i++) {
        var value = yield take(ch);
        if (value === CLOSED) {
          if (i > 0) {
            yield put(out, part.slice(0, i));
          }
          out.close();
          return;
        }
        part[i] = value;
      }
      yield put(out, part);
    }
  });
  return out;
}

// For channel identification
var genId = (function() {
  var i = 0;
  return function() {
    i ++;
    return "" + i;
  };
})();

var ID_ATTR = "__csp_channel_id";

// TODO: Do we need to check with hasOwnProperty?
function len(obj) {
  var count = 0;
  for (var p in obj) {
    count ++;
  }
  return count;
}

function chanId(ch) {
  var id = ch[ID_ATTR];
  if (id === undefined) {
    id = ch[ID_ATTR] = genId();
  }
  return id;
}

var Mult = function(ch) {
  this.taps = {};
  this.ch = ch;
};

var Tap = function(channel, keepOpen) {
  this.channel = channel;
  this.keepOpen = keepOpen;
};

Mult.prototype.muxch = function() {
  return this.ch;
};

Mult.prototype.tap = function(ch, keepOpen) {
  var id = chanId(ch);
  this.taps[id] = new Tap(ch, keepOpen);
};

Mult.prototype.untap = function(ch) {
  delete this.taps[chanId(ch)];
};

Mult.prototype.untapAll = function() {
  this.taps = {};
};

function mult(ch) {
  var m = new Mult(ch);
  var dchan = chan(1);
  var dcount;
  function makeDoneCallback(tap) {
    return function(stillOpen) {
      dcount --;
      if (dcount === 0) {
        putAsync(dchan, true);
      }
      if (!stillOpen) {
        m.untap(tap.channel);
      }
    };
  }
  go(function*() {
    while (true) {
      var value = yield take(ch);
      var id, t;
      var taps = m.taps;
      if (value === CLOSED) {
        for (id in taps) {
          t = taps[id];
          if (!t.keepOpen) {
            t.channel.close();
          }
        }
        // TODO: Is this necessary?
        m.untapAll();
        break;
      }
      dcount = len(taps);
      // XXX: This is because putAsync can actually call back
      // immediately. Fix that
      var initDcount = dcount;
      // Put value on tapping channels...
      for (id in taps) {
        t = taps[id];
        putAsync(t.channel, value, makeDoneCallback(t));
      }
      // ... waiting for all puts to complete
      if (initDcount > 0) {
        yield take(dchan);
      }
    }
  });
  return m;
}

mult.tap = function tap(m, ch, keepOpen) {
  m.tap(ch, keepOpen);
  return ch;
};

mult.untap = function untap(m, ch) {
  m.untap(ch);
};

mult.untapAll = function untapAll(m) {
  m.untapAll();
};

var Mix = function(ch) {
  this.ch = ch;
  this.stateMap = {};
  this.change = chan();
  this.soloMode = mix.MUTE;
};

Mix.prototype._changed = function() {
  putAsync(this.change, true);
};

Mix.prototype._getAllState = function() {
  var allState = {};
  var stateMap = this.stateMap;
  var solos = [];
  var mutes = [];
  var pauses = [];
  var reads;
  for (var id in stateMap) {
    var chanData = stateMap[id];
    var state = chanData.state;
    var channel = chanData.channel;
    if (state[mix.SOLO]) {
      solos.push(channel);
    }
    // TODO
    if (state[mix.MUTE]) {
      mutes.push(channel);
    }
    if (state[mix.PAUSE]) {
      pauses.push(channel);
    }
  }
  var i, n;
  if (this.soloMode === mix.PAUSE && solos.length > 0) {
    n = solos.length;
    reads = new Array(n + 1);
    for (i = 0; i < n; i++) {
      reads[i] = solos[i];
    }
    reads[n] = this.change;
  } else {
    reads = [];
    for (id in stateMap) {
      chanData = stateMap[id];
      channel = chanData.channel;
      if (pauses.indexOf(channel) < 0) {
        reads.push(channel);
      }
    }
    reads.push(this.change);
  }

  return {
    solos: solos,
    mutes: mutes,
    reads: reads
  };
};

Mix.prototype.admix = function(ch) {
  this.stateMap[chanId(ch)] = {
    channel: ch,
    state: {}
  };
  this._changed();
};

Mix.prototype.unmix = function(ch) {
  delete this.stateMap[chanId(ch)];
  this._changed();
};

Mix.prototype.unmixAll = function() {
  this.stateMap = {};
  this._changed();
};

Mix.prototype.toggle = function(updateStateList) {
  // [[ch1, {}], [ch2, {solo: true}]];
  var length = updateStateList.length;
  for (var i = 0; i < length; i++) {
    var ch = updateStateList[i][0];
    var id = chanId(ch);
    var updateState = updateStateList[i][1];
    var chanData = this.stateMap[id];
    if (!chanData) {
      chanData = this.stateMap[id] = {
        channel: ch,
        state: {}
      };
    }
    for (var mode in updateState) {
      chanData.state[mode] = updateState[mode];
    }
  }
  this._changed();
};

Mix.prototype.setSoloMode = function(mode) {
  if (VALID_SOLO_MODES.indexOf(mode) < 0) {
    throw new Error("Mode must be one of: ", VALID_SOLO_MODES.join(", "));
  }
  this.soloMode = mode;
  this._changed();
};

function mix(out) {
  var m = new Mix(out);
  go(function*() {
    var state = m._getAllState();
    while (true) {
      var result = yield alts(state.reads);
      var value = result.value;
      var channel = result.channel;
      if (value === CLOSED) {
        delete m.stateMap[chanId(channel)];
        state = m._getAllState();
        continue;
      }
      if (channel === m.change) {
        state = m._getAllState();
        continue;
      }
      var solos = state.solos;
      if (solos.indexOf(channel) > -1 ||
          (solos.length === 0 && !(state.mutes.indexOf(channel) > -1))) {
        var stillOpen = yield put(out, value);
        if (!stillOpen) {
          break;
        }
      }
    }
  });
  return m;
}

mix.MUTE = "mute";
mix.PAUSE = "pause";
mix.SOLO = "solo";
var VALID_SOLO_MODES = [mix.MUTE, mix.PAUSE];

mix.add = function admix(m, ch) {
  m.admix(ch);
};

mix.remove = function unmix(m, ch) {
  m.unmix(ch);
};

mix.removeAll = function unmixAll(m) {
  m.unmixAll();
};

mix.toggle = function toggle(m, updateStateList) {
  m.toggle(updateStateList);
};

mix.setSoloMode = function setSoloMode(m, mode) {
  m.setSoloMode(mode);
};

function constantlyNull() {
  return null;
}

var Pub = function(ch, topicFn, bufferFn) {
  this.ch = ch;
  this.topicFn = topicFn;
  this.bufferFn = bufferFn;
  this.mults = {};
};

Pub.prototype._ensureMult = function(topic) {
  var m = this.mults[topic];
  var bufferFn = this.bufferFn;
  if (!m) {
    m = this.mults[topic] = mult(chan(bufferFn(topic)));
  }
  return m;
};

Pub.prototype.sub = function(topic, ch, keepOpen) {
  var m = this._ensureMult(topic);
  return mult.tap(m, ch, keepOpen);
};

Pub.prototype.unsub = function(topic, ch) {
  var m = this.mults[topic];
  if (m) {
    mult.untap(m, ch);
  }
};

Pub.prototype.unsubAll = function(topic) {
  if (topic === undefined) {
    this.mults = {};
  } else {
    delete this.mults[topic];
  }
};

function pub(ch, topicFn, bufferFn) {
  bufferFn = bufferFn || constantlyNull;
  var p = new Pub(ch, topicFn, bufferFn);
  go(function*() {
    while (true) {
      var value = yield take(ch);
      var mults = p.mults;
      var topic;
      if (value === CLOSED) {
        for (topic in mults) {
          mults[topic].muxch().close();
        }
        break;
      }
      // TODO: Somehow ensure/document that this must return a string
      // (otherwise use proper (hash)maps)
      topic = topicFn(value);
      var m = mults[topic];
      if (m) {
        var stillOpen = yield put(m.muxch(), value);
        if (!stillOpen) {
          delete mults[topic];
        }
      }
    }
  });
  return p;
}

pub.sub = function sub(p, topic, ch, keepOpen) {
  return p.sub(topic, ch, keepOpen);
};

pub.unsub = function unsub(p, topic, ch) {
  p.unsub(topic, ch);
};

pub.unsubAll = function unsubAll(p, topic) {
  p.unsubAll(topic);
};

module.exports = {
  mapFrom: mapFrom,
  mapInto: mapInto,
  filterFrom: filterFrom,
  filterInto: filterInto,
  removeFrom: removeFrom,
  removeInto: removeInto,
  mapcatFrom: mapcatFrom,
  mapcatInto: mapcatInto,

  pipe: pipe,
  split: split,
  reduce: reduce,
  onto: onto,
  fromColl: fromColl,

  map: map,
  merge: merge,
  into: into,
  take: takeN,
  unique: unique,
  partition: partition,
  partitionBy: partitionBy,

  mult: mult,
  mix: mix,
  pub: pub
};


// Possible "fluid" interfaces:

// thread(
//   [fromColl, [1, 2, 3, 4]],
//   [mapFrom, inc],
//   [into, []]
// )

// thread(
//   [fromColl, [1, 2, 3, 4]],
//   [mapFrom, inc, _],
//   [into, [], _]
// )

// wrap()
//   .fromColl([1, 2, 3, 4])
//   .mapFrom(inc)
//   .into([])
//   .unwrap();

},{"./csp.core":7,"./impl/channels":12}],10:[function(require,module,exports){
"use strict";

var csp = require('./csp.core');

function pipelineInternal(n, to, from, close, taskFn) {
  if (n <= 0) {
    throw new Error('n must be positive');
  }

  var jobs = csp.chan(n);
  var results = csp.chan(n);

  for(var _ = 0; _ < n; _++) {
    csp.go(function* (taskFn, jobs, results) {
      while (true) {
        var job = yield csp.take(jobs);

        if (!taskFn(job)) {
          results.close();
          break;
        }
      }
    }, [taskFn, jobs, results]);
  }

  csp.go(function* (jobs, from, results) {
    while (true) {
      var v = yield csp.take(from);
      if (v === csp.CLOSED) {
        jobs.close();
        break;
      } else {
        var p = csp.chan(1);

        yield csp.put(jobs, [v, p]);
        yield csp.put(results, p);
      }
    }
  }, [jobs, from, results]);

  csp.go(function* (results, close, to) {
    while(true) {
      var p = yield csp.take(results);
      if (p === csp.CLOSED) {
        if (close) {
          to.close();
        }
        break;
      } else {
        var res = yield csp.take(p);
        while(true) {
          var v = yield csp.take(res);
          if (v !== csp.CLOSED) {
            yield csp.put(to, v);
          } else {
            break;
          }
        }
      }
    }
  }, [results, close, to]);

  return to;
}

function pipeline(to, xf, from, keepOpen, exHandler) {

  function taskFn(job) {
    if (job === csp.CLOSED) {
      return null;
    } else {
      var v = job[0];
      var p = job[1];
      var res = csp.chan(1, xf, exHandler);

      csp.go(function* (res, v) {
        yield csp.put(res, v);
        res.close();
      }, [res, v]);

      csp.putAsync(p, res);

      return true;
    }
  }

  return pipelineInternal(1, to, from, !keepOpen, taskFn);
}

function pipelineAsync(n, to, af, from, keepOpen) {

  function taskFn(job) {
    if (job === csp.CLOSED) {
      return null;
    } else {
      var v = job[0];
      var p = job[1];
      var res = csp.chan(1);
      af(v, res);
      csp.putAsync(p, res);
      return true;
    }
  }

  return pipelineInternal(n, to, from, !keepOpen, taskFn);
}

module.exports = {
  pipeline: pipeline,
  pipelineAsync: pipelineAsync
};

},{"./csp.core":7}],11:[function(require,module,exports){
"use strict";

// TODO: Consider EmptyError & FullError to avoid redundant bound
// checks, to improve performance (may need benchmarks)

function acopy(src, src_start, dst, dst_start, length) {
  var count = 0;
  while (true) {
    if (count >= length) {
      break;
    }
    dst[dst_start + count] = src[src_start + count];
    count ++;
  }
}

var EMPTY = {
  toString: function() {
    return "[object EMPTY]";
  }
};

var RingBuffer = function(head, tail, length, array) {
  this.length = length;
  this.array = array;
  this.head = head;
  this.tail = tail;
};

// Internal method, callers must do bound check
RingBuffer.prototype._unshift = function(item) {
  var array = this.array;
  var head = this.head;
  array[head] = item;
  this.head = (head + 1) % array.length;
  this.length ++;
};

RingBuffer.prototype._resize = function() {
  var array = this.array;
  var new_length = 2 * array.length;
  var new_array = new Array(new_length);
  var head = this.head;
  var tail = this.tail;
  var length = this.length;
  if (tail < head) {
    acopy(array, tail, new_array, 0, length);
    this.tail = 0;
    this.head = length;
    this.array = new_array;
  } else if (tail > head) {
    acopy(array, tail, new_array, 0, array.length - tail);
    acopy(array, 0, new_array, array.length - tail, head);
    this.tail = 0;
    this.head = length;
    this.array = new_array;
  } else if (tail === head) {
    this.tail = 0;
    this.head = 0;
    this.array = new_array;
  }
};

RingBuffer.prototype.unbounded_unshift = function(item) {
  if (this.length + 1 === this.array.length) {
    this._resize();
  }
  this._unshift(item);
};

RingBuffer.prototype.pop = function() {
  if (this.length === 0) {
    return EMPTY;
  }
  var array = this.array;
  var tail = this.tail;
  var item = array[tail];
  array[tail] = null;
  this.tail = (tail + 1) % array.length;
  this.length --;
  return item;
};

RingBuffer.prototype.cleanup = function(predicate) {
  var length = this.length;
  for (var i = 0; i < length; i++) {
    var item = this.pop();
    if (predicate(item)) {
      this._unshift(item);
    }
  }
};

var FixedBuffer = function(buf,  n) {
  this.buf = buf;
  this.n = n;
};

FixedBuffer.prototype.is_full = function() {
  return this.buf.length >= this.n;
};

FixedBuffer.prototype.remove = function() {
  return this.buf.pop();
};

FixedBuffer.prototype.add = function(item) {
  // Note that even though the underlying buffer may grow, "n" is
  // fixed so after overflowing the buffer is still considered full.
  this.buf.unbounded_unshift(item);
};

FixedBuffer.prototype.count = function() {
  return this.buf.length;
};


var DroppingBuffer = function(buf, n) {
  this.buf = buf;
  this.n = n;
};

DroppingBuffer.prototype.is_full = function() {
  return false;
};

DroppingBuffer.prototype.remove = function() {
  return this.buf.pop();
};

DroppingBuffer.prototype.add = function(item) {
  if (this.buf.length < this.n) {
    this.buf._unshift(item);
  }
};

DroppingBuffer.prototype.count = function() {
  return this.buf.length;
};


var SlidingBuffer = function(buf, n) {
  this.buf = buf;
  this.n = n;
};

SlidingBuffer.prototype.is_full = function() {
  return false;
};

SlidingBuffer.prototype.remove = function() {
  return this.buf.pop();
};

SlidingBuffer.prototype.add = function(item) {
  if (this.buf.length === this.n) {
    this.buf.pop();
  }
  this.buf._unshift(item);
};

SlidingBuffer.prototype.count = function() {
  return this.buf.length;
};


var ring = exports.ring = function ring_buffer(n) {
  return new RingBuffer(0, 0, 0, new Array(n));
};

/**
 * Returns a buffer that is considered "full" when it reaches size n,
 * but still accepts additional items, effectively allow overflowing.
 * The overflowing behavior is useful for supporting "expanding"
 * transducers, where we want to check if a buffer is full before
 * running the transduced step function, while still allowing a
 * transduced step to expand into multiple "essence" steps.
 */
exports.fixed = function fixed_buffer(n) {
  return new FixedBuffer(ring(n), n);
};

exports.dropping = function dropping_buffer(n) {
  return new DroppingBuffer(ring(n), n);
};

exports.sliding = function sliding_buffer(n) {
  return new SlidingBuffer(ring(n), n);
};

exports.EMPTY = EMPTY;

},{}],12:[function(require,module,exports){
"use strict";

var buffers = require("./buffers");
var dispatch = require("./dispatch");

var MAX_DIRTY = 64;
var MAX_QUEUE_SIZE = 1024;

var CLOSED = null;

var Box = function(value) {
  this.value = value;
};

var PutBox = function(handler, value) {
  this.handler = handler;
  this.value = value;
};

var Channel = function(takes, puts, buf, xform) {
  this.buf = buf;
  this.xform = xform;
  this.takes = takes;
  this.puts = puts;

  this.dirty_takes = 0;
  this.dirty_puts = 0;
  this.closed = false;
};

function isReduced(v) {
  return v && v["@@transducer/reduced"];
}

function schedule(f, v) {
  dispatch.run(function() {
    f(v);
  });
}

Channel.prototype._put = function(value, handler) {
  if (value === CLOSED) {
    throw new Error("Cannot put CLOSED on a channel.");
  }

  // TODO: I'm not sure how this can happen, because the operations
  // are registered in 1 tick, and the only way for this to be inactive
  // is for a previous operation in the same alt to have returned
  // immediately, which would have short-circuited to prevent this to
  // be ever register anyway. The same thing goes for the active check
  // in "_take".
  if (!handler.is_active()) {
    return null;
  }

  if (this.closed) {
    handler.commit();
    return new Box(false);
  }

  var taker, callback;

  // Soak the value through the buffer first, even if there is a
  // pending taker. This way the step function has a chance to act on the
  // value.
  if (this.buf && !this.buf.is_full()) {
    handler.commit();
    var done = isReduced(this.xform["@@transducer/step"](this.buf, value));
    while (true) {
      if (this.buf.count() === 0) {
        break;
      }
      taker = this.takes.pop();
      if (taker === buffers.EMPTY) {
        break;
      }
      if (taker.is_active()) {
        value = this.buf.remove();
        callback = taker.commit();
        schedule(callback, value);
      }
    }
    if (done) {
      this.close();
    }
    return new Box(true);
  }

  // Either the buffer is full, in which case there won't be any
  // pending takes, or we don't have a buffer, in which case this loop
  // fulfills the first of them that is active (note that we don't
  // have to worry about transducers here since we require a buffer
  // for that).
  while (true) {
    taker = this.takes.pop();
    if (taker === buffers.EMPTY) {
      break;
    }
    if (taker.is_active()) {
      handler.commit();
      callback = taker.commit();
      schedule(callback, value);
      return new Box(true);
    }
  }

  // No buffer, full buffer, no pending takes. Queue this put now if blockable.
  if (this.dirty_puts > MAX_DIRTY) {
    this.puts.cleanup(function(putter) {
      return putter.handler.is_active();
    });
    this.dirty_puts = 0;
  } else {
    this.dirty_puts ++;
  }
  if (handler.is_blockable()) {
    if (this.puts.length >= MAX_QUEUE_SIZE) {
        throw new Error("No more than " + MAX_QUEUE_SIZE + " pending puts are allowed on a single channel.");
    }
    this.puts.unbounded_unshift(new PutBox(handler, value));
  }
  return null;
};

Channel.prototype._take = function(handler) {
  if (!handler.is_active()) {
    return null;
  }

  var putter, put_handler, callback, value;

  if (this.buf && this.buf.count() > 0) {
    handler.commit();
    value = this.buf.remove();
    // We need to check pending puts here, other wise they won't
    // be able to proceed until their number reaches MAX_DIRTY
    while (true) {
      if (this.buf.is_full()) {
        break;
      }
      putter = this.puts.pop();
      if (putter === buffers.EMPTY) {
        break;
      }
      put_handler = putter.handler;
      if (put_handler.is_active()) {
        callback = put_handler.commit();
        if (callback) {
          schedule(callback, true);
        }
        if (isReduced(this.xform["@@transducer/step"](this.buf, putter.value))) {
          this.close();
        }
      }
    }
    return new Box(value);
  }

  // Either the buffer is empty, in which case there won't be any
  // pending puts, or we don't have a buffer, in which case this loop
  // fulfills the first of them that is active (note that we don't
  // have to worry about transducers here since we require a buffer
  // for that).
  while (true) {
    putter = this.puts.pop();
    value = putter.value;
    if (putter === buffers.EMPTY) {
      break;
    }
    put_handler = putter.handler;
    if (put_handler.is_active()) {
      handler.commit();
      callback = put_handler.commit();
      if (callback) {
        schedule(callback, true);
      }
      return new Box(value);
    }
  }

  if (this.closed) {
    handler.commit();
    return new Box(CLOSED);
  }

  // No buffer, empty buffer, no pending puts. Queue this take now if blockable.
  if (this.dirty_takes > MAX_DIRTY) {
    this.takes.cleanup(function(handler) {
      return handler.is_active();
    });
    this.dirty_takes = 0;
  } else {
    this.dirty_takes ++;
  }
  if (handler.is_blockable()) {
    if (this.takes.length >= MAX_QUEUE_SIZE) {
      throw new Error("No more than " + MAX_QUEUE_SIZE + " pending takes are allowed on a single channel.");
    }
    this.takes.unbounded_unshift(handler);
  }
  return null;
};

Channel.prototype.close = function() {
  if (this.closed) {
    return;
  }
  this.closed = true;

  // TODO: Duplicate code. Make a "_flush" function or something
  if (this.buf) {
    this.xform["@@transducer/result"](this.buf);
    while (true) {
      if (this.buf.count() === 0) {
        break;
      }
      taker = this.takes.pop();
      if (taker === buffers.EMPTY) {
        break;
      }
      if (taker.is_active()) {
        callback = taker.commit();
        var value = this.buf.remove();
        schedule(callback, value);
      }
    }
  }

  while (true) {
    var taker = this.takes.pop();
    if (taker === buffers.EMPTY) {
      break;
    }
    if (taker.is_active()) {
      var callback = taker.commit();
      schedule(callback, CLOSED);
    }
  }

  while (true) {
    var putter = this.puts.pop();
    if (putter === buffers.EMPTY) {
      break;
    }
    if (putter.handler.is_active()) {
      var put_callback = putter.handler.commit();
      if (put_callback) {
        schedule(put_callback, false);
      }
    }
  }
};


Channel.prototype.is_closed = function() {
  return this.closed;
};

function defaultHandler(e) {
  console.log('error in channel transformer', e.stack);
  return CLOSED;
}

function handleEx(buf, exHandler, e) {
  var def = (exHandler || defaultHandler)(e);
  if (def !== CLOSED) {
    buf.add(def);
  }
  return buf;
}

// The base transformer object to use with transducers
function AddTransformer() {
}

AddTransformer.prototype["@@transducer/init"] = function() {
  throw new Error('init not available');
};

AddTransformer.prototype["@@transducer/result"] = function(v) {
  return v;
};

AddTransformer.prototype["@@transducer/step"] = function(buffer, input) {
  buffer.add(input);
  return buffer;
};


function handleException(exHandler) {
  return function(xform) {
    return {
      "@@transducer/step": function(buffer, input) {
        try {
          return xform["@@transducer/step"](buffer, input);
        } catch (e) {
          return handleEx(buffer, exHandler, e);
        }
      },
      "@@transducer/result": function(buffer) {
        try {
          return xform["@@transducer/result"](buffer);
        } catch (e) {
          return handleEx(buffer, exHandler, e);
        }
      }
    };
  };
}

// XXX: This is inconsistent. We should either call the reducing
// function xform, or call the transducer xform, not both
exports.chan = function(buf, xform, exHandler) {
  if (xform) {
    if (!buf) {
      throw new Error("Only buffered channels can use transducers");
    }

    xform = xform(new AddTransformer());
  } else {
    xform = new AddTransformer();
  }
  xform = handleException(exHandler)(xform);

  return new Channel(buffers.ring(32), buffers.ring(32), buf, xform);
};

exports.Box = Box;
exports.Channel = Channel;
exports.CLOSED = CLOSED;

},{"./buffers":11,"./dispatch":13}],13:[function(require,module,exports){
"use strict";

// TODO: Use process.nextTick if it's available since it's more
// efficient
// http://howtonode.org/understanding-process-next-tick
// Maybe we don't even need to queue ourselves in that case?

// XXX: But http://blog.nodejs.org/2013/03/11/node-v0-10-0-stable/
// Looks like it will blow up the stack (or is that just about
// pre-empting IO (but that's already bad enough IMO)?)

// Looks like
// http://nodejs.org/api/process.html#process_process_nexttick_callback
// is the equivalent of our TASK_BATCH_SIZE

var buffers = require("./buffers");

var TASK_BATCH_SIZE = 1024;

var tasks = buffers.ring(32);
var running = false;
var queued = false;

var queue_dispatcher;

function process_messages() {
  running = true;
  queued = false;
  var count = 0;
  while (true) {
    var task = tasks.pop();
    if (task === buffers.EMPTY) {
      break;
    }
    // TODO: Don't we need a try/finally here?
    task();
    if (count >= TASK_BATCH_SIZE) {
      break;
    }
    count ++;
  }
  running = false;
  if (tasks.length > 0) {
    queue_dispatcher();
  }
}

if (typeof MessageChannel !== "undefined") {
  var message_channel = new MessageChannel();
  message_channel.port1.onmessage = function(_) {
    process_messages();
  };
  queue_dispatcher = function()  {
    if (!(queued && running)) {
      queued = true;
      message_channel.port2.postMessage(0);
    }
  };
} else if (typeof setImmediate !== "undefined") {
  queue_dispatcher = function() {
    if (!(queued && running)) {
      queued = true;
      setImmediate(process_messages);
    }
  };
} else {
  queue_dispatcher = function() {
    if (!(queued && running)) {
      queued = true;
      setTimeout(process_messages, 0);
    }
  };
}

exports.run = function (f) {
  tasks.unbounded_unshift(f);
  queue_dispatcher();
};

exports.queue_delay = function(f, delay) {
  setTimeout(f, delay);
};

},{"./buffers":11}],14:[function(require,module,exports){
"use strict";

var dispatch = require("./dispatch");
var select = require("./select");
var Channel = require("./channels").Channel;

var NO_VALUE = {};

var FnHandler = function(blockable, f) {
  this.f = f;
  this.blockable = blockable;
};

FnHandler.prototype.is_active = function() {
  return true;
};

FnHandler.prototype.is_blockable = function() {
  return this.blockable;
};

FnHandler.prototype.commit = function() {
  return this.f;
};

function put_then_callback(channel, value, callback) {
  var result = channel._put(value, new FnHandler(true, callback));
  if (result && callback) {
    callback(result.value);
  }
}

function take_then_callback(channel, callback) {
  var result = channel._take(new FnHandler(true, callback));
  if (result) {
    callback(result.value);
  }
}

var Process = function(gen, onFinish, creator) {
  this.gen = gen;
  this.creatorFunc = creator;
  this.finished = false;
  this.onFinish = onFinish;
};

var Instruction = function(op, data) {
  this.op = op;
  this.data = data;
};

var TAKE = "take";
var PUT = "put";
var SLEEP = "sleep";
var ALTS = "alts";

// TODO FIX XXX: This is a (probably) temporary hack to avoid blowing
// up the stack, but it means double queueing when the value is not
// immediately available
Process.prototype._continue = function(response) {
  var self = this;
  dispatch.run(function() {
    self.run(response);
  });
};

Process.prototype._done = function(value) {
  if (!this.finished) {
    this.finished = true;
    var onFinish = this.onFinish;
    if (typeof onFinish === "function") {
      dispatch.run(function() {
        onFinish(value);
      });
    }
  }
};

Process.prototype.run = function(response) {
  if (this.finished) {
    return;
  }

  // TODO: Shouldn't we (optionally) stop error propagation here (and
  // signal the error through a channel or something)? Otherwise the
  // uncaught exception will crash some runtimes (e.g. Node)
  var iter = this.gen.next(response);
  if (iter.done) {
    this._done(iter.value);
    return;
  }

  var ins = iter.value;
  var self = this;

  if (ins instanceof Instruction) {
    switch (ins.op) {
    case PUT:
      var data = ins.data;
      put_then_callback(data.channel, data.value, function(ok) {
        self._continue(ok);
      });
      break;

    case TAKE:
      var channel = ins.data;
      take_then_callback(channel, function(value) {
        self._continue(value);
      });
      break;

    case SLEEP:
      var msecs = ins.data;
      dispatch.queue_delay(function() {
        self.run(null);
      }, msecs);
      break;

    case ALTS:
      select.do_alts(ins.data.operations, function(result) {
        self._continue(result);
      }, ins.data.options);
      break;
    }
  }
  else if(ins instanceof Channel) {
    var channel = ins;
    take_then_callback(channel, function(value) {
      self._continue(value);
    });
  }
  else {
    this._continue(ins);
  }
};

function take(channel) {
  return new Instruction(TAKE, channel);
}

function put(channel, value) {
  return new Instruction(PUT, {
    channel: channel,
    value: value
  });
}

function poll(channel) {
  if (channel.closed) {
    return NO_VALUE;
  }

  var result = channel._take(new FnHandler(false));
  if (result) {
    return result.value;
  } else {
    return NO_VALUE;
  }
}

function offer(channel, value) {
  if (channel.closed) {
    return false;
  }

  var result = channel._put(value, new FnHandler(false));
  if (result) {
    return true;
  } else {
    return false;
  }
}

function sleep(msecs) {
  return new Instruction(SLEEP, msecs);
}

function alts(operations, options) {
  return new Instruction(ALTS, {
    operations: operations,
    options: options
  });
}

exports.put_then_callback = put_then_callback;
exports.take_then_callback = take_then_callback;
exports.put = put;
exports.take = take;
exports.offer = offer;
exports.poll = poll;
exports.sleep = sleep;
exports.alts = alts;
exports.Instruction = Instruction;
exports.Process = Process;
exports.NO_VALUE = NO_VALUE;

},{"./channels":12,"./dispatch":13,"./select":15}],15:[function(require,module,exports){
"use strict";

var Box = require("./channels").Box;

var AltHandler = function(flag, f) {
  this.f = f;
  this.flag = flag;
};

AltHandler.prototype.is_active = function() {
  return this.flag.value;
};

AltHandler.prototype.is_blockable = function() {
  return true;
};

AltHandler.prototype.commit = function() {
  this.flag.value = false;
  return this.f;
};

var AltResult = function(value, channel) {
  this.value = value;
  this.channel = channel;
};

function rand_int(n) {
  return Math.floor(Math.random() * (n + 1));
}

function random_array(n) {
  var a = new Array(n);
  var i;
  for (i = 0; i < n; i++) {
    a[i] = 0;
  }
  for (i = 1; i < n; i++) {
    var j = rand_int(i);
    a[i] = a[j];
    a[j] = i;
  }
  return a;
}

var hasOwnProperty = Object.prototype.hasOwnProperty;

var DEFAULT = {
  toString: function() {
    return "[object DEFAULT]";
  }
};

// TODO: Accept a priority function or something
exports.do_alts = function(operations, callback, options) {
  var length = operations.length;
  // XXX Hmm
  if (length === 0) {
    throw new Error("Empty alt list");
  }

  var priority = (options && options.priority) ? true : false;
  if (!priority) {
    var indexes = random_array(length);
  }

  var flag = new Box(true);

  for (var i = 0; i < length; i++) {
    var operation = operations[priority ? i : indexes[i]];
    var port, result;
    // XXX Hmm
    if (operation instanceof Array) {
      var value = operation[1];
      port = operation[0];
      // We wrap this in a function to capture the value of "port",
      // because js' closure captures vars by "references", not
      // values. "let port" would have worked, but I don't want to
      // raise the runtime requirement yet. TODO: So change this when
      // most runtimes are modern enough.
      result = port._put(value, (function(port) {
        return new AltHandler(flag, function(ok) {
          callback(new AltResult(ok, port));
        });
      })(port));
    } else {
      port = operation;
      result = port._take((function(port) {
        return new AltHandler(flag, function(value) {
          callback(new AltResult(value, port));
        });
      })(port));
    }
    // XXX Hmm
    if (result instanceof Box) {
      callback(new AltResult(result.value, port));
      break;
    }
  }

  if (!(result instanceof Box)
      && options
      && hasOwnProperty.call(options, "default")) {
    if (flag.value) {
      flag.value = false;
      callback(new AltResult(options["default"], DEFAULT));
    }
  }
};

exports.DEFAULT = DEFAULT;

},{"./channels":12}],16:[function(require,module,exports){
"use strict";

var dispatch = require("./dispatch");
var channels = require("./channels");

exports.timeout = function timeout_channel(msecs) {
  var chan = channels.chan();
  dispatch.queue_delay(function() {
    chan.close();
  }, msecs);
  return chan;
};

},{"./channels":12,"./dispatch":13}],17:[function(require,module,exports){
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

},{"assert":1,"inherits":6,"js-csp":8}]},{},[17])(17)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvam9pbnMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Fzc2VydC9hc3NlcnQuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvam9pbnMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvam9pbnMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L2NkZy9qb2lucy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L2NkZy9qb2lucy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvY2RnL2pvaW5zL25vZGVfbW9kdWxlcy9qcy1jc3Avc3JjL2NzcC5jb3JlLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvY2RnL2pvaW5zL25vZGVfbW9kdWxlcy9qcy1jc3Avc3JjL2NzcC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L2NkZy9qb2lucy9ub2RlX21vZHVsZXMvanMtY3NwL3NyYy9jc3Aub3BlcmF0aW9ucy5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L2NkZy9qb2lucy9ub2RlX21vZHVsZXMvanMtY3NwL3NyYy9jc3AucGlwZWxpbmUuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvam9pbnMvbm9kZV9tb2R1bGVzL2pzLWNzcC9zcmMvaW1wbC9idWZmZXJzLmpzIiwiL1VzZXJzL2R1YnJveS9kZXYvY2RnL2pvaW5zL25vZGVfbW9kdWxlcy9qcy1jc3Avc3JjL2ltcGwvY2hhbm5lbHMuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvam9pbnMvbm9kZV9tb2R1bGVzL2pzLWNzcC9zcmMvaW1wbC9kaXNwYXRjaC5qcyIsIi9Vc2Vycy9kdWJyb3kvZGV2L2NkZy9qb2lucy9ub2RlX21vZHVsZXMvanMtY3NwL3NyYy9pbXBsL3Byb2Nlc3MuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvam9pbnMvbm9kZV9tb2R1bGVzL2pzLWNzcC9zcmMvaW1wbC9zZWxlY3QuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvam9pbnMvbm9kZV9tb2R1bGVzL2pzLWNzcC9zcmMvaW1wbC90aW1lcnMuanMiLCIvVXNlcnMvZHVicm95L2Rldi9jZGcvam9pbnMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3a0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdHhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gaHR0cDovL3dpa2kuY29tbW9uanMub3JnL3dpa2kvVW5pdF9UZXN0aW5nLzEuMFxuLy9cbi8vIFRISVMgSVMgTk9UIFRFU1RFRCBOT1IgTElLRUxZIFRPIFdPUksgT1VUU0lERSBWOCFcbi8vXG4vLyBPcmlnaW5hbGx5IGZyb20gbmFyd2hhbC5qcyAoaHR0cDovL25hcndoYWxqcy5vcmcpXG4vLyBDb3B5cmlnaHQgKGMpIDIwMDkgVGhvbWFzIFJvYmluc29uIDwyODBub3J0aC5jb20+XG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgJ1NvZnR3YXJlJyksIHRvXG4vLyBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZVxuLy8gcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yXG4vLyBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuLy8gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuLy8gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEICdBUyBJUycsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTlxuLy8gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTlxuLy8gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHdoZW4gdXNlZCBpbiBub2RlLCB0aGlzIHdpbGwgYWN0dWFsbHkgbG9hZCB0aGUgdXRpbCBtb2R1bGUgd2UgZGVwZW5kIG9uXG4vLyB2ZXJzdXMgbG9hZGluZyB0aGUgYnVpbHRpbiB1dGlsIG1vZHVsZSBhcyBoYXBwZW5zIG90aGVyd2lzZVxuLy8gdGhpcyBpcyBhIGJ1ZyBpbiBub2RlIG1vZHVsZSBsb2FkaW5nIGFzIGZhciBhcyBJIGFtIGNvbmNlcm5lZFxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsLycpO1xuXG52YXIgcFNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vIDEuIFRoZSBhc3NlcnQgbW9kdWxlIHByb3ZpZGVzIGZ1bmN0aW9ucyB0aGF0IHRocm93XG4vLyBBc3NlcnRpb25FcnJvcidzIHdoZW4gcGFydGljdWxhciBjb25kaXRpb25zIGFyZSBub3QgbWV0LiBUaGVcbi8vIGFzc2VydCBtb2R1bGUgbXVzdCBjb25mb3JtIHRvIHRoZSBmb2xsb3dpbmcgaW50ZXJmYWNlLlxuXG52YXIgYXNzZXJ0ID0gbW9kdWxlLmV4cG9ydHMgPSBvaztcblxuLy8gMi4gVGhlIEFzc2VydGlvbkVycm9yIGlzIGRlZmluZWQgaW4gYXNzZXJ0LlxuLy8gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7IG1lc3NhZ2U6IG1lc3NhZ2UsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0dWFsOiBhY3R1YWwsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IGV4cGVjdGVkIH0pXG5cbmFzc2VydC5Bc3NlcnRpb25FcnJvciA9IGZ1bmN0aW9uIEFzc2VydGlvbkVycm9yKG9wdGlvbnMpIHtcbiAgdGhpcy5uYW1lID0gJ0Fzc2VydGlvbkVycm9yJztcbiAgdGhpcy5hY3R1YWwgPSBvcHRpb25zLmFjdHVhbDtcbiAgdGhpcy5leHBlY3RlZCA9IG9wdGlvbnMuZXhwZWN0ZWQ7XG4gIHRoaXMub3BlcmF0b3IgPSBvcHRpb25zLm9wZXJhdG9yO1xuICBpZiAob3B0aW9ucy5tZXNzYWdlKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gb3B0aW9ucy5tZXNzYWdlO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubWVzc2FnZSA9IGdldE1lc3NhZ2UodGhpcyk7XG4gICAgdGhpcy5nZW5lcmF0ZWRNZXNzYWdlID0gdHJ1ZTtcbiAgfVxuICB2YXIgc3RhY2tTdGFydEZ1bmN0aW9uID0gb3B0aW9ucy5zdGFja1N0YXJ0RnVuY3Rpb24gfHwgZmFpbDtcblxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBzdGFja1N0YXJ0RnVuY3Rpb24pO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIG5vbiB2OCBicm93c2VycyBzbyB3ZSBjYW4gaGF2ZSBhIHN0YWNrdHJhY2VcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG4gICAgaWYgKGVyci5zdGFjaykge1xuICAgICAgdmFyIG91dCA9IGVyci5zdGFjaztcblxuICAgICAgLy8gdHJ5IHRvIHN0cmlwIHVzZWxlc3MgZnJhbWVzXG4gICAgICB2YXIgZm5fbmFtZSA9IHN0YWNrU3RhcnRGdW5jdGlvbi5uYW1lO1xuICAgICAgdmFyIGlkeCA9IG91dC5pbmRleE9mKCdcXG4nICsgZm5fbmFtZSk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgLy8gb25jZSB3ZSBoYXZlIGxvY2F0ZWQgdGhlIGZ1bmN0aW9uIGZyYW1lXG4gICAgICAgIC8vIHdlIG5lZWQgdG8gc3RyaXAgb3V0IGV2ZXJ5dGhpbmcgYmVmb3JlIGl0IChhbmQgaXRzIGxpbmUpXG4gICAgICAgIHZhciBuZXh0X2xpbmUgPSBvdXQuaW5kZXhPZignXFxuJywgaWR4ICsgMSk7XG4gICAgICAgIG91dCA9IG91dC5zdWJzdHJpbmcobmV4dF9saW5lICsgMSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc3RhY2sgPSBvdXQ7XG4gICAgfVxuICB9XG59O1xuXG4vLyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgaW5zdGFuY2VvZiBFcnJvclxudXRpbC5pbmhlcml0cyhhc3NlcnQuQXNzZXJ0aW9uRXJyb3IsIEVycm9yKTtcblxuZnVuY3Rpb24gcmVwbGFjZXIoa2V5LCB2YWx1ZSkge1xuICBpZiAodXRpbC5pc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gJycgKyB2YWx1ZTtcbiAgfVxuICBpZiAodXRpbC5pc051bWJlcih2YWx1ZSkgJiYgKGlzTmFOKHZhbHVlKSB8fCAhaXNGaW5pdGUodmFsdWUpKSkge1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICB9XG4gIGlmICh1dGlsLmlzRnVuY3Rpb24odmFsdWUpIHx8IHV0aWwuaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiB0cnVuY2F0ZShzLCBuKSB7XG4gIGlmICh1dGlsLmlzU3RyaW5nKHMpKSB7XG4gICAgcmV0dXJuIHMubGVuZ3RoIDwgbiA/IHMgOiBzLnNsaWNlKDAsIG4pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldE1lc3NhZ2Uoc2VsZikge1xuICByZXR1cm4gdHJ1bmNhdGUoSlNPTi5zdHJpbmdpZnkoc2VsZi5hY3R1YWwsIHJlcGxhY2VyKSwgMTI4KSArICcgJyArXG4gICAgICAgICBzZWxmLm9wZXJhdG9yICsgJyAnICtcbiAgICAgICAgIHRydW5jYXRlKEpTT04uc3RyaW5naWZ5KHNlbGYuZXhwZWN0ZWQsIHJlcGxhY2VyKSwgMTI4KTtcbn1cblxuLy8gQXQgcHJlc2VudCBvbmx5IHRoZSB0aHJlZSBrZXlzIG1lbnRpb25lZCBhYm92ZSBhcmUgdXNlZCBhbmRcbi8vIHVuZGVyc3Rvb2QgYnkgdGhlIHNwZWMuIEltcGxlbWVudGF0aW9ucyBvciBzdWIgbW9kdWxlcyBjYW4gcGFzc1xuLy8gb3RoZXIga2V5cyB0byB0aGUgQXNzZXJ0aW9uRXJyb3IncyBjb25zdHJ1Y3RvciAtIHRoZXkgd2lsbCBiZVxuLy8gaWdub3JlZC5cblxuLy8gMy4gQWxsIG9mIHRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIG11c3QgdGhyb3cgYW4gQXNzZXJ0aW9uRXJyb3Jcbi8vIHdoZW4gYSBjb3JyZXNwb25kaW5nIGNvbmRpdGlvbiBpcyBub3QgbWV0LCB3aXRoIGEgbWVzc2FnZSB0aGF0XG4vLyBtYXkgYmUgdW5kZWZpbmVkIGlmIG5vdCBwcm92aWRlZC4gIEFsbCBhc3NlcnRpb24gbWV0aG9kcyBwcm92aWRlXG4vLyBib3RoIHRoZSBhY3R1YWwgYW5kIGV4cGVjdGVkIHZhbHVlcyB0byB0aGUgYXNzZXJ0aW9uIGVycm9yIGZvclxuLy8gZGlzcGxheSBwdXJwb3Nlcy5cblxuZnVuY3Rpb24gZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBvcGVyYXRvciwgc3RhY2tTdGFydEZ1bmN0aW9uKSB7XG4gIHRocm93IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3Ioe1xuICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgYWN0dWFsOiBhY3R1YWwsXG4gICAgZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuICAgIG9wZXJhdG9yOiBvcGVyYXRvcixcbiAgICBzdGFja1N0YXJ0RnVuY3Rpb246IHN0YWNrU3RhcnRGdW5jdGlvblxuICB9KTtcbn1cblxuLy8gRVhURU5TSU9OISBhbGxvd3MgZm9yIHdlbGwgYmVoYXZlZCBlcnJvcnMgZGVmaW5lZCBlbHNld2hlcmUuXG5hc3NlcnQuZmFpbCA9IGZhaWw7XG5cbi8vIDQuIFB1cmUgYXNzZXJ0aW9uIHRlc3RzIHdoZXRoZXIgYSB2YWx1ZSBpcyB0cnV0aHksIGFzIGRldGVybWluZWRcbi8vIGJ5ICEhZ3VhcmQuXG4vLyBhc3NlcnQub2soZ3VhcmQsIG1lc3NhZ2Vfb3B0KTtcbi8vIFRoaXMgc3RhdGVtZW50IGlzIGVxdWl2YWxlbnQgdG8gYXNzZXJ0LmVxdWFsKHRydWUsICEhZ3VhcmQsXG4vLyBtZXNzYWdlX29wdCk7LiBUbyB0ZXN0IHN0cmljdGx5IGZvciB0aGUgdmFsdWUgdHJ1ZSwgdXNlXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwodHJ1ZSwgZ3VhcmQsIG1lc3NhZ2Vfb3B0KTsuXG5cbmZ1bmN0aW9uIG9rKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICghdmFsdWUpIGZhaWwodmFsdWUsIHRydWUsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5vayk7XG59XG5hc3NlcnQub2sgPSBvaztcblxuLy8gNS4gVGhlIGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzaGFsbG93LCBjb2VyY2l2ZSBlcXVhbGl0eSB3aXRoXG4vLyA9PS5cbi8vIGFzc2VydC5lcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5lcXVhbCA9IGZ1bmN0aW9uIGVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPSBleHBlY3RlZCkgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQuZXF1YWwpO1xufTtcblxuLy8gNi4gVGhlIG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHdoZXRoZXIgdHdvIG9iamVjdHMgYXJlIG5vdCBlcXVhbFxuLy8gd2l0aCAhPSBhc3NlcnQubm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RXF1YWwgPSBmdW5jdGlvbiBub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPScsIGFzc2VydC5ub3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDcuIFRoZSBlcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgYSBkZWVwIGVxdWFsaXR5IHJlbGF0aW9uLlxuLy8gYXNzZXJ0LmRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5kZWVwRXF1YWwgPSBmdW5jdGlvbiBkZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoIV9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdkZWVwRXF1YWwnLCBhc3NlcnQuZGVlcEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSB7XG4gIC8vIDcuMS4gQWxsIGlkZW50aWNhbCB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGFzIGRldGVybWluZWQgYnkgPT09LlxuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAodXRpbC5pc0J1ZmZlcihhY3R1YWwpICYmIHV0aWwuaXNCdWZmZXIoZXhwZWN0ZWQpKSB7XG4gICAgaWYgKGFjdHVhbC5sZW5ndGggIT0gZXhwZWN0ZWQubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFjdHVhbC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFjdHVhbFtpXSAhPT0gZXhwZWN0ZWRbaV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcblxuICAvLyA3LjIuIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIERhdGUgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIERhdGUgb2JqZWN0IHRoYXQgcmVmZXJzIHRvIHRoZSBzYW1lIHRpbWUuXG4gIH0gZWxzZSBpZiAodXRpbC5pc0RhdGUoYWN0dWFsKSAmJiB1dGlsLmlzRGF0ZShleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLmdldFRpbWUoKSA9PT0gZXhwZWN0ZWQuZ2V0VGltZSgpO1xuXG4gIC8vIDcuMyBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBSZWdFeHAgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIFJlZ0V4cCBvYmplY3Qgd2l0aCB0aGUgc2FtZSBzb3VyY2UgYW5kXG4gIC8vIHByb3BlcnRpZXMgKGBnbG9iYWxgLCBgbXVsdGlsaW5lYCwgYGxhc3RJbmRleGAsIGBpZ25vcmVDYXNlYCkuXG4gIH0gZWxzZSBpZiAodXRpbC5pc1JlZ0V4cChhY3R1YWwpICYmIHV0aWwuaXNSZWdFeHAoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5zb3VyY2UgPT09IGV4cGVjdGVkLnNvdXJjZSAmJlxuICAgICAgICAgICBhY3R1YWwuZ2xvYmFsID09PSBleHBlY3RlZC5nbG9iYWwgJiZcbiAgICAgICAgICAgYWN0dWFsLm11bHRpbGluZSA9PT0gZXhwZWN0ZWQubXVsdGlsaW5lICYmXG4gICAgICAgICAgIGFjdHVhbC5sYXN0SW5kZXggPT09IGV4cGVjdGVkLmxhc3RJbmRleCAmJlxuICAgICAgICAgICBhY3R1YWwuaWdub3JlQ2FzZSA9PT0gZXhwZWN0ZWQuaWdub3JlQ2FzZTtcblxuICAvLyA3LjQuIE90aGVyIHBhaXJzIHRoYXQgZG8gbm90IGJvdGggcGFzcyB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcsXG4gIC8vIGVxdWl2YWxlbmNlIGlzIGRldGVybWluZWQgYnkgPT0uXG4gIH0gZWxzZSBpZiAoIXV0aWwuaXNPYmplY3QoYWN0dWFsKSAmJiAhdXRpbC5pc09iamVjdChleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsID09IGV4cGVjdGVkO1xuXG4gIC8vIDcuNSBGb3IgYWxsIG90aGVyIE9iamVjdCBwYWlycywgaW5jbHVkaW5nIEFycmF5IG9iamVjdHMsIGVxdWl2YWxlbmNlIGlzXG4gIC8vIGRldGVybWluZWQgYnkgaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChhcyB2ZXJpZmllZFxuICAvLyB3aXRoIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCksIHRoZSBzYW1lIHNldCBvZiBrZXlzXG4gIC8vIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLCBlcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnlcbiAgLy8gY29ycmVzcG9uZGluZyBrZXksIGFuZCBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuIE5vdGU6IHRoaXNcbiAgLy8gYWNjb3VudHMgZm9yIGJvdGggbmFtZWQgYW5kIGluZGV4ZWQgcHJvcGVydGllcyBvbiBBcnJheXMuXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9iakVxdWl2KGFjdHVhbCwgZXhwZWN0ZWQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzQXJndW1lbnRzKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG59XG5cbmZ1bmN0aW9uIG9iakVxdWl2KGEsIGIpIHtcbiAgaWYgKHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoYSkgfHwgdXRpbC5pc051bGxPclVuZGVmaW5lZChiKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS5cbiAgaWYgKGEucHJvdG90eXBlICE9PSBiLnByb3RvdHlwZSkgcmV0dXJuIGZhbHNlO1xuICAvL35+fkkndmUgbWFuYWdlZCB0byBicmVhayBPYmplY3Qua2V5cyB0aHJvdWdoIHNjcmV3eSBhcmd1bWVudHMgcGFzc2luZy5cbiAgLy8gICBDb252ZXJ0aW5nIHRvIGFycmF5IHNvbHZlcyB0aGUgcHJvYmxlbS5cbiAgaWYgKGlzQXJndW1lbnRzKGEpKSB7XG4gICAgaWYgKCFpc0FyZ3VtZW50cyhiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBhID0gcFNsaWNlLmNhbGwoYSk7XG4gICAgYiA9IHBTbGljZS5jYWxsKGIpO1xuICAgIHJldHVybiBfZGVlcEVxdWFsKGEsIGIpO1xuICB9XG4gIHRyeSB7XG4gICAgdmFyIGthID0gb2JqZWN0S2V5cyhhKSxcbiAgICAgICAga2IgPSBvYmplY3RLZXlzKGIpLFxuICAgICAgICBrZXksIGk7XG4gIH0gY2F0Y2ggKGUpIHsvL2hhcHBlbnMgd2hlbiBvbmUgaXMgYSBzdHJpbmcgbGl0ZXJhbCBhbmQgdGhlIG90aGVyIGlzbid0XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoa2V5cyBpbmNvcnBvcmF0ZXNcbiAgLy8gaGFzT3duUHJvcGVydHkpXG4gIGlmIChrYS5sZW5ndGggIT0ga2IubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy90aGUgc2FtZSBzZXQgb2Yga2V5cyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSxcbiAga2Euc29ydCgpO1xuICBrYi5zb3J0KCk7XG4gIC8vfn5+Y2hlYXAga2V5IHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoa2FbaV0gIT0ga2JbaV0pXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy9lcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnkgY29ycmVzcG9uZGluZyBrZXksIGFuZFxuICAvL35+fnBvc3NpYmx5IGV4cGVuc2l2ZSBkZWVwIHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBrZXkgPSBrYVtpXTtcbiAgICBpZiAoIV9kZWVwRXF1YWwoYVtrZXldLCBiW2tleV0pKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIDguIFRoZSBub24tZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGZvciBhbnkgZGVlcCBpbmVxdWFsaXR5LlxuLy8gYXNzZXJ0Lm5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3REZWVwRXF1YWwgPSBmdW5jdGlvbiBub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ25vdERlZXBFcXVhbCcsIGFzc2VydC5ub3REZWVwRXF1YWwpO1xuICB9XG59O1xuXG4vLyA5LiBUaGUgc3RyaWN0IGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzdHJpY3QgZXF1YWxpdHksIGFzIGRldGVybWluZWQgYnkgPT09LlxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnN0cmljdEVxdWFsID0gZnVuY3Rpb24gc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09PScsIGFzc2VydC5zdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDEwLiBUaGUgc3RyaWN0IG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHN0cmljdCBpbmVxdWFsaXR5LCBhc1xuLy8gZGV0ZXJtaW5lZCBieSAhPT0uICBhc3NlcnQubm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90U3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT09JywgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkge1xuICBpZiAoIWFjdHVhbCB8fCAhZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGV4cGVjdGVkKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgIHJldHVybiBleHBlY3RlZC50ZXN0KGFjdHVhbCk7XG4gIH0gZWxzZSBpZiAoYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChleHBlY3RlZC5jYWxsKHt9LCBhY3R1YWwpID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIF90aHJvd3Moc2hvdWxkVGhyb3csIGJsb2NrLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICB2YXIgYWN0dWFsO1xuXG4gIGlmICh1dGlsLmlzU3RyaW5nKGV4cGVjdGVkKSkge1xuICAgIG1lc3NhZ2UgPSBleHBlY3RlZDtcbiAgICBleHBlY3RlZCA9IG51bGw7XG4gIH1cblxuICB0cnkge1xuICAgIGJsb2NrKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBhY3R1YWwgPSBlO1xuICB9XG5cbiAgbWVzc2FnZSA9IChleHBlY3RlZCAmJiBleHBlY3RlZC5uYW1lID8gJyAoJyArIGV4cGVjdGVkLm5hbWUgKyAnKS4nIDogJy4nKSArXG4gICAgICAgICAgICAobWVzc2FnZSA/ICcgJyArIG1lc3NhZ2UgOiAnLicpO1xuXG4gIGlmIChzaG91bGRUaHJvdyAmJiAhYWN0dWFsKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnTWlzc2luZyBleHBlY3RlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICBpZiAoIXNob3VsZFRocm93ICYmIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnR290IHVud2FudGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIGlmICgoc2hvdWxkVGhyb3cgJiYgYWN0dWFsICYmIGV4cGVjdGVkICYmXG4gICAgICAhZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHx8ICghc2hvdWxkVGhyb3cgJiYgYWN0dWFsKSkge1xuICAgIHRocm93IGFjdHVhbDtcbiAgfVxufVxuXG4vLyAxMS4gRXhwZWN0ZWQgdG8gdGhyb3cgYW4gZXJyb3I6XG4vLyBhc3NlcnQudGhyb3dzKGJsb2NrLCBFcnJvcl9vcHQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnRocm93cyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9lcnJvciwgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzLmFwcGx5KHRoaXMsIFt0cnVlXS5jb25jYXQocFNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xufTtcblxuLy8gRVhURU5TSU9OISBUaGlzIGlzIGFubm95aW5nIHRvIHdyaXRlIG91dHNpZGUgdGhpcyBtb2R1bGUuXG5hc3NlcnQuZG9lc05vdFRocm93ID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cy5hcHBseSh0aGlzLCBbZmFsc2VdLmNvbmNhdChwU2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG59O1xuXG5hc3NlcnQuaWZFcnJvciA9IGZ1bmN0aW9uKGVycikgeyBpZiAoZXJyKSB7dGhyb3cgZXJyO319O1xuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIGtleXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChoYXNPd24uY2FsbChvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiBrZXlzO1xufTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldDp1dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5YVdaNUwyNXZaR1ZmYlc5a2RXeGxjeTkxZEdsc0wzVjBhV3d1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWp0QlFVRkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFaUxDSm1hV3hsSWpvaVoyVnVaWEpoZEdWa0xtcHpJaXdpYzI5MWNtTmxVbTl2ZENJNklpSXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJaTh2SUVOdmNIbHlhV2RvZENCS2IzbGxiblFzSUVsdVl5NGdZVzVrSUc5MGFHVnlJRTV2WkdVZ1kyOXVkSEpwWW5WMGIzSnpMbHh1THk5Y2JpOHZJRkJsY20xcGMzTnBiMjRnYVhNZ2FHVnlaV0o1SUdkeVlXNTBaV1FzSUdaeVpXVWdiMllnWTJoaGNtZGxMQ0IwYnlCaGJua2djR1Z5YzI5dUlHOWlkR0ZwYm1sdVp5QmhYRzR2THlCamIzQjVJRzltSUhSb2FYTWdjMjltZEhkaGNtVWdZVzVrSUdGemMyOWphV0YwWldRZ1pHOWpkVzFsYm5SaGRHbHZiaUJtYVd4bGN5QW9kR2hsWEc0dkx5QmNJbE52Wm5SM1lYSmxYQ0lwTENCMGJ5QmtaV0ZzSUdsdUlIUm9aU0JUYjJaMGQyRnlaU0IzYVhSb2IzVjBJSEpsYzNSeWFXTjBhVzl1TENCcGJtTnNkV1JwYm1kY2JpOHZJSGRwZEdodmRYUWdiR2x0YVhSaGRHbHZiaUIwYUdVZ2NtbG5hSFJ6SUhSdklIVnpaU3dnWTI5d2VTd2diVzlrYVdaNUxDQnRaWEpuWlN3Z2NIVmliR2x6YUN4Y2JpOHZJR1JwYzNSeWFXSjFkR1VzSUhOMVlteHBZMlZ1YzJVc0lHRnVaQzl2Y2lCelpXeHNJR052Y0dsbGN5QnZaaUIwYUdVZ1UyOW1kSGRoY21Vc0lHRnVaQ0IwYnlCd1pYSnRhWFJjYmk4dklIQmxjbk52Ym5NZ2RHOGdkMmh2YlNCMGFHVWdVMjltZEhkaGNtVWdhWE1nWm5WeWJtbHphR1ZrSUhSdklHUnZJSE52TENCemRXSnFaV04wSUhSdklIUm9aVnh1THk4Z1ptOXNiRzkzYVc1bklHTnZibVJwZEdsdmJuTTZYRzR2TDF4dUx5OGdWR2hsSUdGaWIzWmxJR052Y0hseWFXZG9kQ0J1YjNScFkyVWdZVzVrSUhSb2FYTWdjR1Z5YldsemMybHZiaUJ1YjNScFkyVWdjMmhoYkd3Z1ltVWdhVzVqYkhWa1pXUmNiaTh2SUdsdUlHRnNiQ0JqYjNCcFpYTWdiM0lnYzNWaWMzUmhiblJwWVd3Z2NHOXlkR2x2Ym5NZ2IyWWdkR2hsSUZOdlpuUjNZWEpsTGx4dUx5OWNiaTh2SUZSSVJTQlRUMFpVVjBGU1JTQkpVeUJRVWs5V1NVUkZSQ0JjSWtGVElFbFRYQ0lzSUZkSlZFaFBWVlFnVjBGU1VrRk9WRmtnVDBZZ1FVNVpJRXRKVGtRc0lFVllVRkpGVTFOY2JpOHZJRTlTSUVsTlVFeEpSVVFzSUVsT1EweFZSRWxPUnlCQ1ZWUWdUazlVSUV4SlRVbFVSVVFnVkU4Z1ZFaEZJRmRCVWxKQlRsUkpSVk1nVDBaY2JpOHZJRTFGVWtOSVFVNVVRVUpKVEVsVVdTd2dSa2xVVGtWVFV5QkdUMUlnUVNCUVFWSlVTVU5WVEVGU0lGQlZVbEJQVTBVZ1FVNUVJRTVQVGtsT1JsSkpUa2RGVFVWT1ZDNGdTVTVjYmk4dklFNVBJRVZXUlU1VUlGTklRVXhNSUZSSVJTQkJWVlJJVDFKVElFOVNJRU5QVUZsU1NVZElWQ0JJVDB4RVJWSlRJRUpGSUV4SlFVSk1SU0JHVDFJZ1FVNVpJRU5NUVVsTkxGeHVMeThnUkVGTlFVZEZVeUJQVWlCUFZFaEZVaUJNU1VGQ1NVeEpWRmtzSUZkSVJWUklSVklnU1U0Z1FVNGdRVU5VU1U5T0lFOUdJRU5QVGxSU1FVTlVMQ0JVVDFKVUlFOVNYRzR2THlCUFZFaEZVbGRKVTBVc0lFRlNTVk5KVGtjZ1JsSlBUU3dnVDFWVUlFOUdJRTlTSUVsT0lFTlBUazVGUTFSSlQwNGdWMGxVU0NCVVNFVWdVMDlHVkZkQlVrVWdUMUlnVkVoRlhHNHZMeUJWVTBVZ1QxSWdUMVJJUlZJZ1JFVkJURWxPUjFNZ1NVNGdWRWhGSUZOUFJsUlhRVkpGTGx4dVhHNTJZWElnWm05eWJXRjBVbVZuUlhod0lEMGdMeVZiYzJScUpWMHZaenRjYm1WNGNHOXlkSE11Wm05eWJXRjBJRDBnWm5WdVkzUnBiMjRvWmlrZ2UxeHVJQ0JwWmlBb0lXbHpVM1J5YVc1bktHWXBLU0I3WEc0Z0lDQWdkbUZ5SUc5aWFtVmpkSE1nUFNCYlhUdGNiaUFnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElHRnlaM1Z0Wlc1MGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnYjJKcVpXTjBjeTV3ZFhOb0tHbHVjM0JsWTNRb1lYSm5kVzFsYm5SelcybGRLU2s3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCdlltcGxZM1J6TG1wdmFXNG9KeUFuS1R0Y2JpQWdmVnh1WEc0Z0lIWmhjaUJwSUQwZ01UdGNiaUFnZG1GeUlHRnlaM01nUFNCaGNtZDFiV1Z1ZEhNN1hHNGdJSFpoY2lCc1pXNGdQU0JoY21kekxteGxibWQwYUR0Y2JpQWdkbUZ5SUhOMGNpQTlJRk4wY21sdVp5aG1LUzV5WlhCc1lXTmxLR1p2Y20xaGRGSmxaMFY0Y0N3Z1puVnVZM1JwYjI0b2VDa2dlMXh1SUNBZ0lHbG1JQ2g0SUQwOVBTQW5KU1VuS1NCeVpYUjFjbTRnSnlVbk8xeHVJQ0FnSUdsbUlDaHBJRDQ5SUd4bGJpa2djbVYwZFhKdUlIZzdYRzRnSUNBZ2MzZHBkR05vSUNoNEtTQjdYRzRnSUNBZ0lDQmpZWE5sSUNjbGN5YzZJSEpsZEhWeWJpQlRkSEpwYm1jb1lYSm5jMXRwS3l0ZEtUdGNiaUFnSUNBZ0lHTmhjMlVnSnlWa0p6b2djbVYwZFhKdUlFNTFiV0psY2loaGNtZHpXMmtySzEwcE8xeHVJQ0FnSUNBZ1kyRnpaU0FuSldvbk9seHVJQ0FnSUNBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCS1UwOU9Mbk4wY21sdVoybG1lU2hoY21kelcya3JLMTBwTzF4dUlDQWdJQ0FnSUNCOUlHTmhkR05vSUNoZktTQjdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2RiUTJseVkzVnNZWEpkSnp0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ1pHVm1ZWFZzZERwY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhnN1hHNGdJQ0FnZlZ4dUlDQjlLVHRjYmlBZ1ptOXlJQ2gyWVhJZ2VDQTlJR0Z5WjNOYmFWMDdJR2tnUENCc1pXNDdJSGdnUFNCaGNtZHpXeXNyYVYwcElIdGNiaUFnSUNCcFppQW9hWE5PZFd4c0tIZ3BJSHg4SUNGcGMwOWlhbVZqZENoNEtTa2dlMXh1SUNBZ0lDQWdjM1J5SUNzOUlDY2dKeUFySUhnN1hHNGdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJSE4wY2lBclBTQW5JQ2NnS3lCcGJuTndaV04wS0hncE8xeHVJQ0FnSUgxY2JpQWdmVnh1SUNCeVpYUjFjbTRnYzNSeU8xeHVmVHRjYmx4dVhHNHZMeUJOWVhKcklIUm9ZWFFnWVNCdFpYUm9iMlFnYzJodmRXeGtJRzV2ZENCaVpTQjFjMlZrTGx4dUx5OGdVbVYwZFhKdWN5QmhJRzF2WkdsbWFXVmtJR1oxYm1OMGFXOXVJSGRvYVdOb0lIZGhjbTV6SUc5dVkyVWdZbmtnWkdWbVlYVnNkQzVjYmk4dklFbG1JQzB0Ym04dFpHVndjbVZqWVhScGIyNGdhWE1nYzJWMExDQjBhR1Z1SUdsMElHbHpJR0VnYm04dGIzQXVYRzVsZUhCdmNuUnpMbVJsY0hKbFkyRjBaU0E5SUdaMWJtTjBhVzl1S0dadUxDQnRjMmNwSUh0Y2JpQWdMeThnUVd4c2IzY2dabTl5SUdSbGNISmxZMkYwYVc1bklIUm9hVzVuY3lCcGJpQjBhR1VnY0hKdlkyVnpjeUJ2WmlCemRHRnlkR2x1WnlCMWNDNWNiaUFnYVdZZ0tHbHpWVzVrWldacGJtVmtLR2RzYjJKaGJDNXdjbTlqWlhOektTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCbGVIQnZjblJ6TG1SbGNISmxZMkYwWlNobWJpd2diWE5uS1M1aGNIQnNlU2gwYUdsekxDQmhjbWQxYldWdWRITXBPMXh1SUNBZ0lIMDdYRzRnSUgxY2JseHVJQ0JwWmlBb2NISnZZMlZ6Y3k1dWIwUmxjSEpsWTJGMGFXOXVJRDA5UFNCMGNuVmxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHWnVPMXh1SUNCOVhHNWNiaUFnZG1GeUlIZGhjbTVsWkNBOUlHWmhiSE5sTzF4dUlDQm1kVzVqZEdsdmJpQmtaWEJ5WldOaGRHVmtLQ2tnZTF4dUlDQWdJR2xtSUNnaGQyRnlibVZrS1NCN1hHNGdJQ0FnSUNCcFppQW9jSEp2WTJWemN5NTBhSEp2ZDBSbGNISmxZMkYwYVc5dUtTQjdYRzRnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpaHRjMmNwTzF4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNod2NtOWpaWE56TG5SeVlXTmxSR1Z3Y21WallYUnBiMjRwSUh0Y2JpQWdJQ0FnSUNBZ1kyOXVjMjlzWlM1MGNtRmpaU2h0YzJjcE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ1kyOXVjMjlzWlM1bGNuSnZjaWh0YzJjcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2QyRnlibVZrSUQwZ2RISjFaVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUdadUxtRndjR3g1S0hSb2FYTXNJR0Z5WjNWdFpXNTBjeWs3WEc0Z0lIMWNibHh1SUNCeVpYUjFjbTRnWkdWd2NtVmpZWFJsWkR0Y2JuMDdYRzVjYmx4dWRtRnlJR1JsWW5WbmN5QTlJSHQ5TzF4dWRtRnlJR1JsWW5WblJXNTJhWEp2Ymp0Y2JtVjRjRzl5ZEhNdVpHVmlkV2RzYjJjZ1BTQm1kVzVqZEdsdmJpaHpaWFFwSUh0Y2JpQWdhV1lnS0dselZXNWtaV1pwYm1Wa0tHUmxZblZuUlc1MmFYSnZiaWtwWEc0Z0lDQWdaR1ZpZFdkRmJuWnBjbTl1SUQwZ2NISnZZMlZ6Y3k1bGJuWXVUazlFUlY5RVJVSlZSeUI4ZkNBbkp6dGNiaUFnYzJWMElEMGdjMlYwTG5SdlZYQndaWEpEWVhObEtDazdYRzRnSUdsbUlDZ2haR1ZpZFdkelczTmxkRjBwSUh0Y2JpQWdJQ0JwWmlBb2JtVjNJRkpsWjBWNGNDZ25YRnhjWEdJbklDc2djMlYwSUNzZ0oxeGNYRnhpSnl3Z0oya25LUzUwWlhOMEtHUmxZblZuUlc1MmFYSnZiaWtwSUh0Y2JpQWdJQ0FnSUhaaGNpQndhV1FnUFNCd2NtOWpaWE56TG5CcFpEdGNiaUFnSUNBZ0lHUmxZblZuYzF0elpYUmRJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ0YzJjZ1BTQmxlSEJ2Y25SekxtWnZjbTFoZEM1aGNIQnNlU2hsZUhCdmNuUnpMQ0JoY21kMWJXVnVkSE1wTzF4dUlDQWdJQ0FnSUNCamIyNXpiMnhsTG1WeWNtOXlLQ2NsY3lBbFpEb2dKWE1uTENCelpYUXNJSEJwWkN3Z2JYTm5LVHRjYmlBZ0lDQWdJSDA3WEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lHUmxZblZuYzF0elpYUmRJRDBnWm5WdVkzUnBiMjRvS1NCN2ZUdGNiaUFnSUNCOVhHNGdJSDFjYmlBZ2NtVjBkWEp1SUdSbFluVm5jMXR6WlhSZE8xeHVmVHRjYmx4dVhHNHZLaXBjYmlBcUlFVmphRzl6SUhSb1pTQjJZV3gxWlNCdlppQmhJSFpoYkhWbExpQlVjbmx6SUhSdklIQnlhVzUwSUhSb1pTQjJZV3gxWlNCdmRYUmNiaUFxSUdsdUlIUm9aU0JpWlhOMElIZGhlU0J3YjNOemFXSnNaU0JuYVhabGJpQjBhR1VnWkdsbVptVnlaVzUwSUhSNWNHVnpMbHh1SUNwY2JpQXFJRUJ3WVhKaGJTQjdUMkpxWldOMGZTQnZZbW9nVkdobElHOWlhbVZqZENCMGJ5QndjbWx1ZENCdmRYUXVYRzRnS2lCQWNHRnlZVzBnZTA5aWFtVmpkSDBnYjNCMGN5QlBjSFJwYjI1aGJDQnZjSFJwYjI1eklHOWlhbVZqZENCMGFHRjBJR0ZzZEdWeWN5QjBhR1VnYjNWMGNIVjBMbHh1SUNvdlhHNHZLaUJzWldkaFkzazZJRzlpYWl3Z2MyaHZkMGhwWkdSbGJpd2daR1Z3ZEdnc0lHTnZiRzl5Y3lvdlhHNW1kVzVqZEdsdmJpQnBibk53WldOMEtHOWlhaXdnYjNCMGN5a2dlMXh1SUNBdkx5QmtaV1poZFd4MElHOXdkR2x2Ym5OY2JpQWdkbUZ5SUdOMGVDQTlJSHRjYmlBZ0lDQnpaV1Z1T2lCYlhTeGNiaUFnSUNCemRIbHNhWHBsT2lCemRIbHNhWHBsVG05RGIyeHZjbHh1SUNCOU8xeHVJQ0F2THlCc1pXZGhZM2t1TGk1Y2JpQWdhV1lnS0dGeVozVnRaVzUwY3k1c1pXNW5kR2dnUGowZ015a2dZM1I0TG1SbGNIUm9JRDBnWVhKbmRXMWxiblJ6V3pKZE8xeHVJQ0JwWmlBb1lYSm5kVzFsYm5SekxteGxibWQwYUNBK1BTQTBLU0JqZEhndVkyOXNiM0p6SUQwZ1lYSm5kVzFsYm5Seld6TmRPMXh1SUNCcFppQW9hWE5DYjI5c1pXRnVLRzl3ZEhNcEtTQjdYRzRnSUNBZ0x5OGdiR1ZuWVdONUxpNHVYRzRnSUNBZ1kzUjRMbk5vYjNkSWFXUmtaVzRnUFNCdmNIUnpPMXh1SUNCOUlHVnNjMlVnYVdZZ0tHOXdkSE1wSUh0Y2JpQWdJQ0F2THlCbmIzUWdZVzRnWENKdmNIUnBiMjV6WENJZ2IySnFaV04wWEc0Z0lDQWdaWGh3YjNKMGN5NWZaWGgwWlc1a0tHTjBlQ3dnYjNCMGN5azdYRzRnSUgxY2JpQWdMeThnYzJWMElHUmxabUYxYkhRZ2IzQjBhVzl1YzF4dUlDQnBaaUFvYVhOVmJtUmxabWx1WldRb1kzUjRMbk5vYjNkSWFXUmtaVzRwS1NCamRIZ3VjMmh2ZDBocFpHUmxiaUE5SUdaaGJITmxPMXh1SUNCcFppQW9hWE5WYm1SbFptbHVaV1FvWTNSNExtUmxjSFJvS1NrZ1kzUjRMbVJsY0hSb0lEMGdNanRjYmlBZ2FXWWdLR2x6Vlc1a1pXWnBibVZrS0dOMGVDNWpiMnh2Y25NcEtTQmpkSGd1WTI5c2IzSnpJRDBnWm1Gc2MyVTdYRzRnSUdsbUlDaHBjMVZ1WkdWbWFXNWxaQ2hqZEhndVkzVnpkRzl0U1c1emNHVmpkQ2twSUdOMGVDNWpkWE4wYjIxSmJuTndaV04wSUQwZ2RISjFaVHRjYmlBZ2FXWWdLR04wZUM1amIyeHZjbk1wSUdOMGVDNXpkSGxzYVhwbElEMGdjM1I1YkdsNlpWZHBkR2hEYjJ4dmNqdGNiaUFnY21WMGRYSnVJR1p2Y20xaGRGWmhiSFZsS0dOMGVDd2diMkpxTENCamRIZ3VaR1Z3ZEdncE8xeHVmVnh1Wlhod2IzSjBjeTVwYm5Od1pXTjBJRDBnYVc1emNHVmpkRHRjYmx4dVhHNHZMeUJvZEhSd09pOHZaVzR1ZDJscmFYQmxaR2xoTG05eVp5OTNhV3RwTDBGT1UwbGZaWE5qWVhCbFgyTnZaR1VqWjNKaGNHaHBZM05jYm1sdWMzQmxZM1F1WTI5c2IzSnpJRDBnZTF4dUlDQW5ZbTlzWkNjZ09pQmJNU3dnTWpKZExGeHVJQ0FuYVhSaGJHbGpKeUE2SUZzekxDQXlNMTBzWEc0Z0lDZDFibVJsY214cGJtVW5JRG9nV3pRc0lESTBYU3hjYmlBZ0oybHVkbVZ5YzJVbklEb2dXemNzSURJM1hTeGNiaUFnSjNkb2FYUmxKeUE2SUZzek55d2dNemxkTEZ4dUlDQW5aM0psZVNjZ09pQmJPVEFzSURNNVhTeGNiaUFnSjJKc1lXTnJKeUE2SUZzek1Dd2dNemxkTEZ4dUlDQW5ZbXgxWlNjZ09pQmJNelFzSURNNVhTeGNiaUFnSjJONVlXNG5JRG9nV3pNMkxDQXpPVjBzWEc0Z0lDZG5jbVZsYmljZ09pQmJNeklzSURNNVhTeGNiaUFnSjIxaFoyVnVkR0VuSURvZ1d6TTFMQ0F6T1Ywc1hHNGdJQ2R5WldRbklEb2dXek14TENBek9WMHNYRzRnSUNkNVpXeHNiM2NuSURvZ1d6TXpMQ0F6T1YxY2JuMDdYRzVjYmk4dklFUnZiaWQwSUhWelpTQW5ZbXgxWlNjZ2JtOTBJSFpwYzJsaWJHVWdiMjRnWTIxa0xtVjRaVnh1YVc1emNHVmpkQzV6ZEhsc1pYTWdQU0I3WEc0Z0lDZHpjR1ZqYVdGc0p6b2dKMk41WVc0bkxGeHVJQ0FuYm5WdFltVnlKem9nSjNsbGJHeHZkeWNzWEc0Z0lDZGliMjlzWldGdUp6b2dKM2xsYkd4dmR5Y3NYRzRnSUNkMWJtUmxabWx1WldRbk9pQW5aM0psZVNjc1hHNGdJQ2R1ZFd4c0p6b2dKMkp2YkdRbkxGeHVJQ0FuYzNSeWFXNW5Kem9nSjJkeVpXVnVKeXhjYmlBZ0oyUmhkR1VuT2lBbmJXRm5aVzUwWVNjc1hHNGdJQzh2SUZ3aWJtRnRaVndpT2lCcGJuUmxiblJwYjI1aGJHeDVJRzV2ZENCemRIbHNhVzVuWEc0Z0lDZHlaV2RsZUhBbk9pQW5jbVZrSjF4dWZUdGNibHh1WEc1bWRXNWpkR2x2YmlCemRIbHNhWHBsVjJsMGFFTnZiRzl5S0hOMGNpd2djM1I1YkdWVWVYQmxLU0I3WEc0Z0lIWmhjaUJ6ZEhsc1pTQTlJR2x1YzNCbFkzUXVjM1I1YkdWelczTjBlV3hsVkhsd1pWMDdYRzVjYmlBZ2FXWWdLSE4wZVd4bEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUNkY1hIVXdNREZpV3ljZ0t5QnBibk53WldOMExtTnZiRzl5YzF0emRIbHNaVjFiTUYwZ0t5QW5iU2NnS3lCemRISWdLMXh1SUNBZ0lDQWdJQ0FnSUNBblhGeDFNREF4WWxzbklDc2dhVzV6Y0dWamRDNWpiMnh2Y25OYmMzUjViR1ZkV3pGZElDc2dKMjBuTzF4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUhKbGRIVnliaUJ6ZEhJN1hHNGdJSDFjYm4xY2JseHVYRzVtZFc1amRHbHZiaUJ6ZEhsc2FYcGxUbTlEYjJ4dmNpaHpkSElzSUhOMGVXeGxWSGx3WlNrZ2UxeHVJQ0J5WlhSMWNtNGdjM1J5TzF4dWZWeHVYRzVjYm1aMWJtTjBhVzl1SUdGeWNtRjVWRzlJWVhOb0tHRnljbUY1S1NCN1hHNGdJSFpoY2lCb1lYTm9JRDBnZTMwN1hHNWNiaUFnWVhKeVlYa3VabTl5UldGamFDaG1kVzVqZEdsdmJpaDJZV3dzSUdsa2VDa2dlMXh1SUNBZ0lHaGhjMmhiZG1Gc1hTQTlJSFJ5ZFdVN1hHNGdJSDBwTzF4dVhHNGdJSEpsZEhWeWJpQm9ZWE5vTzF4dWZWeHVYRzVjYm1aMWJtTjBhVzl1SUdadmNtMWhkRlpoYkhWbEtHTjBlQ3dnZG1Gc2RXVXNJSEpsWTNWeWMyVlVhVzFsY3lrZ2UxeHVJQ0F2THlCUWNtOTJhV1JsSUdFZ2FHOXZheUJtYjNJZ2RYTmxjaTF6Y0dWamFXWnBaV1FnYVc1emNHVmpkQ0JtZFc1amRHbHZibk11WEc0Z0lDOHZJRU5vWldOcklIUm9ZWFFnZG1Gc2RXVWdhWE1nWVc0Z2IySnFaV04wSUhkcGRHZ2dZVzRnYVc1emNHVmpkQ0JtZFc1amRHbHZiaUJ2YmlCcGRGeHVJQ0JwWmlBb1kzUjRMbU4xYzNSdmJVbHVjM0JsWTNRZ0ppWmNiaUFnSUNBZ0lIWmhiSFZsSUNZbVhHNGdJQ0FnSUNCcGMwWjFibU4wYVc5dUtIWmhiSFZsTG1sdWMzQmxZM1FwSUNZbVhHNGdJQ0FnSUNBdkx5QkdhV3gwWlhJZ2IzVjBJSFJvWlNCMWRHbHNJRzF2WkhWc1pTd2dhWFFuY3lCcGJuTndaV04wSUdaMWJtTjBhVzl1SUdseklITndaV05wWVd4Y2JpQWdJQ0FnSUhaaGJIVmxMbWx1YzNCbFkzUWdJVDA5SUdWNGNHOXlkSE11YVc1emNHVmpkQ0FtSmx4dUlDQWdJQ0FnTHk4Z1FXeHpieUJtYVd4MFpYSWdiM1YwSUdGdWVTQndjbTkwYjNSNWNHVWdiMkpxWldOMGN5QjFjMmx1WnlCMGFHVWdZMmx5WTNWc1lYSWdZMmhsWTJzdVhHNGdJQ0FnSUNBaEtIWmhiSFZsTG1OdmJuTjBjblZqZEc5eUlDWW1JSFpoYkhWbExtTnZibk4wY25WamRHOXlMbkJ5YjNSdmRIbHdaU0E5UFQwZ2RtRnNkV1VwS1NCN1hHNGdJQ0FnZG1GeUlISmxkQ0E5SUhaaGJIVmxMbWx1YzNCbFkzUW9jbVZqZFhKelpWUnBiV1Z6TENCamRIZ3BPMXh1SUNBZ0lHbG1JQ2doYVhOVGRISnBibWNvY21WMEtTa2dlMXh1SUNBZ0lDQWdjbVYwSUQwZ1ptOXliV0YwVm1Gc2RXVW9ZM1I0TENCeVpYUXNJSEpsWTNWeWMyVlVhVzFsY3lrN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnlaWFE3WEc0Z0lIMWNibHh1SUNBdkx5QlFjbWx0YVhScGRtVWdkSGx3WlhNZ1kyRnVibTkwSUdoaGRtVWdjSEp2Y0dWeWRHbGxjMXh1SUNCMllYSWdjSEpwYldsMGFYWmxJRDBnWm05eWJXRjBVSEpwYldsMGFYWmxLR04wZUN3Z2RtRnNkV1VwTzF4dUlDQnBaaUFvY0hKcGJXbDBhWFpsS1NCN1hHNGdJQ0FnY21WMGRYSnVJSEJ5YVcxcGRHbDJaVHRjYmlBZ2ZWeHVYRzRnSUM4dklFeHZiMnNnZFhBZ2RHaGxJR3RsZVhNZ2IyWWdkR2hsSUc5aWFtVmpkQzVjYmlBZ2RtRnlJR3RsZVhNZ1BTQlBZbXBsWTNRdWEyVjVjeWgyWVd4MVpTazdYRzRnSUhaaGNpQjJhWE5wWW14bFMyVjVjeUE5SUdGeWNtRjVWRzlJWVhOb0tHdGxlWE1wTzF4dVhHNGdJR2xtSUNoamRIZ3VjMmh2ZDBocFpHUmxiaWtnZTF4dUlDQWdJR3RsZVhNZ1BTQlBZbXBsWTNRdVoyVjBUM2R1VUhKdmNHVnlkSGxPWVcxbGN5aDJZV3gxWlNrN1hHNGdJSDFjYmx4dUlDQXZMeUJKUlNCa2IyVnpiaWQwSUcxaGEyVWdaWEp5YjNJZ1ptbGxiR1J6SUc1dmJpMWxiblZ0WlhKaFlteGxYRzRnSUM4dklHaDBkSEE2THk5dGMyUnVMbTFwWTNKdmMyOW1kQzVqYjIwdlpXNHRkWE12YkdsaWNtRnllUzlwWlM5a2QzYzFNbk5pZENoMlBYWnpMamswS1M1aGMzQjRYRzRnSUdsbUlDaHBjMFZ5Y205eUtIWmhiSFZsS1Z4dUlDQWdJQ0FnSmlZZ0tHdGxlWE11YVc1a1pYaFBaaWduYldWemMyRm5aU2NwSUQ0OUlEQWdmSHdnYTJWNWN5NXBibVJsZUU5bUtDZGtaWE5qY21sd2RHbHZiaWNwSUQ0OUlEQXBLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHWnZjbTFoZEVWeWNtOXlLSFpoYkhWbEtUdGNiaUFnZlZ4dVhHNGdJQzh2SUZOdmJXVWdkSGx3WlNCdlppQnZZbXBsWTNRZ2QybDBhRzkxZENCd2NtOXdaWEowYVdWeklHTmhiaUJpWlNCemFHOXlkR04xZEhSbFpDNWNiaUFnYVdZZ0tHdGxlWE11YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ2FXWWdLR2x6Um5WdVkzUnBiMjRvZG1Gc2RXVXBLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2JtRnRaU0E5SUhaaGJIVmxMbTVoYldVZ1B5QW5PaUFuSUNzZ2RtRnNkV1V1Ym1GdFpTQTZJQ2NuTzF4dUlDQWdJQ0FnY21WMGRYSnVJR04wZUM1emRIbHNhWHBsS0NkYlJuVnVZM1JwYjI0bklDc2dibUZ0WlNBcklDZGRKeXdnSjNOd1pXTnBZV3duS1R0Y2JpQWdJQ0I5WEc0Z0lDQWdhV1lnS0dselVtVm5SWGh3S0haaGJIVmxLU2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR04wZUM1emRIbHNhWHBsS0ZKbFowVjRjQzV3Y205MGIzUjVjR1V1ZEc5VGRISnBibWN1WTJGc2JDaDJZV3gxWlNrc0lDZHlaV2RsZUhBbktUdGNiaUFnSUNCOVhHNGdJQ0FnYVdZZ0tHbHpSR0YwWlNoMllXeDFaU2twSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJqZEhndWMzUjViR2w2WlNoRVlYUmxMbkJ5YjNSdmRIbHdaUzUwYjFOMGNtbHVaeTVqWVd4c0tIWmhiSFZsS1N3Z0oyUmhkR1VuS1R0Y2JpQWdJQ0I5WEc0Z0lDQWdhV1lnS0dselJYSnliM0lvZG1Gc2RXVXBLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdabTl5YldGMFJYSnliM0lvZG1Gc2RXVXBPMXh1SUNBZ0lIMWNiaUFnZlZ4dVhHNGdJSFpoY2lCaVlYTmxJRDBnSnljc0lHRnljbUY1SUQwZ1ptRnNjMlVzSUdKeVlXTmxjeUE5SUZzbmV5Y3NJQ2Q5SjEwN1hHNWNiaUFnTHk4Z1RXRnJaU0JCY25KaGVTQnpZWGtnZEdoaGRDQjBhR1Y1SUdGeVpTQkJjbkpoZVZ4dUlDQnBaaUFvYVhOQmNuSmhlU2gyWVd4MVpTa3BJSHRjYmlBZ0lDQmhjbkpoZVNBOUlIUnlkV1U3WEc0Z0lDQWdZbkpoWTJWeklEMGdXeWRiSnl3Z0oxMG5YVHRjYmlBZ2ZWeHVYRzRnSUM4dklFMWhhMlVnWm5WdVkzUnBiMjV6SUhOaGVTQjBhR0YwSUhSb1pYa2dZWEpsSUdaMWJtTjBhVzl1YzF4dUlDQnBaaUFvYVhOR2RXNWpkR2x2YmloMllXeDFaU2twSUh0Y2JpQWdJQ0IyWVhJZ2JpQTlJSFpoYkhWbExtNWhiV1VnUHlBbk9pQW5JQ3NnZG1Gc2RXVXVibUZ0WlNBNklDY25PMXh1SUNBZ0lHSmhjMlVnUFNBbklGdEdkVzVqZEdsdmJpY2dLeUJ1SUNzZ0oxMG5PMXh1SUNCOVhHNWNiaUFnTHk4Z1RXRnJaU0JTWldkRmVIQnpJSE5oZVNCMGFHRjBJSFJvWlhrZ1lYSmxJRkpsWjBWNGNITmNiaUFnYVdZZ0tHbHpVbVZuUlhod0tIWmhiSFZsS1NrZ2UxeHVJQ0FnSUdKaGMyVWdQU0FuSUNjZ0t5QlNaV2RGZUhBdWNISnZkRzkwZVhCbExuUnZVM1J5YVc1bkxtTmhiR3dvZG1Gc2RXVXBPMXh1SUNCOVhHNWNiaUFnTHk4Z1RXRnJaU0JrWVhSbGN5QjNhWFJvSUhCeWIzQmxjblJwWlhNZ1ptbHljM1FnYzJGNUlIUm9aU0JrWVhSbFhHNGdJR2xtSUNocGMwUmhkR1VvZG1Gc2RXVXBLU0I3WEc0Z0lDQWdZbUZ6WlNBOUlDY2dKeUFySUVSaGRHVXVjSEp2ZEc5MGVYQmxMblJ2VlZSRFUzUnlhVzVuTG1OaGJHd29kbUZzZFdVcE8xeHVJQ0I5WEc1Y2JpQWdMeThnVFdGclpTQmxjbkp2Y2lCM2FYUm9JRzFsYzNOaFoyVWdabWx5YzNRZ2MyRjVJSFJvWlNCbGNuSnZjbHh1SUNCcFppQW9hWE5GY25KdmNpaDJZV3gxWlNrcElIdGNiaUFnSUNCaVlYTmxJRDBnSnlBbklDc2dabTl5YldGMFJYSnliM0lvZG1Gc2RXVXBPMXh1SUNCOVhHNWNiaUFnYVdZZ0tHdGxlWE11YkdWdVozUm9JRDA5UFNBd0lDWW1JQ2doWVhKeVlYa2dmSHdnZG1Gc2RXVXViR1Z1WjNSb0lEMDlJREFwS1NCN1hHNGdJQ0FnY21WMGRYSnVJR0p5WVdObGMxc3dYU0FySUdKaGMyVWdLeUJpY21GalpYTmJNVjA3WEc0Z0lIMWNibHh1SUNCcFppQW9jbVZqZFhKelpWUnBiV1Z6SUR3Z01Da2dlMXh1SUNBZ0lHbG1JQ2hwYzFKbFowVjRjQ2gyWVd4MVpTa3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQmpkSGd1YzNSNWJHbDZaU2hTWldkRmVIQXVjSEp2ZEc5MGVYQmxMblJ2VTNSeWFXNW5MbU5oYkd3b2RtRnNkV1VwTENBbmNtVm5aWGh3SnlrN1hHNGdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQmpkSGd1YzNSNWJHbDZaU2duVzA5aWFtVmpkRjBuTENBbmMzQmxZMmxoYkNjcE8xeHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lHTjBlQzV6WldWdUxuQjFjMmdvZG1Gc2RXVXBPMXh1WEc0Z0lIWmhjaUJ2ZFhSd2RYUTdYRzRnSUdsbUlDaGhjbkpoZVNrZ2UxeHVJQ0FnSUc5MWRIQjFkQ0E5SUdadmNtMWhkRUZ5Y21GNUtHTjBlQ3dnZG1Gc2RXVXNJSEpsWTNWeWMyVlVhVzFsY3l3Z2RtbHphV0pzWlV0bGVYTXNJR3RsZVhNcE8xeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lHOTFkSEIxZENBOUlHdGxlWE11YldGd0tHWjFibU4wYVc5dUtHdGxlU2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR1p2Y20xaGRGQnliM0JsY25SNUtHTjBlQ3dnZG1Gc2RXVXNJSEpsWTNWeWMyVlVhVzFsY3l3Z2RtbHphV0pzWlV0bGVYTXNJR3RsZVN3Z1lYSnlZWGtwTzF4dUlDQWdJSDBwTzF4dUlDQjlYRzVjYmlBZ1kzUjRMbk5sWlc0dWNHOXdLQ2s3WEc1Y2JpQWdjbVYwZFhKdUlISmxaSFZqWlZSdlUybHVaMnhsVTNSeWFXNW5LRzkxZEhCMWRDd2dZbUZ6WlN3Z1luSmhZMlZ6S1R0Y2JuMWNibHh1WEc1bWRXNWpkR2x2YmlCbWIzSnRZWFJRY21sdGFYUnBkbVVvWTNSNExDQjJZV3gxWlNrZ2UxeHVJQ0JwWmlBb2FYTlZibVJsWm1sdVpXUW9kbUZzZFdVcEtWeHVJQ0FnSUhKbGRIVnliaUJqZEhndWMzUjViR2w2WlNnbmRXNWtaV1pwYm1Wa0p5d2dKM1Z1WkdWbWFXNWxaQ2NwTzF4dUlDQnBaaUFvYVhOVGRISnBibWNvZG1Gc2RXVXBLU0I3WEc0Z0lDQWdkbUZ5SUhOcGJYQnNaU0E5SUNkY1hDY25JQ3NnU2xOUFRpNXpkSEpwYm1kcFpua29kbUZzZFdVcExuSmxjR3hoWTJVb0wxNWNJbnhjSWlRdlp5d2dKeWNwWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBdWNtVndiR0ZqWlNndkp5OW5MQ0JjSWx4Y1hGd25YQ0lwWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBdWNtVndiR0ZqWlNndlhGeGNYRndpTDJjc0lDZGNJaWNwSUNzZ0oxeGNKeWM3WEc0Z0lDQWdjbVYwZFhKdUlHTjBlQzV6ZEhsc2FYcGxLSE5wYlhCc1pTd2dKM04wY21sdVp5Y3BPMXh1SUNCOVhHNGdJR2xtSUNocGMwNTFiV0psY2loMllXeDFaU2twWEc0Z0lDQWdjbVYwZFhKdUlHTjBlQzV6ZEhsc2FYcGxLQ2NuSUNzZ2RtRnNkV1VzSUNkdWRXMWlaWEluS1R0Y2JpQWdhV1lnS0dselFtOXZiR1ZoYmloMllXeDFaU2twWEc0Z0lDQWdjbVYwZFhKdUlHTjBlQzV6ZEhsc2FYcGxLQ2NuSUNzZ2RtRnNkV1VzSUNkaWIyOXNaV0Z1SnlrN1hHNGdJQzh2SUVadmNpQnpiMjFsSUhKbFlYTnZiaUIwZVhCbGIyWWdiblZzYkNCcGN5QmNJbTlpYW1WamRGd2lMQ0J6YnlCemNHVmphV0ZzSUdOaGMyVWdhR1Z5WlM1Y2JpQWdhV1lnS0dselRuVnNiQ2gyWVd4MVpTa3BYRzRnSUNBZ2NtVjBkWEp1SUdOMGVDNXpkSGxzYVhwbEtDZHVkV3hzSnl3Z0oyNTFiR3duS1R0Y2JuMWNibHh1WEc1bWRXNWpkR2x2YmlCbWIzSnRZWFJGY25KdmNpaDJZV3gxWlNrZ2UxeHVJQ0J5WlhSMWNtNGdKMXNuSUNzZ1JYSnliM0l1Y0hKdmRHOTBlWEJsTG5SdlUzUnlhVzVuTG1OaGJHd29kbUZzZFdVcElDc2dKMTBuTzF4dWZWeHVYRzVjYm1aMWJtTjBhVzl1SUdadmNtMWhkRUZ5Y21GNUtHTjBlQ3dnZG1Gc2RXVXNJSEpsWTNWeWMyVlVhVzFsY3l3Z2RtbHphV0pzWlV0bGVYTXNJR3RsZVhNcElIdGNiaUFnZG1GeUlHOTFkSEIxZENBOUlGdGRPMXh1SUNCbWIzSWdLSFpoY2lCcElEMGdNQ3dnYkNBOUlIWmhiSFZsTG14bGJtZDBhRHNnYVNBOElHdzdJQ3NyYVNrZ2UxeHVJQ0FnSUdsbUlDaG9ZWE5QZDI1UWNtOXdaWEowZVNoMllXeDFaU3dnVTNSeWFXNW5LR2twS1NrZ2UxeHVJQ0FnSUNBZ2IzVjBjSFYwTG5CMWMyZ29abTl5YldGMFVISnZjR1Z5ZEhrb1kzUjRMQ0IyWVd4MVpTd2djbVZqZFhKelpWUnBiV1Z6TENCMmFYTnBZbXhsUzJWNWN5eGNiaUFnSUNBZ0lDQWdJQ0JUZEhKcGJtY29hU2tzSUhSeWRXVXBLVHRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ2IzVjBjSFYwTG5CMWMyZ29KeWNwTzF4dUlDQWdJSDFjYmlBZ2ZWeHVJQ0JyWlhsekxtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2EyVjVLU0I3WEc0Z0lDQWdhV1lnS0NGclpYa3ViV0YwWTJnb0wxNWNYR1FySkM4cEtTQjdYRzRnSUNBZ0lDQnZkWFJ3ZFhRdWNIVnphQ2htYjNKdFlYUlFjbTl3WlhKMGVTaGpkSGdzSUhaaGJIVmxMQ0J5WldOMWNuTmxWR2x0WlhNc0lIWnBjMmxpYkdWTFpYbHpMRnh1SUNBZ0lDQWdJQ0FnSUd0bGVTd2dkSEoxWlNrcE8xeHVJQ0FnSUgxY2JpQWdmU2s3WEc0Z0lISmxkSFZ5YmlCdmRYUndkWFE3WEc1OVhHNWNibHh1Wm5WdVkzUnBiMjRnWm05eWJXRjBVSEp2Y0dWeWRIa29ZM1I0TENCMllXeDFaU3dnY21WamRYSnpaVlJwYldWekxDQjJhWE5wWW14bFMyVjVjeXdnYTJWNUxDQmhjbkpoZVNrZ2UxeHVJQ0IyWVhJZ2JtRnRaU3dnYzNSeUxDQmtaWE5qTzF4dUlDQmtaWE5qSUQwZ1QySnFaV04wTG1kbGRFOTNibEJ5YjNCbGNuUjVSR1Z6WTNKcGNIUnZjaWgyWVd4MVpTd2dhMlY1S1NCOGZDQjdJSFpoYkhWbE9pQjJZV3gxWlZ0clpYbGRJSDA3WEc0Z0lHbG1JQ2hrWlhOakxtZGxkQ2tnZTF4dUlDQWdJR2xtSUNoa1pYTmpMbk5sZENrZ2UxeHVJQ0FnSUNBZ2MzUnlJRDBnWTNSNExuTjBlV3hwZW1Vb0oxdEhaWFIwWlhJdlUyVjBkR1Z5WFNjc0lDZHpjR1ZqYVdGc0p5azdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUhOMGNpQTlJR04wZUM1emRIbHNhWHBsS0NkYlIyVjBkR1Z5WFNjc0lDZHpjR1ZqYVdGc0p5azdYRzRnSUNBZ2ZWeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lHbG1JQ2hrWlhOakxuTmxkQ2tnZTF4dUlDQWdJQ0FnYzNSeUlEMGdZM1I0TG5OMGVXeHBlbVVvSjF0VFpYUjBaWEpkSnl3Z0ozTndaV05wWVd3bktUdGNiaUFnSUNCOVhHNGdJSDFjYmlBZ2FXWWdLQ0ZvWVhOUGQyNVFjbTl3WlhKMGVTaDJhWE5wWW14bFMyVjVjeXdnYTJWNUtTa2dlMXh1SUNBZ0lHNWhiV1VnUFNBbld5Y2dLeUJyWlhrZ0t5QW5YU2M3WEc0Z0lIMWNiaUFnYVdZZ0tDRnpkSElwSUh0Y2JpQWdJQ0JwWmlBb1kzUjRMbk5sWlc0dWFXNWtaWGhQWmloa1pYTmpMblpoYkhWbEtTQThJREFwSUh0Y2JpQWdJQ0FnSUdsbUlDaHBjMDUxYkd3b2NtVmpkWEp6WlZScGJXVnpLU2tnZTF4dUlDQWdJQ0FnSUNCemRISWdQU0JtYjNKdFlYUldZV3gxWlNoamRIZ3NJR1JsYzJNdWRtRnNkV1VzSUc1MWJHd3BPMXh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdjM1J5SUQwZ1ptOXliV0YwVm1Gc2RXVW9ZM1I0TENCa1pYTmpMblpoYkhWbExDQnlaV04xY25ObFZHbHRaWE1nTFNBeEtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2h6ZEhJdWFXNWtaWGhQWmlnblhGeHVKeWtnUGlBdE1Ta2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb1lYSnlZWGtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnpkSElnUFNCemRISXVjM0JzYVhRb0oxeGNiaWNwTG0xaGNDaG1kVzVqZEdsdmJpaHNhVzVsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdKeUFnSnlBcklHeHBibVU3WEc0Z0lDQWdJQ0FnSUNBZ2ZTa3VhbTlwYmlnblhGeHVKeWt1YzNWaWMzUnlLRElwTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lITjBjaUE5SUNkY1hHNG5JQ3NnYzNSeUxuTndiR2wwS0NkY1hHNG5LUzV0WVhBb1puVnVZM1JwYjI0b2JHbHVaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlDY2dJQ0FuSUNzZ2JHbHVaVHRjYmlBZ0lDQWdJQ0FnSUNCOUtTNXFiMmx1S0NkY1hHNG5LVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQnpkSElnUFNCamRIZ3VjM1I1YkdsNlpTZ25XME5wY21OMWJHRnlYU2NzSUNkemNHVmphV0ZzSnlrN1hHNGdJQ0FnZlZ4dUlDQjlYRzRnSUdsbUlDaHBjMVZ1WkdWbWFXNWxaQ2h1WVcxbEtTa2dlMXh1SUNBZ0lHbG1JQ2hoY25KaGVTQW1KaUJyWlhrdWJXRjBZMmdvTDE1Y1hHUXJKQzhwS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYzNSeU8xeHVJQ0FnSUgxY2JpQWdJQ0J1WVcxbElEMGdTbE5QVGk1emRISnBibWRwWm5rb0p5Y2dLeUJyWlhrcE8xeHVJQ0FnSUdsbUlDaHVZVzFsTG0xaGRHTm9LQzllWENJb1cyRXRla0V0V2w5ZFcyRXRla0V0V2w4d0xUbGRLaWxjSWlRdktTa2dlMXh1SUNBZ0lDQWdibUZ0WlNBOUlHNWhiV1V1YzNWaWMzUnlLREVzSUc1aGJXVXViR1Z1WjNSb0lDMGdNaWs3WEc0Z0lDQWdJQ0J1WVcxbElEMGdZM1I0TG5OMGVXeHBlbVVvYm1GdFpTd2dKMjVoYldVbktUdGNiaUFnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnYm1GdFpTQTlJRzVoYldVdWNtVndiR0ZqWlNndkp5OW5MQ0JjSWx4Y1hGd25YQ0lwWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUM1eVpYQnNZV05sS0M5Y1hGeGNYQ0l2Wnl3Z0oxd2lKeWxjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnTG5KbGNHeGhZMlVvTHloZVhDSjhYQ0lrS1M5bkxDQmNJaWRjSWlrN1hHNGdJQ0FnSUNCdVlXMWxJRDBnWTNSNExuTjBlV3hwZW1Vb2JtRnRaU3dnSjNOMGNtbHVaeWNwTzF4dUlDQWdJSDFjYmlBZ2ZWeHVYRzRnSUhKbGRIVnliaUJ1WVcxbElDc2dKem9nSnlBcklITjBjanRjYm4xY2JseHVYRzVtZFc1amRHbHZiaUJ5WldSMVkyVlViMU5wYm1kc1pWTjBjbWx1WnlodmRYUndkWFFzSUdKaGMyVXNJR0p5WVdObGN5a2dlMXh1SUNCMllYSWdiblZ0VEdsdVpYTkZjM1FnUFNBd08xeHVJQ0IyWVhJZ2JHVnVaM1JvSUQwZ2IzVjBjSFYwTG5KbFpIVmpaU2htZFc1amRHbHZiaWh3Y21WMkxDQmpkWElwSUh0Y2JpQWdJQ0J1ZFcxTWFXNWxjMFZ6ZENzck8xeHVJQ0FnSUdsbUlDaGpkWEl1YVc1a1pYaFBaaWduWEZ4dUp5a2dQajBnTUNrZ2JuVnRUR2x1WlhORmMzUXJLenRjYmlBZ0lDQnlaWFIxY200Z2NISmxkaUFySUdOMWNpNXlaWEJzWVdObEtDOWNYSFV3TURGaVhGeGJYRnhrWEZ4a1AyMHZaeXdnSnljcExteGxibWQwYUNBcklERTdYRzRnSUgwc0lEQXBPMXh1WEc0Z0lHbG1JQ2hzWlc1bmRHZ2dQaUEyTUNrZ2UxeHVJQ0FnSUhKbGRIVnliaUJpY21GalpYTmJNRjBnSzF4dUlDQWdJQ0FnSUNBZ0lDQW9ZbUZ6WlNBOVBUMGdKeWNnUHlBbkp5QTZJR0poYzJVZ0t5QW5YRnh1SUNjcElDdGNiaUFnSUNBZ0lDQWdJQ0FnSnlBbklDdGNiaUFnSUNBZ0lDQWdJQ0FnYjNWMGNIVjBMbXB2YVc0b0p5eGNYRzRnSUNjcElDdGNiaUFnSUNBZ0lDQWdJQ0FnSnlBbklDdGNiaUFnSUNBZ0lDQWdJQ0FnWW5KaFkyVnpXekZkTzF4dUlDQjlYRzVjYmlBZ2NtVjBkWEp1SUdKeVlXTmxjMXN3WFNBcklHSmhjMlVnS3lBbklDY2dLeUJ2ZFhSd2RYUXVhbTlwYmlnbkxDQW5LU0FySUNjZ0p5QXJJR0p5WVdObGMxc3hYVHRjYm4xY2JseHVYRzR2THlCT1QxUkZPaUJVYUdWelpTQjBlWEJsSUdOb1pXTnJhVzVuSUdaMWJtTjBhVzl1Y3lCcGJuUmxiblJwYjI1aGJHeDVJR1J2YmlkMElIVnpaU0JnYVc1emRHRnVZMlZ2Wm1CY2JpOHZJR0psWTJGMWMyVWdhWFFnYVhNZ1puSmhaMmxzWlNCaGJtUWdZMkZ1SUdKbElHVmhjMmxzZVNCbVlXdGxaQ0IzYVhSb0lHQlBZbXBsWTNRdVkzSmxZWFJsS0NsZ0xseHVablZ1WTNScGIyNGdhWE5CY25KaGVTaGhjaWtnZTF4dUlDQnlaWFIxY200Z1FYSnlZWGt1YVhOQmNuSmhlU2hoY2lrN1hHNTlYRzVsZUhCdmNuUnpMbWx6UVhKeVlYa2dQU0JwYzBGeWNtRjVPMXh1WEc1bWRXNWpkR2x2YmlCcGMwSnZiMnhsWVc0b1lYSm5LU0I3WEc0Z0lISmxkSFZ5YmlCMGVYQmxiMllnWVhKbklEMDlQU0FuWW05dmJHVmhiaWM3WEc1OVhHNWxlSEJ2Y25SekxtbHpRbTl2YkdWaGJpQTlJR2x6UW05dmJHVmhianRjYmx4dVpuVnVZM1JwYjI0Z2FYTk9kV3hzS0dGeVp5a2dlMXh1SUNCeVpYUjFjbTRnWVhKbklEMDlQU0J1ZFd4c08xeHVmVnh1Wlhod2IzSjBjeTVwYzA1MWJHd2dQU0JwYzA1MWJHdzdYRzVjYm1aMWJtTjBhVzl1SUdselRuVnNiRTl5Vlc1a1pXWnBibVZrS0dGeVp5a2dlMXh1SUNCeVpYUjFjbTRnWVhKbklEMDlJRzUxYkd3N1hHNTlYRzVsZUhCdmNuUnpMbWx6VG5Wc2JFOXlWVzVrWldacGJtVmtJRDBnYVhOT2RXeHNUM0pWYm1SbFptbHVaV1E3WEc1Y2JtWjFibU4wYVc5dUlHbHpUblZ0WW1WeUtHRnlaeWtnZTF4dUlDQnlaWFIxY200Z2RIbHdaVzltSUdGeVp5QTlQVDBnSjI1MWJXSmxjaWM3WEc1OVhHNWxlSEJ2Y25SekxtbHpUblZ0WW1WeUlEMGdhWE5PZFcxaVpYSTdYRzVjYm1aMWJtTjBhVzl1SUdselUzUnlhVzVuS0dGeVp5a2dlMXh1SUNCeVpYUjFjbTRnZEhsd1pXOW1JR0Z5WnlBOVBUMGdKM04wY21sdVp5YzdYRzU5WEc1bGVIQnZjblJ6TG1selUzUnlhVzVuSUQwZ2FYTlRkSEpwYm1jN1hHNWNibVoxYm1OMGFXOXVJR2x6VTNsdFltOXNLR0Z5WnlrZ2UxeHVJQ0J5WlhSMWNtNGdkSGx3Wlc5bUlHRnlaeUE5UFQwZ0ozTjViV0p2YkNjN1hHNTlYRzVsZUhCdmNuUnpMbWx6VTNsdFltOXNJRDBnYVhOVGVXMWliMnc3WEc1Y2JtWjFibU4wYVc5dUlHbHpWVzVrWldacGJtVmtLR0Z5WnlrZ2UxeHVJQ0J5WlhSMWNtNGdZWEpuSUQwOVBTQjJiMmxrSURBN1hHNTlYRzVsZUhCdmNuUnpMbWx6Vlc1a1pXWnBibVZrSUQwZ2FYTlZibVJsWm1sdVpXUTdYRzVjYm1aMWJtTjBhVzl1SUdselVtVm5SWGh3S0hKbEtTQjdYRzRnSUhKbGRIVnliaUJwYzA5aWFtVmpkQ2h5WlNrZ0ppWWdiMkpxWldOMFZHOVRkSEpwYm1jb2NtVXBJRDA5UFNBblcyOWlhbVZqZENCU1pXZEZlSEJkSnp0Y2JuMWNibVY0Y0c5eWRITXVhWE5TWldkRmVIQWdQU0JwYzFKbFowVjRjRHRjYmx4dVpuVnVZM1JwYjI0Z2FYTlBZbXBsWTNRb1lYSm5LU0I3WEc0Z0lISmxkSFZ5YmlCMGVYQmxiMllnWVhKbklEMDlQU0FuYjJKcVpXTjBKeUFtSmlCaGNtY2dJVDA5SUc1MWJHdzdYRzU5WEc1bGVIQnZjblJ6TG1selQySnFaV04wSUQwZ2FYTlBZbXBsWTNRN1hHNWNibVoxYm1OMGFXOXVJR2x6UkdGMFpTaGtLU0I3WEc0Z0lISmxkSFZ5YmlCcGMwOWlhbVZqZENoa0tTQW1KaUJ2WW1wbFkzUlViMU4wY21sdVp5aGtLU0E5UFQwZ0oxdHZZbXBsWTNRZ1JHRjBaVjBuTzF4dWZWeHVaWGh3YjNKMGN5NXBjMFJoZEdVZ1BTQnBjMFJoZEdVN1hHNWNibVoxYm1OMGFXOXVJR2x6UlhKeWIzSW9aU2tnZTF4dUlDQnlaWFIxY200Z2FYTlBZbXBsWTNRb1pTa2dKaVpjYmlBZ0lDQWdJQ2h2WW1wbFkzUlViMU4wY21sdVp5aGxLU0E5UFQwZ0oxdHZZbXBsWTNRZ1JYSnliM0pkSnlCOGZDQmxJR2x1YzNSaGJtTmxiMllnUlhKeWIzSXBPMXh1ZlZ4dVpYaHdiM0owY3k1cGMwVnljbTl5SUQwZ2FYTkZjbkp2Y2p0Y2JseHVablZ1WTNScGIyNGdhWE5HZFc1amRHbHZiaWhoY21jcElIdGNiaUFnY21WMGRYSnVJSFI1Y0dWdlppQmhjbWNnUFQwOUlDZG1kVzVqZEdsdmJpYzdYRzU5WEc1bGVIQnZjblJ6TG1selJuVnVZM1JwYjI0Z1BTQnBjMFoxYm1OMGFXOXVPMXh1WEc1bWRXNWpkR2x2YmlCcGMxQnlhVzFwZEdsMlpTaGhjbWNwSUh0Y2JpQWdjbVYwZFhKdUlHRnlaeUE5UFQwZ2JuVnNiQ0I4ZkZ4dUlDQWdJQ0FnSUNBZ2RIbHdaVzltSUdGeVp5QTlQVDBnSjJKdmIyeGxZVzRuSUh4OFhHNGdJQ0FnSUNBZ0lDQjBlWEJsYjJZZ1lYSm5JRDA5UFNBbmJuVnRZbVZ5SnlCOGZGeHVJQ0FnSUNBZ0lDQWdkSGx3Wlc5bUlHRnlaeUE5UFQwZ0ozTjBjbWx1WnljZ2ZIeGNiaUFnSUNBZ0lDQWdJSFI1Y0dWdlppQmhjbWNnUFQwOUlDZHplVzFpYjJ3bklIeDhJQ0F2THlCRlV6WWdjM2x0WW05c1hHNGdJQ0FnSUNBZ0lDQjBlWEJsYjJZZ1lYSm5JRDA5UFNBbmRXNWtaV1pwYm1Wa0p6dGNibjFjYm1WNGNHOXlkSE11YVhOUWNtbHRhWFJwZG1VZ1BTQnBjMUJ5YVcxcGRHbDJaVHRjYmx4dVpYaHdiM0owY3k1cGMwSjFabVpsY2lBOUlISmxjWFZwY21Vb0p5NHZjM1Z3Y0c5eWRDOXBjMEoxWm1abGNpY3BPMXh1WEc1bWRXNWpkR2x2YmlCdlltcGxZM1JVYjFOMGNtbHVaeWh2S1NCN1hHNGdJSEpsZEhWeWJpQlBZbXBsWTNRdWNISnZkRzkwZVhCbExuUnZVM1J5YVc1bkxtTmhiR3dvYnlrN1hHNTlYRzVjYmx4dVpuVnVZM1JwYjI0Z2NHRmtLRzRwSUh0Y2JpQWdjbVYwZFhKdUlHNGdQQ0F4TUNBL0lDY3dKeUFySUc0dWRHOVRkSEpwYm1jb01UQXBJRG9nYmk1MGIxTjBjbWx1WnlneE1DazdYRzU5WEc1Y2JseHVkbUZ5SUcxdmJuUm9jeUE5SUZzblNtRnVKeXdnSjBabFlpY3NJQ2ROWVhJbkxDQW5RWEJ5Snl3Z0owMWhlU2NzSUNkS2RXNG5MQ0FuU25Wc0p5d2dKMEYxWnljc0lDZFRaWEFuTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FuVDJOMEp5d2dKMDV2ZGljc0lDZEVaV01uWFR0Y2JseHVMeThnTWpZZ1JtVmlJREUyT2pFNU9qTTBYRzVtZFc1amRHbHZiaUIwYVcxbGMzUmhiWEFvS1NCN1hHNGdJSFpoY2lCa0lEMGdibVYzSUVSaGRHVW9LVHRjYmlBZ2RtRnlJSFJwYldVZ1BTQmJjR0ZrS0dRdVoyVjBTRzkxY25Nb0tTa3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lIQmhaQ2hrTG1kbGRFMXBiblYwWlhNb0tTa3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lIQmhaQ2hrTG1kbGRGTmxZMjl1WkhNb0tTbGRMbXB2YVc0b0p6b25LVHRjYmlBZ2NtVjBkWEp1SUZ0a0xtZGxkRVJoZEdVb0tTd2diVzl1ZEdoelcyUXVaMlYwVFc5dWRHZ29LVjBzSUhScGJXVmRMbXB2YVc0b0p5QW5LVHRjYm4xY2JseHVYRzR2THlCc2IyY2dhWE1nYW5WemRDQmhJSFJvYVc0Z2QzSmhjSEJsY2lCMGJ5QmpiMjV6YjJ4bExteHZaeUIwYUdGMElIQnlaWEJsYm1SeklHRWdkR2x0WlhOMFlXMXdYRzVsZUhCdmNuUnpMbXh2WnlBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNCamIyNXpiMnhsTG14dlp5Z25KWE1nTFNBbGN5Y3NJSFJwYldWemRHRnRjQ2dwTENCbGVIQnZjblJ6TG1admNtMWhkQzVoY0hCc2VTaGxlSEJ2Y25SekxDQmhjbWQxYldWdWRITXBLVHRjYm4wN1hHNWNibHh1THlvcVhHNGdLaUJKYm1obGNtbDBJSFJvWlNCd2NtOTBiM1I1Y0dVZ2JXVjBhRzlrY3lCbWNtOXRJRzl1WlNCamIyNXpkSEoxWTNSdmNpQnBiblJ2SUdGdWIzUm9aWEl1WEc0Z0tseHVJQ29nVkdobElFWjFibU4wYVc5dUxuQnliM1J2ZEhsd1pTNXBibWhsY21sMGN5Qm1jbTl0SUd4aGJtY3Vhbk1nY21WM2NtbDBkR1Z1SUdGeklHRWdjM1JoYm1SaGJHOXVaVnh1SUNvZ1puVnVZM1JwYjI0Z0tHNXZkQ0J2YmlCR2RXNWpkR2x2Ymk1d2NtOTBiM1I1Y0dVcExpQk9UMVJGT2lCSlppQjBhR2x6SUdacGJHVWdhWE1nZEc4Z1ltVWdiRzloWkdWa1hHNGdLaUJrZFhKcGJtY2dZbTl2ZEhOMGNtRndjR2x1WnlCMGFHbHpJR1oxYm1OMGFXOXVJRzVsWldSeklIUnZJR0psSUhKbGQzSnBkSFJsYmlCMWMybHVaeUJ6YjIxbElHNWhkR2wyWlZ4dUlDb2dablZ1WTNScGIyNXpJR0Z6SUhCeWIzUnZkSGx3WlNCelpYUjFjQ0IxYzJsdVp5QnViM0p0WVd3Z1NtRjJZVk5qY21sd2RDQmtiMlZ6SUc1dmRDQjNiM0pySUdGelhHNGdLaUJsZUhCbFkzUmxaQ0JrZFhKcGJtY2dZbTl2ZEhOMGNtRndjR2x1WnlBb2MyVmxJRzFwY25KdmNpNXFjeUJwYmlCeU1URTBPVEF6S1M1Y2JpQXFYRzRnS2lCQWNHRnlZVzBnZTJaMWJtTjBhVzl1ZlNCamRHOXlJRU52Ym5OMGNuVmpkRzl5SUdaMWJtTjBhVzl1SUhkb2FXTm9JRzVsWldSeklIUnZJR2x1YUdWeWFYUWdkR2hsWEc0Z0tpQWdJQ0FnY0hKdmRHOTBlWEJsTGx4dUlDb2dRSEJoY21GdElIdG1kVzVqZEdsdmJuMGdjM1Z3WlhKRGRHOXlJRU52Ym5OMGNuVmpkRzl5SUdaMWJtTjBhVzl1SUhSdklHbHVhR1Z5YVhRZ2NISnZkRzkwZVhCbElHWnliMjB1WEc0Z0tpOWNibVY0Y0c5eWRITXVhVzVvWlhKcGRITWdQU0J5WlhGMWFYSmxLQ2RwYm1obGNtbDBjeWNwTzF4dVhHNWxlSEJ2Y25SekxsOWxlSFJsYm1RZ1BTQm1kVzVqZEdsdmJpaHZjbWxuYVc0c0lHRmtaQ2tnZTF4dUlDQXZMeUJFYjI0bmRDQmtieUJoYm5sMGFHbHVaeUJwWmlCaFpHUWdhWE51SjNRZ1lXNGdiMkpxWldOMFhHNGdJR2xtSUNnaFlXUmtJSHg4SUNGcGMwOWlhbVZqZENoaFpHUXBLU0J5WlhSMWNtNGdiM0pwWjJsdU8xeHVYRzRnSUhaaGNpQnJaWGx6SUQwZ1QySnFaV04wTG10bGVYTW9ZV1JrS1R0Y2JpQWdkbUZ5SUdrZ1BTQnJaWGx6TG14bGJtZDBhRHRjYmlBZ2QyaHBiR1VnS0drdExTa2dlMXh1SUNBZ0lHOXlhV2RwYmx0clpYbHpXMmxkWFNBOUlHRmtaRnRyWlhselcybGRYVHRjYmlBZ2ZWeHVJQ0J5WlhSMWNtNGdiM0pwWjJsdU8xeHVmVHRjYmx4dVpuVnVZM1JwYjI0Z2FHRnpUM2R1VUhKdmNHVnlkSGtvYjJKcUxDQndjbTl3S1NCN1hHNGdJSEpsZEhWeWJpQlBZbXBsWTNRdWNISnZkRzkwZVhCbExtaGhjMDkzYmxCeWIzQmxjblI1TG1OaGJHd29iMkpxTENCd2NtOXdLVHRjYm4xY2JpSmRmUT09IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBidWZmZXJzID0gcmVxdWlyZShcIi4vaW1wbC9idWZmZXJzXCIpO1xudmFyIGNoYW5uZWxzID0gcmVxdWlyZShcIi4vaW1wbC9jaGFubmVsc1wiKTtcbnZhciBzZWxlY3QgPSByZXF1aXJlKFwiLi9pbXBsL3NlbGVjdFwiKTtcbnZhciBwcm9jZXNzID0gcmVxdWlyZShcIi4vaW1wbC9wcm9jZXNzXCIpO1xudmFyIHRpbWVycyA9IHJlcXVpcmUoXCIuL2ltcGwvdGltZXJzXCIpO1xuXG5mdW5jdGlvbiBzcGF3bihnZW4sIGNyZWF0b3IpIHtcbiAgdmFyIGNoID0gY2hhbm5lbHMuY2hhbihidWZmZXJzLmZpeGVkKDEpKTtcbiAgKG5ldyBwcm9jZXNzLlByb2Nlc3MoZ2VuLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gY2hhbm5lbHMuQ0xPU0VEKSB7XG4gICAgICBjaC5jbG9zZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwcm9jZXNzLnB1dF90aGVuX2NhbGxiYWNrKGNoLCB2YWx1ZSwgZnVuY3Rpb24ob2spIHtcbiAgICAgICAgY2guY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwgY3JlYXRvcikpLnJ1bigpO1xuICByZXR1cm4gY2g7XG59O1xuXG5mdW5jdGlvbiBnbyhmLCBhcmdzKSB7XG4gIGFyZ3MgPSBhcmdzIHx8IFtdO1xuXG4gIHZhciBnZW4gPSBmLmFwcGx5KG51bGwsIGFyZ3MpO1xuICByZXR1cm4gc3Bhd24oZ2VuLCBmKTtcbn07XG5cbmZ1bmN0aW9uIGNoYW4oYnVmZmVyT3JOdW1iZXIsIHhmb3JtLCBleEhhbmRsZXIpIHtcbiAgdmFyIGJ1ZjtcbiAgaWYgKGJ1ZmZlck9yTnVtYmVyID09PSAwKSB7XG4gICAgYnVmZmVyT3JOdW1iZXIgPSBudWxsO1xuICB9XG4gIGlmICh0eXBlb2YgYnVmZmVyT3JOdW1iZXIgPT09IFwibnVtYmVyXCIpIHtcbiAgICBidWYgPSBidWZmZXJzLmZpeGVkKGJ1ZmZlck9yTnVtYmVyKTtcbiAgfSBlbHNlIHtcbiAgICBidWYgPSBidWZmZXJPck51bWJlcjtcbiAgfVxuICByZXR1cm4gY2hhbm5lbHMuY2hhbihidWYsIHhmb3JtLCBleEhhbmRsZXIpO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVmZmVyczoge1xuICAgIGZpeGVkOiBidWZmZXJzLmZpeGVkLFxuICAgIGRyb3BwaW5nOiBidWZmZXJzLmRyb3BwaW5nLFxuICAgIHNsaWRpbmc6IGJ1ZmZlcnMuc2xpZGluZ1xuICB9LFxuXG4gIHNwYXduOiBzcGF3bixcbiAgZ286IGdvLFxuICBjaGFuOiBjaGFuLFxuICBERUZBVUxUOiBzZWxlY3QuREVGQVVMVCxcbiAgQ0xPU0VEOiBjaGFubmVscy5DTE9TRUQsXG5cbiAgcHV0OiBwcm9jZXNzLnB1dCxcbiAgdGFrZTogcHJvY2Vzcy50YWtlLFxuICBvZmZlcjogcHJvY2Vzcy5vZmZlcixcbiAgcG9sbDogcHJvY2Vzcy5wb2xsLFxuICBzbGVlcDogcHJvY2Vzcy5zbGVlcCxcbiAgYWx0czogcHJvY2Vzcy5hbHRzLFxuICBwdXRBc3luYzogcHJvY2Vzcy5wdXRfdGhlbl9jYWxsYmFjayxcbiAgdGFrZUFzeW5jOiBwcm9jZXNzLnRha2VfdGhlbl9jYWxsYmFjayxcbiAgTk9fVkFMVUU6IHByb2Nlc3MuTk9fVkFMVUUsXG5cbiAgdGltZW91dDogdGltZXJzLnRpbWVvdXRcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGNzcCA9IHJlcXVpcmUoXCIuL2NzcC5jb3JlXCIpO1xudmFyIG9wZXJhdGlvbnMgPSByZXF1aXJlKFwiLi9jc3Aub3BlcmF0aW9uc1wiKTtcbnZhciBwaXBlbGluZSA9IHJlcXVpcmUoJy4vY3NwLnBpcGVsaW5lJyk7XG5cbmNzcC5vcGVyYXRpb25zID0gb3BlcmF0aW9ucztcbmNzcC5vcGVyYXRpb25zLnBpcGVsaW5lID0gcGlwZWxpbmUucGlwZWxpbmU7XG5jc3Aub3BlcmF0aW9ucy5waXBlbGluZUFzeW5jID0gcGlwZWxpbmUucGlwZWxpbmVBc3luYztcblxubW9kdWxlLmV4cG9ydHMgPSBjc3A7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIEJveCA9IHJlcXVpcmUoXCIuL2ltcGwvY2hhbm5lbHNcIikuQm94O1xuXG52YXIgY3NwID0gcmVxdWlyZShcIi4vY3NwLmNvcmVcIiksXG4gICAgZ28gPSBjc3AuZ28sXG4gICAgdGFrZSA9IGNzcC50YWtlLFxuICAgIHB1dCA9IGNzcC5wdXQsXG4gICAgdGFrZUFzeW5jID0gY3NwLnRha2VBc3luYyxcbiAgICBwdXRBc3luYyA9IGNzcC5wdXRBc3luYyxcbiAgICBhbHRzID0gY3NwLmFsdHMsXG4gICAgY2hhbiA9IGNzcC5jaGFuLFxuICAgIENMT1NFRCA9IGNzcC5DTE9TRUQ7XG5cblxuZnVuY3Rpb24gbWFwRnJvbShmLCBjaCkge1xuICByZXR1cm4ge1xuICAgIGlzX2Nsb3NlZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gY2guaXNfY2xvc2VkKCk7XG4gICAgfSxcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICBjaC5jbG9zZSgpO1xuICAgIH0sXG4gICAgX3B1dDogZnVuY3Rpb24odmFsdWUsIGhhbmRsZXIpIHtcbiAgICAgIHJldHVybiBjaC5fcHV0KHZhbHVlLCBoYW5kbGVyKTtcbiAgICB9LFxuICAgIF90YWtlOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gY2guX3Rha2Uoe1xuICAgICAgICBpc19hY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBoYW5kbGVyLmlzX2FjdGl2ZSgpO1xuICAgICAgICB9LFxuICAgICAgICBjb21taXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciB0YWtlX2NiID0gaGFuZGxlci5jb21taXQoKTtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0YWtlX2NiKHZhbHVlID09PSBDTE9TRUQgPyBDTE9TRUQgOiBmKHZhbHVlKSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHJlc3VsdC52YWx1ZTtcbiAgICAgICAgcmV0dXJuIG5ldyBCb3godmFsdWUgPT09IENMT1NFRCA/IENMT1NFRCA6IGYodmFsdWUpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFwSW50byhmLCBjaCkge1xuICByZXR1cm4ge1xuICAgIGlzX2Nsb3NlZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gY2guaXNfY2xvc2VkKCk7XG4gICAgfSxcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICBjaC5jbG9zZSgpO1xuICAgIH0sXG4gICAgX3B1dDogZnVuY3Rpb24odmFsdWUsIGhhbmRsZXIpIHtcbiAgICAgIHJldHVybiBjaC5fcHV0KGYodmFsdWUpLCBoYW5kbGVyKTtcbiAgICB9LFxuICAgIF90YWtlOiBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICByZXR1cm4gY2guX3Rha2UoaGFuZGxlcik7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJGcm9tKHAsIGNoLCBidWZmZXJPck4pIHtcbiAgdmFyIG91dCA9IGNoYW4oYnVmZmVyT3JOKTtcbiAgZ28oZnVuY3Rpb24qKCkge1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgdmFsdWUgPSB5aWVsZCB0YWtlKGNoKTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gQ0xPU0VEKSB7XG4gICAgICAgIG91dC5jbG9zZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChwKHZhbHVlKSkge1xuICAgICAgICB5aWVsZCBwdXQob3V0LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gZmlsdGVySW50byhwLCBjaCkge1xuICByZXR1cm4ge1xuICAgIGlzX2Nsb3NlZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gY2guaXNfY2xvc2VkKCk7XG4gICAgfSxcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICBjaC5jbG9zZSgpO1xuICAgIH0sXG4gICAgX3B1dDogZnVuY3Rpb24odmFsdWUsIGhhbmRsZXIpIHtcbiAgICAgIGlmIChwKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gY2guX3B1dCh2YWx1ZSwgaGFuZGxlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IEJveCghY2guaXNfY2xvc2VkKCkpO1xuICAgICAgfVxuICAgIH0sXG4gICAgX3Rha2U6IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgIHJldHVybiBjaC5fdGFrZShoYW5kbGVyKTtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUZyb20ocCwgY2gpIHtcbiAgcmV0dXJuIGZpbHRlckZyb20oZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gIXAodmFsdWUpO1xuICB9LCBjaCk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUludG8ocCwgY2gpIHtcbiAgcmV0dXJuIGZpbHRlckludG8oZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gIXAodmFsdWUpO1xuICB9LCBjaCk7XG59XG5cbmZ1bmN0aW9uKiBtYXBjYXQoZiwgc3JjLCBkc3QpIHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgdmFsdWUgPSB5aWVsZCB0YWtlKHNyYyk7XG4gICAgaWYgKHZhbHVlID09PSBDTE9TRUQpIHtcbiAgICAgIGRzdC5jbG9zZSgpO1xuICAgICAgYnJlYWs7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzZXEgPSBmKHZhbHVlKTtcbiAgICAgIHZhciBsZW5ndGggPSBzZXEubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB5aWVsZCBwdXQoZHN0LCBzZXFbaV0pO1xuICAgICAgfVxuICAgICAgaWYgKGRzdC5pc19jbG9zZWQoKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFwY2F0RnJvbShmLCBjaCwgYnVmZmVyT3JOKSB7XG4gIHZhciBvdXQgPSBjaGFuKGJ1ZmZlck9yTik7XG4gIGdvKG1hcGNhdCwgW2YsIGNoLCBvdXRdKTtcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gbWFwY2F0SW50byhmLCBjaCwgYnVmZmVyT3JOKSB7XG4gIHZhciBzcmMgPSBjaGFuKGJ1ZmZlck9yTik7XG4gIGdvKG1hcGNhdCwgW2YsIHNyYywgY2hdKTtcbiAgcmV0dXJuIHNyYztcbn1cblxuZnVuY3Rpb24gcGlwZShzcmMsIGRzdCwga2VlcE9wZW4pIHtcbiAgZ28oZnVuY3Rpb24qKCkge1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgdmFsdWUgPSB5aWVsZCB0YWtlKHNyYyk7XG4gICAgICBpZiAodmFsdWUgPT09IENMT1NFRCkge1xuICAgICAgICBpZiAoIWtlZXBPcGVuKSB7XG4gICAgICAgICAgZHN0LmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoISh5aWVsZCBwdXQoZHN0LCB2YWx1ZSkpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBkc3Q7XG59XG5cbmZ1bmN0aW9uIHNwbGl0KHAsIGNoLCB0cnVlQnVmZmVyT3JOLCBmYWxzZUJ1ZmZlck9yTikge1xuICB2YXIgdGNoID0gY2hhbih0cnVlQnVmZmVyT3JOKTtcbiAgdmFyIGZjaCA9IGNoYW4oZmFsc2VCdWZmZXJPck4pO1xuICBnbyhmdW5jdGlvbiooKSB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciB2YWx1ZSA9IHlpZWxkIHRha2UoY2gpO1xuICAgICAgaWYgKHZhbHVlID09PSBDTE9TRUQpIHtcbiAgICAgICAgdGNoLmNsb3NlKCk7XG4gICAgICAgIGZjaC5jbG9zZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHlpZWxkIHB1dChwKHZhbHVlKSA/IHRjaCA6IGZjaCwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBbdGNoLCBmY2hdO1xufVxuXG5mdW5jdGlvbiByZWR1Y2UoZiwgaW5pdCwgY2gpIHtcbiAgcmV0dXJuIGdvKGZ1bmN0aW9uKigpIHtcbiAgICB2YXIgcmVzdWx0ID0gaW5pdDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdmFyIHZhbHVlID0geWllbGQgdGFrZShjaCk7XG4gICAgICBpZiAodmFsdWUgPT09IENMT1NFRCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gZihyZXN1bHQsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIFtdLCB0cnVlKTtcbn1cblxuZnVuY3Rpb24gb250byhjaCwgY29sbCwga2VlcE9wZW4pIHtcbiAgcmV0dXJuIGdvKGZ1bmN0aW9uKigpIHtcbiAgICB2YXIgbGVuZ3RoID0gY29sbC5sZW5ndGg7XG4gICAgLy8gRklYOiBTaG91bGQgYmUgYSBnZW5lcmljIGxvb3BpbmcgaW50ZXJmYWNlIChmb3IuLi5pbj8pXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgeWllbGQgcHV0KGNoLCBjb2xsW2ldKTtcbiAgICB9XG4gICAgaWYgKCFrZWVwT3Blbikge1xuICAgICAgY2guY2xvc2UoKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vLyBUT0RPOiBCb3VuZGVkP1xuZnVuY3Rpb24gZnJvbUNvbGwoY29sbCkge1xuICB2YXIgY2ggPSBjaGFuKGNvbGwubGVuZ3RoKTtcbiAgb250byhjaCwgY29sbCk7XG4gIHJldHVybiBjaDtcbn1cblxuZnVuY3Rpb24gbWFwKGYsIGNocywgYnVmZmVyT3JOKSB7XG4gIHZhciBvdXQgPSBjaGFuKGJ1ZmZlck9yTik7XG4gIHZhciBsZW5ndGggPSBjaHMubGVuZ3RoO1xuICAvLyBBcnJheSBob2xkaW5nIDEgcm91bmQgb2YgdmFsdWVzXG4gIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgLy8gVE9ETzogTm90IHN1cmUgd2h5IHdlIG5lZWQgYSBzaXplLTEgYnVmZmVyIGhlcmVcbiAgdmFyIGRjaGFuID0gY2hhbigxKTtcbiAgLy8gSG93IG1hbnkgbW9yZSBpdGVtcyB0aGlzIHJvdW5kXG4gIHZhciBkY291bnQ7XG4gIC8vIHB1dCBjYWxsYmFja3MgZm9yIGVhY2ggY2hhbm5lbFxuICB2YXIgZGNhbGxiYWNrcyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArKykge1xuICAgIGRjYWxsYmFja3NbaV0gPSAoZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHZhbHVlc1tpXSA9IHZhbHVlO1xuICAgICAgICBkY291bnQgLS07XG4gICAgICAgIGlmIChkY291bnQgPT09IDApIHtcbiAgICAgICAgICBwdXRBc3luYyhkY2hhbiwgdmFsdWVzLnNsaWNlKDApKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KGkpKTtcbiAgfVxuICBnbyhmdW5jdGlvbiooKSB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGRjb3VudCA9IGxlbmd0aDtcbiAgICAgIC8vIFdlIGNvdWxkIGp1c3QgbGF1bmNoIG4gZ29yb3V0aW5lcyBoZXJlLCBidXQgZm9yIGVmZmNpZW5jeSB3ZVxuICAgICAgLy8gZG9uJ3RcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICsrKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGFrZUFzeW5jKGNoc1tpXSwgZGNhbGxiYWNrc1tpXSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBGSVg6IEhtbSB3aHkgY2F0Y2hpbmcgaGVyZT9cbiAgICAgICAgICBkY291bnQgLS07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciB2YWx1ZXMgPSB5aWVsZCB0YWtlKGRjaGFuKTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkgKyspIHtcbiAgICAgICAgaWYgKHZhbHVlc1tpXSA9PT0gQ0xPU0VEKSB7XG4gICAgICAgICAgb3V0LmNsb3NlKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB5aWVsZCBwdXQob3V0LCBmLmFwcGx5KG51bGwsIHZhbHVlcykpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIG1lcmdlKGNocywgYnVmZmVyT3JOKSB7XG4gIHZhciBvdXQgPSBjaGFuKGJ1ZmZlck9yTik7XG4gIHZhciBhY3RpdmVzID0gY2hzLnNsaWNlKDApO1xuICBnbyhmdW5jdGlvbiooKSB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChhY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhciByID0geWllbGQgYWx0cyhhY3RpdmVzKTtcbiAgICAgIHZhciB2YWx1ZSA9IHIudmFsdWU7XG4gICAgICBpZiAodmFsdWUgPT09IENMT1NFRCkge1xuICAgICAgICAvLyBSZW1vdmUgY2xvc2VkIGNoYW5uZWxcbiAgICAgICAgdmFyIGkgPSBhY3RpdmVzLmluZGV4T2Yoci5jaGFubmVsKTtcbiAgICAgICAgYWN0aXZlcy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgeWllbGQgcHV0KG91dCwgdmFsdWUpO1xuICAgIH1cbiAgICBvdXQuY2xvc2UoKTtcbiAgfSk7XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIGludG8oY29sbCwgY2gpIHtcbiAgdmFyIHJlc3VsdCA9IGNvbGwuc2xpY2UoMCk7XG4gIHJldHVybiByZWR1Y2UoZnVuY3Rpb24ocmVzdWx0LCBpdGVtKSB7XG4gICAgcmVzdWx0LnB1c2goaXRlbSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSwgcmVzdWx0LCBjaCk7XG59XG5cbmZ1bmN0aW9uIHRha2VOKG4sIGNoLCBidWZmZXJPck4pIHtcbiAgdmFyIG91dCA9IGNoYW4oYnVmZmVyT3JOKTtcbiAgZ28oZnVuY3Rpb24qKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSArKykge1xuICAgICAgdmFyIHZhbHVlID0geWllbGQgdGFrZShjaCk7XG4gICAgICBpZiAodmFsdWUgPT09IENMT1NFRCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHlpZWxkIHB1dChvdXQsIHZhbHVlKTtcbiAgICB9XG4gICAgb3V0LmNsb3NlKCk7XG4gIH0pO1xuICByZXR1cm4gb3V0O1xufVxuXG52YXIgTk9USElORyA9IHt9O1xuXG5mdW5jdGlvbiB1bmlxdWUoY2gsIGJ1ZmZlck9yTikge1xuICB2YXIgb3V0ID0gY2hhbihidWZmZXJPck4pO1xuICB2YXIgbGFzdCA9IE5PVEhJTkc7XG4gIGdvKGZ1bmN0aW9uKigpIHtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdmFyIHZhbHVlID0geWllbGQgdGFrZShjaCk7XG4gICAgICBpZiAodmFsdWUgPT09IENMT1NFRCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gbGFzdCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGxhc3QgPSB2YWx1ZTtcbiAgICAgIHlpZWxkIHB1dChvdXQsIHZhbHVlKTtcbiAgICB9XG4gICAgb3V0LmNsb3NlKCk7XG4gIH0pO1xuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBwYXJ0aXRpb25CeShmLCBjaCwgYnVmZmVyT3JOKSB7XG4gIHZhciBvdXQgPSBjaGFuKGJ1ZmZlck9yTik7XG4gIHZhciBwYXJ0ID0gW107XG4gIHZhciBsYXN0ID0gTk9USElORztcbiAgZ28oZnVuY3Rpb24qKCkge1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgdmFsdWUgPSB5aWVsZCB0YWtlKGNoKTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gQ0xPU0VEKSB7XG4gICAgICAgIGlmIChwYXJ0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB5aWVsZCBwdXQob3V0LCBwYXJ0KTtcbiAgICAgICAgfVxuICAgICAgICBvdXQuY2xvc2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbmV3SXRlbSA9IGYodmFsdWUpO1xuICAgICAgICBpZiAobmV3SXRlbSA9PT0gbGFzdCB8fCBsYXN0ID09PSBOT1RISU5HKSB7XG4gICAgICAgICAgcGFydC5wdXNoKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB5aWVsZCBwdXQob3V0LCBwYXJ0KTtcbiAgICAgICAgICBwYXJ0ID0gW3ZhbHVlXTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0ID0gbmV3SXRlbTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBwYXJ0aXRpb24obiwgY2gsIGJ1ZmZlck9yTikge1xuICB2YXIgb3V0ID0gY2hhbihidWZmZXJPck4pO1xuICBnbyhmdW5jdGlvbiooKSB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciBwYXJ0ID0gbmV3IEFycmF5KG4pO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0geWllbGQgdGFrZShjaCk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gQ0xPU0VEKSB7XG4gICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICB5aWVsZCBwdXQob3V0LCBwYXJ0LnNsaWNlKDAsIGkpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0LmNsb3NlKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHBhcnRbaV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHlpZWxkIHB1dChvdXQsIHBhcnQpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIEZvciBjaGFubmVsIGlkZW50aWZpY2F0aW9uXG52YXIgZ2VuSWQgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBpID0gMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGkgKys7XG4gICAgcmV0dXJuIFwiXCIgKyBpO1xuICB9O1xufSkoKTtcblxudmFyIElEX0FUVFIgPSBcIl9fY3NwX2NoYW5uZWxfaWRcIjtcblxuLy8gVE9ETzogRG8gd2UgbmVlZCB0byBjaGVjayB3aXRoIGhhc093blByb3BlcnR5P1xuZnVuY3Rpb24gbGVuKG9iaikge1xuICB2YXIgY291bnQgPSAwO1xuICBmb3IgKHZhciBwIGluIG9iaikge1xuICAgIGNvdW50ICsrO1xuICB9XG4gIHJldHVybiBjb3VudDtcbn1cblxuZnVuY3Rpb24gY2hhbklkKGNoKSB7XG4gIHZhciBpZCA9IGNoW0lEX0FUVFJdO1xuICBpZiAoaWQgPT09IHVuZGVmaW5lZCkge1xuICAgIGlkID0gY2hbSURfQVRUUl0gPSBnZW5JZCgpO1xuICB9XG4gIHJldHVybiBpZDtcbn1cblxudmFyIE11bHQgPSBmdW5jdGlvbihjaCkge1xuICB0aGlzLnRhcHMgPSB7fTtcbiAgdGhpcy5jaCA9IGNoO1xufTtcblxudmFyIFRhcCA9IGZ1bmN0aW9uKGNoYW5uZWwsIGtlZXBPcGVuKSB7XG4gIHRoaXMuY2hhbm5lbCA9IGNoYW5uZWw7XG4gIHRoaXMua2VlcE9wZW4gPSBrZWVwT3Blbjtcbn07XG5cbk11bHQucHJvdG90eXBlLm11eGNoID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmNoO1xufTtcblxuTXVsdC5wcm90b3R5cGUudGFwID0gZnVuY3Rpb24oY2gsIGtlZXBPcGVuKSB7XG4gIHZhciBpZCA9IGNoYW5JZChjaCk7XG4gIHRoaXMudGFwc1tpZF0gPSBuZXcgVGFwKGNoLCBrZWVwT3Blbik7XG59O1xuXG5NdWx0LnByb3RvdHlwZS51bnRhcCA9IGZ1bmN0aW9uKGNoKSB7XG4gIGRlbGV0ZSB0aGlzLnRhcHNbY2hhbklkKGNoKV07XG59O1xuXG5NdWx0LnByb3RvdHlwZS51bnRhcEFsbCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnRhcHMgPSB7fTtcbn07XG5cbmZ1bmN0aW9uIG11bHQoY2gpIHtcbiAgdmFyIG0gPSBuZXcgTXVsdChjaCk7XG4gIHZhciBkY2hhbiA9IGNoYW4oMSk7XG4gIHZhciBkY291bnQ7XG4gIGZ1bmN0aW9uIG1ha2VEb25lQ2FsbGJhY2sodGFwKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHN0aWxsT3Blbikge1xuICAgICAgZGNvdW50IC0tO1xuICAgICAgaWYgKGRjb3VudCA9PT0gMCkge1xuICAgICAgICBwdXRBc3luYyhkY2hhbiwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBpZiAoIXN0aWxsT3Blbikge1xuICAgICAgICBtLnVudGFwKHRhcC5jaGFubmVsKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGdvKGZ1bmN0aW9uKigpIHtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdmFyIHZhbHVlID0geWllbGQgdGFrZShjaCk7XG4gICAgICB2YXIgaWQsIHQ7XG4gICAgICB2YXIgdGFwcyA9IG0udGFwcztcbiAgICAgIGlmICh2YWx1ZSA9PT0gQ0xPU0VEKSB7XG4gICAgICAgIGZvciAoaWQgaW4gdGFwcykge1xuICAgICAgICAgIHQgPSB0YXBzW2lkXTtcbiAgICAgICAgICBpZiAoIXQua2VlcE9wZW4pIHtcbiAgICAgICAgICAgIHQuY2hhbm5lbC5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPOiBJcyB0aGlzIG5lY2Vzc2FyeT9cbiAgICAgICAgbS51bnRhcEFsbCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGRjb3VudCA9IGxlbih0YXBzKTtcbiAgICAgIC8vIFhYWDogVGhpcyBpcyBiZWNhdXNlIHB1dEFzeW5jIGNhbiBhY3R1YWxseSBjYWxsIGJhY2tcbiAgICAgIC8vIGltbWVkaWF0ZWx5LiBGaXggdGhhdFxuICAgICAgdmFyIGluaXREY291bnQgPSBkY291bnQ7XG4gICAgICAvLyBQdXQgdmFsdWUgb24gdGFwcGluZyBjaGFubmVscy4uLlxuICAgICAgZm9yIChpZCBpbiB0YXBzKSB7XG4gICAgICAgIHQgPSB0YXBzW2lkXTtcbiAgICAgICAgcHV0QXN5bmModC5jaGFubmVsLCB2YWx1ZSwgbWFrZURvbmVDYWxsYmFjayh0KSk7XG4gICAgICB9XG4gICAgICAvLyAuLi4gd2FpdGluZyBmb3IgYWxsIHB1dHMgdG8gY29tcGxldGVcbiAgICAgIGlmIChpbml0RGNvdW50ID4gMCkge1xuICAgICAgICB5aWVsZCB0YWtlKGRjaGFuKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbTtcbn1cblxubXVsdC50YXAgPSBmdW5jdGlvbiB0YXAobSwgY2gsIGtlZXBPcGVuKSB7XG4gIG0udGFwKGNoLCBrZWVwT3Blbik7XG4gIHJldHVybiBjaDtcbn07XG5cbm11bHQudW50YXAgPSBmdW5jdGlvbiB1bnRhcChtLCBjaCkge1xuICBtLnVudGFwKGNoKTtcbn07XG5cbm11bHQudW50YXBBbGwgPSBmdW5jdGlvbiB1bnRhcEFsbChtKSB7XG4gIG0udW50YXBBbGwoKTtcbn07XG5cbnZhciBNaXggPSBmdW5jdGlvbihjaCkge1xuICB0aGlzLmNoID0gY2g7XG4gIHRoaXMuc3RhdGVNYXAgPSB7fTtcbiAgdGhpcy5jaGFuZ2UgPSBjaGFuKCk7XG4gIHRoaXMuc29sb01vZGUgPSBtaXguTVVURTtcbn07XG5cbk1peC5wcm90b3R5cGUuX2NoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgcHV0QXN5bmModGhpcy5jaGFuZ2UsIHRydWUpO1xufTtcblxuTWl4LnByb3RvdHlwZS5fZ2V0QWxsU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFsbFN0YXRlID0ge307XG4gIHZhciBzdGF0ZU1hcCA9IHRoaXMuc3RhdGVNYXA7XG4gIHZhciBzb2xvcyA9IFtdO1xuICB2YXIgbXV0ZXMgPSBbXTtcbiAgdmFyIHBhdXNlcyA9IFtdO1xuICB2YXIgcmVhZHM7XG4gIGZvciAodmFyIGlkIGluIHN0YXRlTWFwKSB7XG4gICAgdmFyIGNoYW5EYXRhID0gc3RhdGVNYXBbaWRdO1xuICAgIHZhciBzdGF0ZSA9IGNoYW5EYXRhLnN0YXRlO1xuICAgIHZhciBjaGFubmVsID0gY2hhbkRhdGEuY2hhbm5lbDtcbiAgICBpZiAoc3RhdGVbbWl4LlNPTE9dKSB7XG4gICAgICBzb2xvcy5wdXNoKGNoYW5uZWwpO1xuICAgIH1cbiAgICAvLyBUT0RPXG4gICAgaWYgKHN0YXRlW21peC5NVVRFXSkge1xuICAgICAgbXV0ZXMucHVzaChjaGFubmVsKTtcbiAgICB9XG4gICAgaWYgKHN0YXRlW21peC5QQVVTRV0pIHtcbiAgICAgIHBhdXNlcy5wdXNoKGNoYW5uZWwpO1xuICAgIH1cbiAgfVxuICB2YXIgaSwgbjtcbiAgaWYgKHRoaXMuc29sb01vZGUgPT09IG1peC5QQVVTRSAmJiBzb2xvcy5sZW5ndGggPiAwKSB7XG4gICAgbiA9IHNvbG9zLmxlbmd0aDtcbiAgICByZWFkcyA9IG5ldyBBcnJheShuICsgMSk7XG4gICAgZm9yIChpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgcmVhZHNbaV0gPSBzb2xvc1tpXTtcbiAgICB9XG4gICAgcmVhZHNbbl0gPSB0aGlzLmNoYW5nZTtcbiAgfSBlbHNlIHtcbiAgICByZWFkcyA9IFtdO1xuICAgIGZvciAoaWQgaW4gc3RhdGVNYXApIHtcbiAgICAgIGNoYW5EYXRhID0gc3RhdGVNYXBbaWRdO1xuICAgICAgY2hhbm5lbCA9IGNoYW5EYXRhLmNoYW5uZWw7XG4gICAgICBpZiAocGF1c2VzLmluZGV4T2YoY2hhbm5lbCkgPCAwKSB7XG4gICAgICAgIHJlYWRzLnB1c2goY2hhbm5lbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJlYWRzLnB1c2godGhpcy5jaGFuZ2UpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzb2xvczogc29sb3MsXG4gICAgbXV0ZXM6IG11dGVzLFxuICAgIHJlYWRzOiByZWFkc1xuICB9O1xufTtcblxuTWl4LnByb3RvdHlwZS5hZG1peCA9IGZ1bmN0aW9uKGNoKSB7XG4gIHRoaXMuc3RhdGVNYXBbY2hhbklkKGNoKV0gPSB7XG4gICAgY2hhbm5lbDogY2gsXG4gICAgc3RhdGU6IHt9XG4gIH07XG4gIHRoaXMuX2NoYW5nZWQoKTtcbn07XG5cbk1peC5wcm90b3R5cGUudW5taXggPSBmdW5jdGlvbihjaCkge1xuICBkZWxldGUgdGhpcy5zdGF0ZU1hcFtjaGFuSWQoY2gpXTtcbiAgdGhpcy5fY2hhbmdlZCgpO1xufTtcblxuTWl4LnByb3RvdHlwZS51bm1peEFsbCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnN0YXRlTWFwID0ge307XG4gIHRoaXMuX2NoYW5nZWQoKTtcbn07XG5cbk1peC5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24odXBkYXRlU3RhdGVMaXN0KSB7XG4gIC8vIFtbY2gxLCB7fV0sIFtjaDIsIHtzb2xvOiB0cnVlfV1dO1xuICB2YXIgbGVuZ3RoID0gdXBkYXRlU3RhdGVMaXN0Lmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBjaCA9IHVwZGF0ZVN0YXRlTGlzdFtpXVswXTtcbiAgICB2YXIgaWQgPSBjaGFuSWQoY2gpO1xuICAgIHZhciB1cGRhdGVTdGF0ZSA9IHVwZGF0ZVN0YXRlTGlzdFtpXVsxXTtcbiAgICB2YXIgY2hhbkRhdGEgPSB0aGlzLnN0YXRlTWFwW2lkXTtcbiAgICBpZiAoIWNoYW5EYXRhKSB7XG4gICAgICBjaGFuRGF0YSA9IHRoaXMuc3RhdGVNYXBbaWRdID0ge1xuICAgICAgICBjaGFubmVsOiBjaCxcbiAgICAgICAgc3RhdGU6IHt9XG4gICAgICB9O1xuICAgIH1cbiAgICBmb3IgKHZhciBtb2RlIGluIHVwZGF0ZVN0YXRlKSB7XG4gICAgICBjaGFuRGF0YS5zdGF0ZVttb2RlXSA9IHVwZGF0ZVN0YXRlW21vZGVdO1xuICAgIH1cbiAgfVxuICB0aGlzLl9jaGFuZ2VkKCk7XG59O1xuXG5NaXgucHJvdG90eXBlLnNldFNvbG9Nb2RlID0gZnVuY3Rpb24obW9kZSkge1xuICBpZiAoVkFMSURfU09MT19NT0RFUy5pbmRleE9mKG1vZGUpIDwgMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1vZGUgbXVzdCBiZSBvbmUgb2Y6IFwiLCBWQUxJRF9TT0xPX01PREVTLmpvaW4oXCIsIFwiKSk7XG4gIH1cbiAgdGhpcy5zb2xvTW9kZSA9IG1vZGU7XG4gIHRoaXMuX2NoYW5nZWQoKTtcbn07XG5cbmZ1bmN0aW9uIG1peChvdXQpIHtcbiAgdmFyIG0gPSBuZXcgTWl4KG91dCk7XG4gIGdvKGZ1bmN0aW9uKigpIHtcbiAgICB2YXIgc3RhdGUgPSBtLl9nZXRBbGxTdGF0ZSgpO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgcmVzdWx0ID0geWllbGQgYWx0cyhzdGF0ZS5yZWFkcyk7XG4gICAgICB2YXIgdmFsdWUgPSByZXN1bHQudmFsdWU7XG4gICAgICB2YXIgY2hhbm5lbCA9IHJlc3VsdC5jaGFubmVsO1xuICAgICAgaWYgKHZhbHVlID09PSBDTE9TRUQpIHtcbiAgICAgICAgZGVsZXRlIG0uc3RhdGVNYXBbY2hhbklkKGNoYW5uZWwpXTtcbiAgICAgICAgc3RhdGUgPSBtLl9nZXRBbGxTdGF0ZSgpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChjaGFubmVsID09PSBtLmNoYW5nZSkge1xuICAgICAgICBzdGF0ZSA9IG0uX2dldEFsbFN0YXRlKCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIHNvbG9zID0gc3RhdGUuc29sb3M7XG4gICAgICBpZiAoc29sb3MuaW5kZXhPZihjaGFubmVsKSA+IC0xIHx8XG4gICAgICAgICAgKHNvbG9zLmxlbmd0aCA9PT0gMCAmJiAhKHN0YXRlLm11dGVzLmluZGV4T2YoY2hhbm5lbCkgPiAtMSkpKSB7XG4gICAgICAgIHZhciBzdGlsbE9wZW4gPSB5aWVsZCBwdXQob3V0LCB2YWx1ZSk7XG4gICAgICAgIGlmICghc3RpbGxPcGVuKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbTtcbn1cblxubWl4Lk1VVEUgPSBcIm11dGVcIjtcbm1peC5QQVVTRSA9IFwicGF1c2VcIjtcbm1peC5TT0xPID0gXCJzb2xvXCI7XG52YXIgVkFMSURfU09MT19NT0RFUyA9IFttaXguTVVURSwgbWl4LlBBVVNFXTtcblxubWl4LmFkZCA9IGZ1bmN0aW9uIGFkbWl4KG0sIGNoKSB7XG4gIG0uYWRtaXgoY2gpO1xufTtcblxubWl4LnJlbW92ZSA9IGZ1bmN0aW9uIHVubWl4KG0sIGNoKSB7XG4gIG0udW5taXgoY2gpO1xufTtcblxubWl4LnJlbW92ZUFsbCA9IGZ1bmN0aW9uIHVubWl4QWxsKG0pIHtcbiAgbS51bm1peEFsbCgpO1xufTtcblxubWl4LnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZShtLCB1cGRhdGVTdGF0ZUxpc3QpIHtcbiAgbS50b2dnbGUodXBkYXRlU3RhdGVMaXN0KTtcbn07XG5cbm1peC5zZXRTb2xvTW9kZSA9IGZ1bmN0aW9uIHNldFNvbG9Nb2RlKG0sIG1vZGUpIHtcbiAgbS5zZXRTb2xvTW9kZShtb2RlKTtcbn07XG5cbmZ1bmN0aW9uIGNvbnN0YW50bHlOdWxsKCkge1xuICByZXR1cm4gbnVsbDtcbn1cblxudmFyIFB1YiA9IGZ1bmN0aW9uKGNoLCB0b3BpY0ZuLCBidWZmZXJGbikge1xuICB0aGlzLmNoID0gY2g7XG4gIHRoaXMudG9waWNGbiA9IHRvcGljRm47XG4gIHRoaXMuYnVmZmVyRm4gPSBidWZmZXJGbjtcbiAgdGhpcy5tdWx0cyA9IHt9O1xufTtcblxuUHViLnByb3RvdHlwZS5fZW5zdXJlTXVsdCA9IGZ1bmN0aW9uKHRvcGljKSB7XG4gIHZhciBtID0gdGhpcy5tdWx0c1t0b3BpY107XG4gIHZhciBidWZmZXJGbiA9IHRoaXMuYnVmZmVyRm47XG4gIGlmICghbSkge1xuICAgIG0gPSB0aGlzLm11bHRzW3RvcGljXSA9IG11bHQoY2hhbihidWZmZXJGbih0b3BpYykpKTtcbiAgfVxuICByZXR1cm4gbTtcbn07XG5cblB1Yi5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24odG9waWMsIGNoLCBrZWVwT3Blbikge1xuICB2YXIgbSA9IHRoaXMuX2Vuc3VyZU11bHQodG9waWMpO1xuICByZXR1cm4gbXVsdC50YXAobSwgY2gsIGtlZXBPcGVuKTtcbn07XG5cblB1Yi5wcm90b3R5cGUudW5zdWIgPSBmdW5jdGlvbih0b3BpYywgY2gpIHtcbiAgdmFyIG0gPSB0aGlzLm11bHRzW3RvcGljXTtcbiAgaWYgKG0pIHtcbiAgICBtdWx0LnVudGFwKG0sIGNoKTtcbiAgfVxufTtcblxuUHViLnByb3RvdHlwZS51bnN1YkFsbCA9IGZ1bmN0aW9uKHRvcGljKSB7XG4gIGlmICh0b3BpYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5tdWx0cyA9IHt9O1xuICB9IGVsc2Uge1xuICAgIGRlbGV0ZSB0aGlzLm11bHRzW3RvcGljXTtcbiAgfVxufTtcblxuZnVuY3Rpb24gcHViKGNoLCB0b3BpY0ZuLCBidWZmZXJGbikge1xuICBidWZmZXJGbiA9IGJ1ZmZlckZuIHx8IGNvbnN0YW50bHlOdWxsO1xuICB2YXIgcCA9IG5ldyBQdWIoY2gsIHRvcGljRm4sIGJ1ZmZlckZuKTtcbiAgZ28oZnVuY3Rpb24qKCkge1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgdmFsdWUgPSB5aWVsZCB0YWtlKGNoKTtcbiAgICAgIHZhciBtdWx0cyA9IHAubXVsdHM7XG4gICAgICB2YXIgdG9waWM7XG4gICAgICBpZiAodmFsdWUgPT09IENMT1NFRCkge1xuICAgICAgICBmb3IgKHRvcGljIGluIG11bHRzKSB7XG4gICAgICAgICAgbXVsdHNbdG9waWNdLm11eGNoKCkuY2xvc2UoKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIC8vIFRPRE86IFNvbWVob3cgZW5zdXJlL2RvY3VtZW50IHRoYXQgdGhpcyBtdXN0IHJldHVybiBhIHN0cmluZ1xuICAgICAgLy8gKG90aGVyd2lzZSB1c2UgcHJvcGVyIChoYXNoKW1hcHMpXG4gICAgICB0b3BpYyA9IHRvcGljRm4odmFsdWUpO1xuICAgICAgdmFyIG0gPSBtdWx0c1t0b3BpY107XG4gICAgICBpZiAobSkge1xuICAgICAgICB2YXIgc3RpbGxPcGVuID0geWllbGQgcHV0KG0ubXV4Y2goKSwgdmFsdWUpO1xuICAgICAgICBpZiAoIXN0aWxsT3Blbikge1xuICAgICAgICAgIGRlbGV0ZSBtdWx0c1t0b3BpY107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcDtcbn1cblxucHViLnN1YiA9IGZ1bmN0aW9uIHN1YihwLCB0b3BpYywgY2gsIGtlZXBPcGVuKSB7XG4gIHJldHVybiBwLnN1Yih0b3BpYywgY2gsIGtlZXBPcGVuKTtcbn07XG5cbnB1Yi51bnN1YiA9IGZ1bmN0aW9uIHVuc3ViKHAsIHRvcGljLCBjaCkge1xuICBwLnVuc3ViKHRvcGljLCBjaCk7XG59O1xuXG5wdWIudW5zdWJBbGwgPSBmdW5jdGlvbiB1bnN1YkFsbChwLCB0b3BpYykge1xuICBwLnVuc3ViQWxsKHRvcGljKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtYXBGcm9tOiBtYXBGcm9tLFxuICBtYXBJbnRvOiBtYXBJbnRvLFxuICBmaWx0ZXJGcm9tOiBmaWx0ZXJGcm9tLFxuICBmaWx0ZXJJbnRvOiBmaWx0ZXJJbnRvLFxuICByZW1vdmVGcm9tOiByZW1vdmVGcm9tLFxuICByZW1vdmVJbnRvOiByZW1vdmVJbnRvLFxuICBtYXBjYXRGcm9tOiBtYXBjYXRGcm9tLFxuICBtYXBjYXRJbnRvOiBtYXBjYXRJbnRvLFxuXG4gIHBpcGU6IHBpcGUsXG4gIHNwbGl0OiBzcGxpdCxcbiAgcmVkdWNlOiByZWR1Y2UsXG4gIG9udG86IG9udG8sXG4gIGZyb21Db2xsOiBmcm9tQ29sbCxcblxuICBtYXA6IG1hcCxcbiAgbWVyZ2U6IG1lcmdlLFxuICBpbnRvOiBpbnRvLFxuICB0YWtlOiB0YWtlTixcbiAgdW5pcXVlOiB1bmlxdWUsXG4gIHBhcnRpdGlvbjogcGFydGl0aW9uLFxuICBwYXJ0aXRpb25CeTogcGFydGl0aW9uQnksXG5cbiAgbXVsdDogbXVsdCxcbiAgbWl4OiBtaXgsXG4gIHB1YjogcHViXG59O1xuXG5cbi8vIFBvc3NpYmxlIFwiZmx1aWRcIiBpbnRlcmZhY2VzOlxuXG4vLyB0aHJlYWQoXG4vLyAgIFtmcm9tQ29sbCwgWzEsIDIsIDMsIDRdXSxcbi8vICAgW21hcEZyb20sIGluY10sXG4vLyAgIFtpbnRvLCBbXV1cbi8vIClcblxuLy8gdGhyZWFkKFxuLy8gICBbZnJvbUNvbGwsIFsxLCAyLCAzLCA0XV0sXG4vLyAgIFttYXBGcm9tLCBpbmMsIF9dLFxuLy8gICBbaW50bywgW10sIF9dXG4vLyApXG5cbi8vIHdyYXAoKVxuLy8gICAuZnJvbUNvbGwoWzEsIDIsIDMsIDRdKVxuLy8gICAubWFwRnJvbShpbmMpXG4vLyAgIC5pbnRvKFtdKVxuLy8gICAudW53cmFwKCk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGNzcCA9IHJlcXVpcmUoJy4vY3NwLmNvcmUnKTtcblxuZnVuY3Rpb24gcGlwZWxpbmVJbnRlcm5hbChuLCB0bywgZnJvbSwgY2xvc2UsIHRhc2tGbikge1xuICBpZiAobiA8PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCduIG11c3QgYmUgcG9zaXRpdmUnKTtcbiAgfVxuXG4gIHZhciBqb2JzID0gY3NwLmNoYW4obik7XG4gIHZhciByZXN1bHRzID0gY3NwLmNoYW4obik7XG5cbiAgZm9yKHZhciBfID0gMDsgXyA8IG47IF8rKykge1xuICAgIGNzcC5nbyhmdW5jdGlvbiogKHRhc2tGbiwgam9icywgcmVzdWx0cykge1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdmFyIGpvYiA9IHlpZWxkIGNzcC50YWtlKGpvYnMpO1xuXG4gICAgICAgIGlmICghdGFza0ZuKGpvYikpIHtcbiAgICAgICAgICByZXN1bHRzLmNsb3NlKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LCBbdGFza0ZuLCBqb2JzLCByZXN1bHRzXSk7XG4gIH1cblxuICBjc3AuZ28oZnVuY3Rpb24qIChqb2JzLCBmcm9tLCByZXN1bHRzKSB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciB2ID0geWllbGQgY3NwLnRha2UoZnJvbSk7XG4gICAgICBpZiAodiA9PT0gY3NwLkNMT1NFRCkge1xuICAgICAgICBqb2JzLmNsb3NlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHAgPSBjc3AuY2hhbigxKTtcblxuICAgICAgICB5aWVsZCBjc3AucHV0KGpvYnMsIFt2LCBwXSk7XG4gICAgICAgIHlpZWxkIGNzcC5wdXQocmVzdWx0cywgcCk7XG4gICAgICB9XG4gICAgfVxuICB9LCBbam9icywgZnJvbSwgcmVzdWx0c10pO1xuXG4gIGNzcC5nbyhmdW5jdGlvbiogKHJlc3VsdHMsIGNsb3NlLCB0bykge1xuICAgIHdoaWxlKHRydWUpIHtcbiAgICAgIHZhciBwID0geWllbGQgY3NwLnRha2UocmVzdWx0cyk7XG4gICAgICBpZiAocCA9PT0gY3NwLkNMT1NFRCkge1xuICAgICAgICBpZiAoY2xvc2UpIHtcbiAgICAgICAgICB0by5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHJlcyA9IHlpZWxkIGNzcC50YWtlKHApO1xuICAgICAgICB3aGlsZSh0cnVlKSB7XG4gICAgICAgICAgdmFyIHYgPSB5aWVsZCBjc3AudGFrZShyZXMpO1xuICAgICAgICAgIGlmICh2ICE9PSBjc3AuQ0xPU0VEKSB7XG4gICAgICAgICAgICB5aWVsZCBjc3AucHV0KHRvLCB2KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LCBbcmVzdWx0cywgY2xvc2UsIHRvXSk7XG5cbiAgcmV0dXJuIHRvO1xufVxuXG5mdW5jdGlvbiBwaXBlbGluZSh0bywgeGYsIGZyb20sIGtlZXBPcGVuLCBleEhhbmRsZXIpIHtcblxuICBmdW5jdGlvbiB0YXNrRm4oam9iKSB7XG4gICAgaWYgKGpvYiA9PT0gY3NwLkNMT1NFRCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2ID0gam9iWzBdO1xuICAgICAgdmFyIHAgPSBqb2JbMV07XG4gICAgICB2YXIgcmVzID0gY3NwLmNoYW4oMSwgeGYsIGV4SGFuZGxlcik7XG5cbiAgICAgIGNzcC5nbyhmdW5jdGlvbiogKHJlcywgdikge1xuICAgICAgICB5aWVsZCBjc3AucHV0KHJlcywgdik7XG4gICAgICAgIHJlcy5jbG9zZSgpO1xuICAgICAgfSwgW3Jlcywgdl0pO1xuXG4gICAgICBjc3AucHV0QXN5bmMocCwgcmVzKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBpcGVsaW5lSW50ZXJuYWwoMSwgdG8sIGZyb20sICFrZWVwT3BlbiwgdGFza0ZuKTtcbn1cblxuZnVuY3Rpb24gcGlwZWxpbmVBc3luYyhuLCB0bywgYWYsIGZyb20sIGtlZXBPcGVuKSB7XG5cbiAgZnVuY3Rpb24gdGFza0ZuKGpvYikge1xuICAgIGlmIChqb2IgPT09IGNzcC5DTE9TRUQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdiA9IGpvYlswXTtcbiAgICAgIHZhciBwID0gam9iWzFdO1xuICAgICAgdmFyIHJlcyA9IGNzcC5jaGFuKDEpO1xuICAgICAgYWYodiwgcmVzKTtcbiAgICAgIGNzcC5wdXRBc3luYyhwLCByZXMpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBpcGVsaW5lSW50ZXJuYWwobiwgdG8sIGZyb20sICFrZWVwT3BlbiwgdGFza0ZuKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHBpcGVsaW5lOiBwaXBlbGluZSxcbiAgcGlwZWxpbmVBc3luYzogcGlwZWxpbmVBc3luY1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vLyBUT0RPOiBDb25zaWRlciBFbXB0eUVycm9yICYgRnVsbEVycm9yIHRvIGF2b2lkIHJlZHVuZGFudCBib3VuZFxuLy8gY2hlY2tzLCB0byBpbXByb3ZlIHBlcmZvcm1hbmNlIChtYXkgbmVlZCBiZW5jaG1hcmtzKVxuXG5mdW5jdGlvbiBhY29weShzcmMsIHNyY19zdGFydCwgZHN0LCBkc3Rfc3RhcnQsIGxlbmd0aCkge1xuICB2YXIgY291bnQgPSAwO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGlmIChjb3VudCA+PSBsZW5ndGgpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBkc3RbZHN0X3N0YXJ0ICsgY291bnRdID0gc3JjW3NyY19zdGFydCArIGNvdW50XTtcbiAgICBjb3VudCArKztcbiAgfVxufVxuXG52YXIgRU1QVFkgPSB7XG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXCJbb2JqZWN0IEVNUFRZXVwiO1xuICB9XG59O1xuXG52YXIgUmluZ0J1ZmZlciA9IGZ1bmN0aW9uKGhlYWQsIHRhaWwsIGxlbmd0aCwgYXJyYXkpIHtcbiAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XG4gIHRoaXMuYXJyYXkgPSBhcnJheTtcbiAgdGhpcy5oZWFkID0gaGVhZDtcbiAgdGhpcy50YWlsID0gdGFpbDtcbn07XG5cbi8vIEludGVybmFsIG1ldGhvZCwgY2FsbGVycyBtdXN0IGRvIGJvdW5kIGNoZWNrXG5SaW5nQnVmZmVyLnByb3RvdHlwZS5fdW5zaGlmdCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgdmFyIGFycmF5ID0gdGhpcy5hcnJheTtcbiAgdmFyIGhlYWQgPSB0aGlzLmhlYWQ7XG4gIGFycmF5W2hlYWRdID0gaXRlbTtcbiAgdGhpcy5oZWFkID0gKGhlYWQgKyAxKSAlIGFycmF5Lmxlbmd0aDtcbiAgdGhpcy5sZW5ndGggKys7XG59O1xuXG5SaW5nQnVmZmVyLnByb3RvdHlwZS5fcmVzaXplID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcnJheSA9IHRoaXMuYXJyYXk7XG4gIHZhciBuZXdfbGVuZ3RoID0gMiAqIGFycmF5Lmxlbmd0aDtcbiAgdmFyIG5ld19hcnJheSA9IG5ldyBBcnJheShuZXdfbGVuZ3RoKTtcbiAgdmFyIGhlYWQgPSB0aGlzLmhlYWQ7XG4gIHZhciB0YWlsID0gdGhpcy50YWlsO1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGg7XG4gIGlmICh0YWlsIDwgaGVhZCkge1xuICAgIGFjb3B5KGFycmF5LCB0YWlsLCBuZXdfYXJyYXksIDAsIGxlbmd0aCk7XG4gICAgdGhpcy50YWlsID0gMDtcbiAgICB0aGlzLmhlYWQgPSBsZW5ndGg7XG4gICAgdGhpcy5hcnJheSA9IG5ld19hcnJheTtcbiAgfSBlbHNlIGlmICh0YWlsID4gaGVhZCkge1xuICAgIGFjb3B5KGFycmF5LCB0YWlsLCBuZXdfYXJyYXksIDAsIGFycmF5Lmxlbmd0aCAtIHRhaWwpO1xuICAgIGFjb3B5KGFycmF5LCAwLCBuZXdfYXJyYXksIGFycmF5Lmxlbmd0aCAtIHRhaWwsIGhlYWQpO1xuICAgIHRoaXMudGFpbCA9IDA7XG4gICAgdGhpcy5oZWFkID0gbGVuZ3RoO1xuICAgIHRoaXMuYXJyYXkgPSBuZXdfYXJyYXk7XG4gIH0gZWxzZSBpZiAodGFpbCA9PT0gaGVhZCkge1xuICAgIHRoaXMudGFpbCA9IDA7XG4gICAgdGhpcy5oZWFkID0gMDtcbiAgICB0aGlzLmFycmF5ID0gbmV3X2FycmF5O1xuICB9XG59O1xuXG5SaW5nQnVmZmVyLnByb3RvdHlwZS51bmJvdW5kZWRfdW5zaGlmdCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgaWYgKHRoaXMubGVuZ3RoICsgMSA9PT0gdGhpcy5hcnJheS5sZW5ndGgpIHtcbiAgICB0aGlzLl9yZXNpemUoKTtcbiAgfVxuICB0aGlzLl91bnNoaWZ0KGl0ZW0pO1xufTtcblxuUmluZ0J1ZmZlci5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBFTVBUWTtcbiAgfVxuICB2YXIgYXJyYXkgPSB0aGlzLmFycmF5O1xuICB2YXIgdGFpbCA9IHRoaXMudGFpbDtcbiAgdmFyIGl0ZW0gPSBhcnJheVt0YWlsXTtcbiAgYXJyYXlbdGFpbF0gPSBudWxsO1xuICB0aGlzLnRhaWwgPSAodGFpbCArIDEpICUgYXJyYXkubGVuZ3RoO1xuICB0aGlzLmxlbmd0aCAtLTtcbiAgcmV0dXJuIGl0ZW07XG59O1xuXG5SaW5nQnVmZmVyLnByb3RvdHlwZS5jbGVhbnVwID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gdGhpcy5wb3AoKTtcbiAgICBpZiAocHJlZGljYXRlKGl0ZW0pKSB7XG4gICAgICB0aGlzLl91bnNoaWZ0KGl0ZW0pO1xuICAgIH1cbiAgfVxufTtcblxudmFyIEZpeGVkQnVmZmVyID0gZnVuY3Rpb24oYnVmLCAgbikge1xuICB0aGlzLmJ1ZiA9IGJ1ZjtcbiAgdGhpcy5uID0gbjtcbn07XG5cbkZpeGVkQnVmZmVyLnByb3RvdHlwZS5pc19mdWxsID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJ1Zi5sZW5ndGggPj0gdGhpcy5uO1xufTtcblxuRml4ZWRCdWZmZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5idWYucG9wKCk7XG59O1xuXG5GaXhlZEJ1ZmZlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oaXRlbSkge1xuICAvLyBOb3RlIHRoYXQgZXZlbiB0aG91Z2ggdGhlIHVuZGVybHlpbmcgYnVmZmVyIG1heSBncm93LCBcIm5cIiBpc1xuICAvLyBmaXhlZCBzbyBhZnRlciBvdmVyZmxvd2luZyB0aGUgYnVmZmVyIGlzIHN0aWxsIGNvbnNpZGVyZWQgZnVsbC5cbiAgdGhpcy5idWYudW5ib3VuZGVkX3Vuc2hpZnQoaXRlbSk7XG59O1xuXG5GaXhlZEJ1ZmZlci5wcm90b3R5cGUuY291bnQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYnVmLmxlbmd0aDtcbn07XG5cblxudmFyIERyb3BwaW5nQnVmZmVyID0gZnVuY3Rpb24oYnVmLCBuKSB7XG4gIHRoaXMuYnVmID0gYnVmO1xuICB0aGlzLm4gPSBuO1xufTtcblxuRHJvcHBpbmdCdWZmZXIucHJvdG90eXBlLmlzX2Z1bGwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuRHJvcHBpbmdCdWZmZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5idWYucG9wKCk7XG59O1xuXG5Ecm9wcGluZ0J1ZmZlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oaXRlbSkge1xuICBpZiAodGhpcy5idWYubGVuZ3RoIDwgdGhpcy5uKSB7XG4gICAgdGhpcy5idWYuX3Vuc2hpZnQoaXRlbSk7XG4gIH1cbn07XG5cbkRyb3BwaW5nQnVmZmVyLnByb3RvdHlwZS5jb3VudCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5idWYubGVuZ3RoO1xufTtcblxuXG52YXIgU2xpZGluZ0J1ZmZlciA9IGZ1bmN0aW9uKGJ1Ziwgbikge1xuICB0aGlzLmJ1ZiA9IGJ1ZjtcbiAgdGhpcy5uID0gbjtcbn07XG5cblNsaWRpbmdCdWZmZXIucHJvdG90eXBlLmlzX2Z1bGwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuU2xpZGluZ0J1ZmZlci5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJ1Zi5wb3AoKTtcbn07XG5cblNsaWRpbmdCdWZmZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgaWYgKHRoaXMuYnVmLmxlbmd0aCA9PT0gdGhpcy5uKSB7XG4gICAgdGhpcy5idWYucG9wKCk7XG4gIH1cbiAgdGhpcy5idWYuX3Vuc2hpZnQoaXRlbSk7XG59O1xuXG5TbGlkaW5nQnVmZmVyLnByb3RvdHlwZS5jb3VudCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5idWYubGVuZ3RoO1xufTtcblxuXG52YXIgcmluZyA9IGV4cG9ydHMucmluZyA9IGZ1bmN0aW9uIHJpbmdfYnVmZmVyKG4pIHtcbiAgcmV0dXJuIG5ldyBSaW5nQnVmZmVyKDAsIDAsIDAsIG5ldyBBcnJheShuKSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBidWZmZXIgdGhhdCBpcyBjb25zaWRlcmVkIFwiZnVsbFwiIHdoZW4gaXQgcmVhY2hlcyBzaXplIG4sXG4gKiBidXQgc3RpbGwgYWNjZXB0cyBhZGRpdGlvbmFsIGl0ZW1zLCBlZmZlY3RpdmVseSBhbGxvdyBvdmVyZmxvd2luZy5cbiAqIFRoZSBvdmVyZmxvd2luZyBiZWhhdmlvciBpcyB1c2VmdWwgZm9yIHN1cHBvcnRpbmcgXCJleHBhbmRpbmdcIlxuICogdHJhbnNkdWNlcnMsIHdoZXJlIHdlIHdhbnQgdG8gY2hlY2sgaWYgYSBidWZmZXIgaXMgZnVsbCBiZWZvcmVcbiAqIHJ1bm5pbmcgdGhlIHRyYW5zZHVjZWQgc3RlcCBmdW5jdGlvbiwgd2hpbGUgc3RpbGwgYWxsb3dpbmcgYVxuICogdHJhbnNkdWNlZCBzdGVwIHRvIGV4cGFuZCBpbnRvIG11bHRpcGxlIFwiZXNzZW5jZVwiIHN0ZXBzLlxuICovXG5leHBvcnRzLmZpeGVkID0gZnVuY3Rpb24gZml4ZWRfYnVmZmVyKG4pIHtcbiAgcmV0dXJuIG5ldyBGaXhlZEJ1ZmZlcihyaW5nKG4pLCBuKTtcbn07XG5cbmV4cG9ydHMuZHJvcHBpbmcgPSBmdW5jdGlvbiBkcm9wcGluZ19idWZmZXIobikge1xuICByZXR1cm4gbmV3IERyb3BwaW5nQnVmZmVyKHJpbmcobiksIG4pO1xufTtcblxuZXhwb3J0cy5zbGlkaW5nID0gZnVuY3Rpb24gc2xpZGluZ19idWZmZXIobikge1xuICByZXR1cm4gbmV3IFNsaWRpbmdCdWZmZXIocmluZyhuKSwgbik7XG59O1xuXG5leHBvcnRzLkVNUFRZID0gRU1QVFk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGJ1ZmZlcnMgPSByZXF1aXJlKFwiLi9idWZmZXJzXCIpO1xudmFyIGRpc3BhdGNoID0gcmVxdWlyZShcIi4vZGlzcGF0Y2hcIik7XG5cbnZhciBNQVhfRElSVFkgPSA2NDtcbnZhciBNQVhfUVVFVUVfU0laRSA9IDEwMjQ7XG5cbnZhciBDTE9TRUQgPSBudWxsO1xuXG52YXIgQm94ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xufTtcblxudmFyIFB1dEJveCA9IGZ1bmN0aW9uKGhhbmRsZXIsIHZhbHVlKSB7XG4gIHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn07XG5cbnZhciBDaGFubmVsID0gZnVuY3Rpb24odGFrZXMsIHB1dHMsIGJ1ZiwgeGZvcm0pIHtcbiAgdGhpcy5idWYgPSBidWY7XG4gIHRoaXMueGZvcm0gPSB4Zm9ybTtcbiAgdGhpcy50YWtlcyA9IHRha2VzO1xuICB0aGlzLnB1dHMgPSBwdXRzO1xuXG4gIHRoaXMuZGlydHlfdGFrZXMgPSAwO1xuICB0aGlzLmRpcnR5X3B1dHMgPSAwO1xuICB0aGlzLmNsb3NlZCA9IGZhbHNlO1xufTtcblxuZnVuY3Rpb24gaXNSZWR1Y2VkKHYpIHtcbiAgcmV0dXJuIHYgJiYgdltcIkBAdHJhbnNkdWNlci9yZWR1Y2VkXCJdO1xufVxuXG5mdW5jdGlvbiBzY2hlZHVsZShmLCB2KSB7XG4gIGRpc3BhdGNoLnJ1bihmdW5jdGlvbigpIHtcbiAgICBmKHYpO1xuICB9KTtcbn1cblxuQ2hhbm5lbC5wcm90b3R5cGUuX3B1dCA9IGZ1bmN0aW9uKHZhbHVlLCBoYW5kbGVyKSB7XG4gIGlmICh2YWx1ZSA9PT0gQ0xPU0VEKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHB1dCBDTE9TRUQgb24gYSBjaGFubmVsLlwiKTtcbiAgfVxuXG4gIC8vIFRPRE86IEknbSBub3Qgc3VyZSBob3cgdGhpcyBjYW4gaGFwcGVuLCBiZWNhdXNlIHRoZSBvcGVyYXRpb25zXG4gIC8vIGFyZSByZWdpc3RlcmVkIGluIDEgdGljaywgYW5kIHRoZSBvbmx5IHdheSBmb3IgdGhpcyB0byBiZSBpbmFjdGl2ZVxuICAvLyBpcyBmb3IgYSBwcmV2aW91cyBvcGVyYXRpb24gaW4gdGhlIHNhbWUgYWx0IHRvIGhhdmUgcmV0dXJuZWRcbiAgLy8gaW1tZWRpYXRlbHksIHdoaWNoIHdvdWxkIGhhdmUgc2hvcnQtY2lyY3VpdGVkIHRvIHByZXZlbnQgdGhpcyB0b1xuICAvLyBiZSBldmVyIHJlZ2lzdGVyIGFueXdheS4gVGhlIHNhbWUgdGhpbmcgZ29lcyBmb3IgdGhlIGFjdGl2ZSBjaGVja1xuICAvLyBpbiBcIl90YWtlXCIuXG4gIGlmICghaGFuZGxlci5pc19hY3RpdmUoKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYgKHRoaXMuY2xvc2VkKSB7XG4gICAgaGFuZGxlci5jb21taXQoKTtcbiAgICByZXR1cm4gbmV3IEJveChmYWxzZSk7XG4gIH1cblxuICB2YXIgdGFrZXIsIGNhbGxiYWNrO1xuXG4gIC8vIFNvYWsgdGhlIHZhbHVlIHRocm91Z2ggdGhlIGJ1ZmZlciBmaXJzdCwgZXZlbiBpZiB0aGVyZSBpcyBhXG4gIC8vIHBlbmRpbmcgdGFrZXIuIFRoaXMgd2F5IHRoZSBzdGVwIGZ1bmN0aW9uIGhhcyBhIGNoYW5jZSB0byBhY3Qgb24gdGhlXG4gIC8vIHZhbHVlLlxuICBpZiAodGhpcy5idWYgJiYgIXRoaXMuYnVmLmlzX2Z1bGwoKSkge1xuICAgIGhhbmRsZXIuY29tbWl0KCk7XG4gICAgdmFyIGRvbmUgPSBpc1JlZHVjZWQodGhpcy54Zm9ybVtcIkBAdHJhbnNkdWNlci9zdGVwXCJdKHRoaXMuYnVmLCB2YWx1ZSkpO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAodGhpcy5idWYuY291bnQoKSA9PT0gMCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHRha2VyID0gdGhpcy50YWtlcy5wb3AoKTtcbiAgICAgIGlmICh0YWtlciA9PT0gYnVmZmVycy5FTVBUWSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmICh0YWtlci5pc19hY3RpdmUoKSkge1xuICAgICAgICB2YWx1ZSA9IHRoaXMuYnVmLnJlbW92ZSgpO1xuICAgICAgICBjYWxsYmFjayA9IHRha2VyLmNvbW1pdCgpO1xuICAgICAgICBzY2hlZHVsZShjYWxsYmFjaywgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZG9uZSkge1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEJveCh0cnVlKTtcbiAgfVxuXG4gIC8vIEVpdGhlciB0aGUgYnVmZmVyIGlzIGZ1bGwsIGluIHdoaWNoIGNhc2UgdGhlcmUgd29uJ3QgYmUgYW55XG4gIC8vIHBlbmRpbmcgdGFrZXMsIG9yIHdlIGRvbid0IGhhdmUgYSBidWZmZXIsIGluIHdoaWNoIGNhc2UgdGhpcyBsb29wXG4gIC8vIGZ1bGZpbGxzIHRoZSBmaXJzdCBvZiB0aGVtIHRoYXQgaXMgYWN0aXZlIChub3RlIHRoYXQgd2UgZG9uJ3RcbiAgLy8gaGF2ZSB0byB3b3JyeSBhYm91dCB0cmFuc2R1Y2VycyBoZXJlIHNpbmNlIHdlIHJlcXVpcmUgYSBidWZmZXJcbiAgLy8gZm9yIHRoYXQpLlxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHRha2VyID0gdGhpcy50YWtlcy5wb3AoKTtcbiAgICBpZiAodGFrZXIgPT09IGJ1ZmZlcnMuRU1QVFkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAodGFrZXIuaXNfYWN0aXZlKCkpIHtcbiAgICAgIGhhbmRsZXIuY29tbWl0KCk7XG4gICAgICBjYWxsYmFjayA9IHRha2VyLmNvbW1pdCgpO1xuICAgICAgc2NoZWR1bGUoY2FsbGJhY2ssIHZhbHVlKTtcbiAgICAgIHJldHVybiBuZXcgQm94KHRydWUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5vIGJ1ZmZlciwgZnVsbCBidWZmZXIsIG5vIHBlbmRpbmcgdGFrZXMuIFF1ZXVlIHRoaXMgcHV0IG5vdyBpZiBibG9ja2FibGUuXG4gIGlmICh0aGlzLmRpcnR5X3B1dHMgPiBNQVhfRElSVFkpIHtcbiAgICB0aGlzLnB1dHMuY2xlYW51cChmdW5jdGlvbihwdXR0ZXIpIHtcbiAgICAgIHJldHVybiBwdXR0ZXIuaGFuZGxlci5pc19hY3RpdmUoKTtcbiAgICB9KTtcbiAgICB0aGlzLmRpcnR5X3B1dHMgPSAwO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZGlydHlfcHV0cyArKztcbiAgfVxuICBpZiAoaGFuZGxlci5pc19ibG9ja2FibGUoKSkge1xuICAgIGlmICh0aGlzLnB1dHMubGVuZ3RoID49IE1BWF9RVUVVRV9TSVpFKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIG1vcmUgdGhhbiBcIiArIE1BWF9RVUVVRV9TSVpFICsgXCIgcGVuZGluZyBwdXRzIGFyZSBhbGxvd2VkIG9uIGEgc2luZ2xlIGNoYW5uZWwuXCIpO1xuICAgIH1cbiAgICB0aGlzLnB1dHMudW5ib3VuZGVkX3Vuc2hpZnQobmV3IFB1dEJveChoYW5kbGVyLCB2YWx1ZSkpO1xuICB9XG4gIHJldHVybiBudWxsO1xufTtcblxuQ2hhbm5lbC5wcm90b3R5cGUuX3Rha2UgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gIGlmICghaGFuZGxlci5pc19hY3RpdmUoKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdmFyIHB1dHRlciwgcHV0X2hhbmRsZXIsIGNhbGxiYWNrLCB2YWx1ZTtcblxuICBpZiAodGhpcy5idWYgJiYgdGhpcy5idWYuY291bnQoKSA+IDApIHtcbiAgICBoYW5kbGVyLmNvbW1pdCgpO1xuICAgIHZhbHVlID0gdGhpcy5idWYucmVtb3ZlKCk7XG4gICAgLy8gV2UgbmVlZCB0byBjaGVjayBwZW5kaW5nIHB1dHMgaGVyZSwgb3RoZXIgd2lzZSB0aGV5IHdvbid0XG4gICAgLy8gYmUgYWJsZSB0byBwcm9jZWVkIHVudGlsIHRoZWlyIG51bWJlciByZWFjaGVzIE1BWF9ESVJUWVxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAodGhpcy5idWYuaXNfZnVsbCgpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcHV0dGVyID0gdGhpcy5wdXRzLnBvcCgpO1xuICAgICAgaWYgKHB1dHRlciA9PT0gYnVmZmVycy5FTVBUWSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHB1dF9oYW5kbGVyID0gcHV0dGVyLmhhbmRsZXI7XG4gICAgICBpZiAocHV0X2hhbmRsZXIuaXNfYWN0aXZlKCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBwdXRfaGFuZGxlci5jb21taXQoKTtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgc2NoZWR1bGUoY2FsbGJhY2ssIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1JlZHVjZWQodGhpcy54Zm9ybVtcIkBAdHJhbnNkdWNlci9zdGVwXCJdKHRoaXMuYnVmLCBwdXR0ZXIudmFsdWUpKSkge1xuICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IEJveCh2YWx1ZSk7XG4gIH1cblxuICAvLyBFaXRoZXIgdGhlIGJ1ZmZlciBpcyBlbXB0eSwgaW4gd2hpY2ggY2FzZSB0aGVyZSB3b24ndCBiZSBhbnlcbiAgLy8gcGVuZGluZyBwdXRzLCBvciB3ZSBkb24ndCBoYXZlIGEgYnVmZmVyLCBpbiB3aGljaCBjYXNlIHRoaXMgbG9vcFxuICAvLyBmdWxmaWxscyB0aGUgZmlyc3Qgb2YgdGhlbSB0aGF0IGlzIGFjdGl2ZSAobm90ZSB0aGF0IHdlIGRvbid0XG4gIC8vIGhhdmUgdG8gd29ycnkgYWJvdXQgdHJhbnNkdWNlcnMgaGVyZSBzaW5jZSB3ZSByZXF1aXJlIGEgYnVmZmVyXG4gIC8vIGZvciB0aGF0KS5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBwdXR0ZXIgPSB0aGlzLnB1dHMucG9wKCk7XG4gICAgdmFsdWUgPSBwdXR0ZXIudmFsdWU7XG4gICAgaWYgKHB1dHRlciA9PT0gYnVmZmVycy5FTVBUWSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHB1dF9oYW5kbGVyID0gcHV0dGVyLmhhbmRsZXI7XG4gICAgaWYgKHB1dF9oYW5kbGVyLmlzX2FjdGl2ZSgpKSB7XG4gICAgICBoYW5kbGVyLmNvbW1pdCgpO1xuICAgICAgY2FsbGJhY2sgPSBwdXRfaGFuZGxlci5jb21taXQoKTtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBzY2hlZHVsZShjYWxsYmFjaywgdHJ1ZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEJveCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRoaXMuY2xvc2VkKSB7XG4gICAgaGFuZGxlci5jb21taXQoKTtcbiAgICByZXR1cm4gbmV3IEJveChDTE9TRUQpO1xuICB9XG5cbiAgLy8gTm8gYnVmZmVyLCBlbXB0eSBidWZmZXIsIG5vIHBlbmRpbmcgcHV0cy4gUXVldWUgdGhpcyB0YWtlIG5vdyBpZiBibG9ja2FibGUuXG4gIGlmICh0aGlzLmRpcnR5X3Rha2VzID4gTUFYX0RJUlRZKSB7XG4gICAgdGhpcy50YWtlcy5jbGVhbnVwKGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLmlzX2FjdGl2ZSgpO1xuICAgIH0pO1xuICAgIHRoaXMuZGlydHlfdGFrZXMgPSAwO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZGlydHlfdGFrZXMgKys7XG4gIH1cbiAgaWYgKGhhbmRsZXIuaXNfYmxvY2thYmxlKCkpIHtcbiAgICBpZiAodGhpcy50YWtlcy5sZW5ndGggPj0gTUFYX1FVRVVFX1NJWkUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIG1vcmUgdGhhbiBcIiArIE1BWF9RVUVVRV9TSVpFICsgXCIgcGVuZGluZyB0YWtlcyBhcmUgYWxsb3dlZCBvbiBhIHNpbmdsZSBjaGFubmVsLlwiKTtcbiAgICB9XG4gICAgdGhpcy50YWtlcy51bmJvdW5kZWRfdW5zaGlmdChoYW5kbGVyKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG5cbkNoYW5uZWwucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmNsb3NlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLmNsb3NlZCA9IHRydWU7XG5cbiAgLy8gVE9ETzogRHVwbGljYXRlIGNvZGUuIE1ha2UgYSBcIl9mbHVzaFwiIGZ1bmN0aW9uIG9yIHNvbWV0aGluZ1xuICBpZiAodGhpcy5idWYpIHtcbiAgICB0aGlzLnhmb3JtW1wiQEB0cmFuc2R1Y2VyL3Jlc3VsdFwiXSh0aGlzLmJ1Zik7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmICh0aGlzLmJ1Zi5jb3VudCgpID09PSAwKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgdGFrZXIgPSB0aGlzLnRha2VzLnBvcCgpO1xuICAgICAgaWYgKHRha2VyID09PSBidWZmZXJzLkVNUFRZKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKHRha2VyLmlzX2FjdGl2ZSgpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gdGFrZXIuY29tbWl0KCk7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMuYnVmLnJlbW92ZSgpO1xuICAgICAgICBzY2hlZHVsZShjYWxsYmFjaywgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgdmFyIHRha2VyID0gdGhpcy50YWtlcy5wb3AoKTtcbiAgICBpZiAodGFrZXIgPT09IGJ1ZmZlcnMuRU1QVFkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAodGFrZXIuaXNfYWN0aXZlKCkpIHtcbiAgICAgIHZhciBjYWxsYmFjayA9IHRha2VyLmNvbW1pdCgpO1xuICAgICAgc2NoZWR1bGUoY2FsbGJhY2ssIENMT1NFRCk7XG4gICAgfVxuICB9XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgcHV0dGVyID0gdGhpcy5wdXRzLnBvcCgpO1xuICAgIGlmIChwdXR0ZXIgPT09IGJ1ZmZlcnMuRU1QVFkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAocHV0dGVyLmhhbmRsZXIuaXNfYWN0aXZlKCkpIHtcbiAgICAgIHZhciBwdXRfY2FsbGJhY2sgPSBwdXR0ZXIuaGFuZGxlci5jb21taXQoKTtcbiAgICAgIGlmIChwdXRfY2FsbGJhY2spIHtcbiAgICAgICAgc2NoZWR1bGUocHV0X2NhbGxiYWNrLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5cbkNoYW5uZWwucHJvdG90eXBlLmlzX2Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5jbG9zZWQ7XG59O1xuXG5mdW5jdGlvbiBkZWZhdWx0SGFuZGxlcihlKSB7XG4gIGNvbnNvbGUubG9nKCdlcnJvciBpbiBjaGFubmVsIHRyYW5zZm9ybWVyJywgZS5zdGFjayk7XG4gIHJldHVybiBDTE9TRUQ7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4KGJ1ZiwgZXhIYW5kbGVyLCBlKSB7XG4gIHZhciBkZWYgPSAoZXhIYW5kbGVyIHx8IGRlZmF1bHRIYW5kbGVyKShlKTtcbiAgaWYgKGRlZiAhPT0gQ0xPU0VEKSB7XG4gICAgYnVmLmFkZChkZWYpO1xuICB9XG4gIHJldHVybiBidWY7XG59XG5cbi8vIFRoZSBiYXNlIHRyYW5zZm9ybWVyIG9iamVjdCB0byB1c2Ugd2l0aCB0cmFuc2R1Y2Vyc1xuZnVuY3Rpb24gQWRkVHJhbnNmb3JtZXIoKSB7XG59XG5cbkFkZFRyYW5zZm9ybWVyLnByb3RvdHlwZVtcIkBAdHJhbnNkdWNlci9pbml0XCJdID0gZnVuY3Rpb24oKSB7XG4gIHRocm93IG5ldyBFcnJvcignaW5pdCBub3QgYXZhaWxhYmxlJyk7XG59O1xuXG5BZGRUcmFuc2Zvcm1lci5wcm90b3R5cGVbXCJAQHRyYW5zZHVjZXIvcmVzdWx0XCJdID0gZnVuY3Rpb24odikge1xuICByZXR1cm4gdjtcbn07XG5cbkFkZFRyYW5zZm9ybWVyLnByb3RvdHlwZVtcIkBAdHJhbnNkdWNlci9zdGVwXCJdID0gZnVuY3Rpb24oYnVmZmVyLCBpbnB1dCkge1xuICBidWZmZXIuYWRkKGlucHV0KTtcbiAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cblxuZnVuY3Rpb24gaGFuZGxlRXhjZXB0aW9uKGV4SGFuZGxlcikge1xuICByZXR1cm4gZnVuY3Rpb24oeGZvcm0pIHtcbiAgICByZXR1cm4ge1xuICAgICAgXCJAQHRyYW5zZHVjZXIvc3RlcFwiOiBmdW5jdGlvbihidWZmZXIsIGlucHV0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIHhmb3JtW1wiQEB0cmFuc2R1Y2VyL3N0ZXBcIl0oYnVmZmVyLCBpbnB1dCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXR1cm4gaGFuZGxlRXgoYnVmZmVyLCBleEhhbmRsZXIsIGUpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJAQHRyYW5zZHVjZXIvcmVzdWx0XCI6IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiB4Zm9ybVtcIkBAdHJhbnNkdWNlci9yZXN1bHRcIl0oYnVmZmVyKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJldHVybiBoYW5kbGVFeChidWZmZXIsIGV4SGFuZGxlciwgZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9O1xufVxuXG4vLyBYWFg6IFRoaXMgaXMgaW5jb25zaXN0ZW50LiBXZSBzaG91bGQgZWl0aGVyIGNhbGwgdGhlIHJlZHVjaW5nXG4vLyBmdW5jdGlvbiB4Zm9ybSwgb3IgY2FsbCB0aGUgdHJhbnNkdWNlciB4Zm9ybSwgbm90IGJvdGhcbmV4cG9ydHMuY2hhbiA9IGZ1bmN0aW9uKGJ1ZiwgeGZvcm0sIGV4SGFuZGxlcikge1xuICBpZiAoeGZvcm0pIHtcbiAgICBpZiAoIWJ1Zikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT25seSBidWZmZXJlZCBjaGFubmVscyBjYW4gdXNlIHRyYW5zZHVjZXJzXCIpO1xuICAgIH1cblxuICAgIHhmb3JtID0geGZvcm0obmV3IEFkZFRyYW5zZm9ybWVyKCkpO1xuICB9IGVsc2Uge1xuICAgIHhmb3JtID0gbmV3IEFkZFRyYW5zZm9ybWVyKCk7XG4gIH1cbiAgeGZvcm0gPSBoYW5kbGVFeGNlcHRpb24oZXhIYW5kbGVyKSh4Zm9ybSk7XG5cbiAgcmV0dXJuIG5ldyBDaGFubmVsKGJ1ZmZlcnMucmluZygzMiksIGJ1ZmZlcnMucmluZygzMiksIGJ1ZiwgeGZvcm0pO1xufTtcblxuZXhwb3J0cy5Cb3ggPSBCb3g7XG5leHBvcnRzLkNoYW5uZWwgPSBDaGFubmVsO1xuZXhwb3J0cy5DTE9TRUQgPSBDTE9TRUQ7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gVE9ETzogVXNlIHByb2Nlc3MubmV4dFRpY2sgaWYgaXQncyBhdmFpbGFibGUgc2luY2UgaXQncyBtb3JlXG4vLyBlZmZpY2llbnRcbi8vIGh0dHA6Ly9ob3d0b25vZGUub3JnL3VuZGVyc3RhbmRpbmctcHJvY2Vzcy1uZXh0LXRpY2tcbi8vIE1heWJlIHdlIGRvbid0IGV2ZW4gbmVlZCB0byBxdWV1ZSBvdXJzZWx2ZXMgaW4gdGhhdCBjYXNlP1xuXG4vLyBYWFg6IEJ1dCBodHRwOi8vYmxvZy5ub2RlanMub3JnLzIwMTMvMDMvMTEvbm9kZS12MC0xMC0wLXN0YWJsZS9cbi8vIExvb2tzIGxpa2UgaXQgd2lsbCBibG93IHVwIHRoZSBzdGFjayAob3IgaXMgdGhhdCBqdXN0IGFib3V0XG4vLyBwcmUtZW1wdGluZyBJTyAoYnV0IHRoYXQncyBhbHJlYWR5IGJhZCBlbm91Z2ggSU1PKT8pXG5cbi8vIExvb2tzIGxpa2Vcbi8vIGh0dHA6Ly9ub2RlanMub3JnL2FwaS9wcm9jZXNzLmh0bWwjcHJvY2Vzc19wcm9jZXNzX25leHR0aWNrX2NhbGxiYWNrXG4vLyBpcyB0aGUgZXF1aXZhbGVudCBvZiBvdXIgVEFTS19CQVRDSF9TSVpFXG5cbnZhciBidWZmZXJzID0gcmVxdWlyZShcIi4vYnVmZmVyc1wiKTtcblxudmFyIFRBU0tfQkFUQ0hfU0laRSA9IDEwMjQ7XG5cbnZhciB0YXNrcyA9IGJ1ZmZlcnMucmluZygzMik7XG52YXIgcnVubmluZyA9IGZhbHNlO1xudmFyIHF1ZXVlZCA9IGZhbHNlO1xuXG52YXIgcXVldWVfZGlzcGF0Y2hlcjtcblxuZnVuY3Rpb24gcHJvY2Vzc19tZXNzYWdlcygpIHtcbiAgcnVubmluZyA9IHRydWU7XG4gIHF1ZXVlZCA9IGZhbHNlO1xuICB2YXIgY291bnQgPSAwO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIHZhciB0YXNrID0gdGFza3MucG9wKCk7XG4gICAgaWYgKHRhc2sgPT09IGJ1ZmZlcnMuRU1QVFkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICAvLyBUT0RPOiBEb24ndCB3ZSBuZWVkIGEgdHJ5L2ZpbmFsbHkgaGVyZT9cbiAgICB0YXNrKCk7XG4gICAgaWYgKGNvdW50ID49IFRBU0tfQkFUQ0hfU0laRSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvdW50ICsrO1xuICB9XG4gIHJ1bm5pbmcgPSBmYWxzZTtcbiAgaWYgKHRhc2tzLmxlbmd0aCA+IDApIHtcbiAgICBxdWV1ZV9kaXNwYXRjaGVyKCk7XG4gIH1cbn1cblxuaWYgKHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICB2YXIgbWVzc2FnZV9jaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gIG1lc3NhZ2VfY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgcHJvY2Vzc19tZXNzYWdlcygpO1xuICB9O1xuICBxdWV1ZV9kaXNwYXRjaGVyID0gZnVuY3Rpb24oKSAge1xuICAgIGlmICghKHF1ZXVlZCAmJiBydW5uaW5nKSkge1xuICAgICAgcXVldWVkID0gdHJ1ZTtcbiAgICAgIG1lc3NhZ2VfY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgICB9XG4gIH07XG59IGVsc2UgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgcXVldWVfZGlzcGF0Y2hlciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghKHF1ZXVlZCAmJiBydW5uaW5nKSkge1xuICAgICAgcXVldWVkID0gdHJ1ZTtcbiAgICAgIHNldEltbWVkaWF0ZShwcm9jZXNzX21lc3NhZ2VzKTtcbiAgICB9XG4gIH07XG59IGVsc2Uge1xuICBxdWV1ZV9kaXNwYXRjaGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCEocXVldWVkICYmIHJ1bm5pbmcpKSB7XG4gICAgICBxdWV1ZWQgPSB0cnVlO1xuICAgICAgc2V0VGltZW91dChwcm9jZXNzX21lc3NhZ2VzLCAwKTtcbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydHMucnVuID0gZnVuY3Rpb24gKGYpIHtcbiAgdGFza3MudW5ib3VuZGVkX3Vuc2hpZnQoZik7XG4gIHF1ZXVlX2Rpc3BhdGNoZXIoKTtcbn07XG5cbmV4cG9ydHMucXVldWVfZGVsYXkgPSBmdW5jdGlvbihmLCBkZWxheSkge1xuICBzZXRUaW1lb3V0KGYsIGRlbGF5KTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGRpc3BhdGNoID0gcmVxdWlyZShcIi4vZGlzcGF0Y2hcIik7XG52YXIgc2VsZWN0ID0gcmVxdWlyZShcIi4vc2VsZWN0XCIpO1xudmFyIENoYW5uZWwgPSByZXF1aXJlKFwiLi9jaGFubmVsc1wiKS5DaGFubmVsO1xuXG52YXIgTk9fVkFMVUUgPSB7fTtcblxudmFyIEZuSGFuZGxlciA9IGZ1bmN0aW9uKGJsb2NrYWJsZSwgZikge1xuICB0aGlzLmYgPSBmO1xuICB0aGlzLmJsb2NrYWJsZSA9IGJsb2NrYWJsZTtcbn07XG5cbkZuSGFuZGxlci5wcm90b3R5cGUuaXNfYWN0aXZlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0cnVlO1xufTtcblxuRm5IYW5kbGVyLnByb3RvdHlwZS5pc19ibG9ja2FibGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYmxvY2thYmxlO1xufTtcblxuRm5IYW5kbGVyLnByb3RvdHlwZS5jb21taXQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZjtcbn07XG5cbmZ1bmN0aW9uIHB1dF90aGVuX2NhbGxiYWNrKGNoYW5uZWwsIHZhbHVlLCBjYWxsYmFjaykge1xuICB2YXIgcmVzdWx0ID0gY2hhbm5lbC5fcHV0KHZhbHVlLCBuZXcgRm5IYW5kbGVyKHRydWUsIGNhbGxiYWNrKSk7XG4gIGlmIChyZXN1bHQgJiYgY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayhyZXN1bHQudmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRha2VfdGhlbl9jYWxsYmFjayhjaGFubmVsLCBjYWxsYmFjaykge1xuICB2YXIgcmVzdWx0ID0gY2hhbm5lbC5fdGFrZShuZXcgRm5IYW5kbGVyKHRydWUsIGNhbGxiYWNrKSk7XG4gIGlmIChyZXN1bHQpIHtcbiAgICBjYWxsYmFjayhyZXN1bHQudmFsdWUpO1xuICB9XG59XG5cbnZhciBQcm9jZXNzID0gZnVuY3Rpb24oZ2VuLCBvbkZpbmlzaCwgY3JlYXRvcikge1xuICB0aGlzLmdlbiA9IGdlbjtcbiAgdGhpcy5jcmVhdG9yRnVuYyA9IGNyZWF0b3I7XG4gIHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcbiAgdGhpcy5vbkZpbmlzaCA9IG9uRmluaXNoO1xufTtcblxudmFyIEluc3RydWN0aW9uID0gZnVuY3Rpb24ob3AsIGRhdGEpIHtcbiAgdGhpcy5vcCA9IG9wO1xuICB0aGlzLmRhdGEgPSBkYXRhO1xufTtcblxudmFyIFRBS0UgPSBcInRha2VcIjtcbnZhciBQVVQgPSBcInB1dFwiO1xudmFyIFNMRUVQID0gXCJzbGVlcFwiO1xudmFyIEFMVFMgPSBcImFsdHNcIjtcblxuLy8gVE9ETyBGSVggWFhYOiBUaGlzIGlzIGEgKHByb2JhYmx5KSB0ZW1wb3JhcnkgaGFjayB0byBhdm9pZCBibG93aW5nXG4vLyB1cCB0aGUgc3RhY2ssIGJ1dCBpdCBtZWFucyBkb3VibGUgcXVldWVpbmcgd2hlbiB0aGUgdmFsdWUgaXMgbm90XG4vLyBpbW1lZGlhdGVseSBhdmFpbGFibGVcblByb2Nlc3MucHJvdG90eXBlLl9jb250aW51ZSA9IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgZGlzcGF0Y2gucnVuKGZ1bmN0aW9uKCkge1xuICAgIHNlbGYucnVuKHJlc3BvbnNlKTtcbiAgfSk7XG59O1xuXG5Qcm9jZXNzLnByb3RvdHlwZS5fZG9uZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghdGhpcy5maW5pc2hlZCkge1xuICAgIHRoaXMuZmluaXNoZWQgPSB0cnVlO1xuICAgIHZhciBvbkZpbmlzaCA9IHRoaXMub25GaW5pc2g7XG4gICAgaWYgKHR5cGVvZiBvbkZpbmlzaCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBkaXNwYXRjaC5ydW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIG9uRmluaXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufTtcblxuUHJvY2Vzcy5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgaWYgKHRoaXMuZmluaXNoZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBUT0RPOiBTaG91bGRuJ3Qgd2UgKG9wdGlvbmFsbHkpIHN0b3AgZXJyb3IgcHJvcGFnYXRpb24gaGVyZSAoYW5kXG4gIC8vIHNpZ25hbCB0aGUgZXJyb3IgdGhyb3VnaCBhIGNoYW5uZWwgb3Igc29tZXRoaW5nKT8gT3RoZXJ3aXNlIHRoZVxuICAvLyB1bmNhdWdodCBleGNlcHRpb24gd2lsbCBjcmFzaCBzb21lIHJ1bnRpbWVzIChlLmcuIE5vZGUpXG4gIHZhciBpdGVyID0gdGhpcy5nZW4ubmV4dChyZXNwb25zZSk7XG4gIGlmIChpdGVyLmRvbmUpIHtcbiAgICB0aGlzLl9kb25lKGl0ZXIudmFsdWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBpbnMgPSBpdGVyLnZhbHVlO1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKGlucyBpbnN0YW5jZW9mIEluc3RydWN0aW9uKSB7XG4gICAgc3dpdGNoIChpbnMub3ApIHtcbiAgICBjYXNlIFBVVDpcbiAgICAgIHZhciBkYXRhID0gaW5zLmRhdGE7XG4gICAgICBwdXRfdGhlbl9jYWxsYmFjayhkYXRhLmNoYW5uZWwsIGRhdGEudmFsdWUsIGZ1bmN0aW9uKG9rKSB7XG4gICAgICAgIHNlbGYuX2NvbnRpbnVlKG9rKTtcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIFRBS0U6XG4gICAgICB2YXIgY2hhbm5lbCA9IGlucy5kYXRhO1xuICAgICAgdGFrZV90aGVuX2NhbGxiYWNrKGNoYW5uZWwsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHNlbGYuX2NvbnRpbnVlKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIFNMRUVQOlxuICAgICAgdmFyIG1zZWNzID0gaW5zLmRhdGE7XG4gICAgICBkaXNwYXRjaC5xdWV1ZV9kZWxheShmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5ydW4obnVsbCk7XG4gICAgICB9LCBtc2Vjcyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgQUxUUzpcbiAgICAgIHNlbGVjdC5kb19hbHRzKGlucy5kYXRhLm9wZXJhdGlvbnMsIGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICBzZWxmLl9jb250aW51ZShyZXN1bHQpO1xuICAgICAgfSwgaW5zLmRhdGEub3B0aW9ucyk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgZWxzZSBpZihpbnMgaW5zdGFuY2VvZiBDaGFubmVsKSB7XG4gICAgdmFyIGNoYW5uZWwgPSBpbnM7XG4gICAgdGFrZV90aGVuX2NhbGxiYWNrKGNoYW5uZWwsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBzZWxmLl9jb250aW51ZSh2YWx1ZSk7XG4gICAgfSk7XG4gIH1cbiAgZWxzZSB7XG4gICAgdGhpcy5fY29udGludWUoaW5zKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gdGFrZShjaGFubmVsKSB7XG4gIHJldHVybiBuZXcgSW5zdHJ1Y3Rpb24oVEFLRSwgY2hhbm5lbCk7XG59XG5cbmZ1bmN0aW9uIHB1dChjaGFubmVsLCB2YWx1ZSkge1xuICByZXR1cm4gbmV3IEluc3RydWN0aW9uKFBVVCwge1xuICAgIGNoYW5uZWw6IGNoYW5uZWwsXG4gICAgdmFsdWU6IHZhbHVlXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBwb2xsKGNoYW5uZWwpIHtcbiAgaWYgKGNoYW5uZWwuY2xvc2VkKSB7XG4gICAgcmV0dXJuIE5PX1ZBTFVFO1xuICB9XG5cbiAgdmFyIHJlc3VsdCA9IGNoYW5uZWwuX3Rha2UobmV3IEZuSGFuZGxlcihmYWxzZSkpO1xuICBpZiAocmVzdWx0KSB7XG4gICAgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gTk9fVkFMVUU7XG4gIH1cbn1cblxuZnVuY3Rpb24gb2ZmZXIoY2hhbm5lbCwgdmFsdWUpIHtcbiAgaWYgKGNoYW5uZWwuY2xvc2VkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdmFyIHJlc3VsdCA9IGNoYW5uZWwuX3B1dCh2YWx1ZSwgbmV3IEZuSGFuZGxlcihmYWxzZSkpO1xuICBpZiAocmVzdWx0KSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNsZWVwKG1zZWNzKSB7XG4gIHJldHVybiBuZXcgSW5zdHJ1Y3Rpb24oU0xFRVAsIG1zZWNzKTtcbn1cblxuZnVuY3Rpb24gYWx0cyhvcGVyYXRpb25zLCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgSW5zdHJ1Y3Rpb24oQUxUUywge1xuICAgIG9wZXJhdGlvbnM6IG9wZXJhdGlvbnMsXG4gICAgb3B0aW9uczogb3B0aW9uc1xuICB9KTtcbn1cblxuZXhwb3J0cy5wdXRfdGhlbl9jYWxsYmFjayA9IHB1dF90aGVuX2NhbGxiYWNrO1xuZXhwb3J0cy50YWtlX3RoZW5fY2FsbGJhY2sgPSB0YWtlX3RoZW5fY2FsbGJhY2s7XG5leHBvcnRzLnB1dCA9IHB1dDtcbmV4cG9ydHMudGFrZSA9IHRha2U7XG5leHBvcnRzLm9mZmVyID0gb2ZmZXI7XG5leHBvcnRzLnBvbGwgPSBwb2xsO1xuZXhwb3J0cy5zbGVlcCA9IHNsZWVwO1xuZXhwb3J0cy5hbHRzID0gYWx0cztcbmV4cG9ydHMuSW5zdHJ1Y3Rpb24gPSBJbnN0cnVjdGlvbjtcbmV4cG9ydHMuUHJvY2VzcyA9IFByb2Nlc3M7XG5leHBvcnRzLk5PX1ZBTFVFID0gTk9fVkFMVUU7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIEJveCA9IHJlcXVpcmUoXCIuL2NoYW5uZWxzXCIpLkJveDtcblxudmFyIEFsdEhhbmRsZXIgPSBmdW5jdGlvbihmbGFnLCBmKSB7XG4gIHRoaXMuZiA9IGY7XG4gIHRoaXMuZmxhZyA9IGZsYWc7XG59O1xuXG5BbHRIYW5kbGVyLnByb3RvdHlwZS5pc19hY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmxhZy52YWx1ZTtcbn07XG5cbkFsdEhhbmRsZXIucHJvdG90eXBlLmlzX2Jsb2NrYWJsZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkFsdEhhbmRsZXIucHJvdG90eXBlLmNvbW1pdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmZsYWcudmFsdWUgPSBmYWxzZTtcbiAgcmV0dXJuIHRoaXMuZjtcbn07XG5cbnZhciBBbHRSZXN1bHQgPSBmdW5jdGlvbih2YWx1ZSwgY2hhbm5lbCkge1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIHRoaXMuY2hhbm5lbCA9IGNoYW5uZWw7XG59O1xuXG5mdW5jdGlvbiByYW5kX2ludChuKSB7XG4gIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobiArIDEpKTtcbn1cblxuZnVuY3Rpb24gcmFuZG9tX2FycmF5KG4pIHtcbiAgdmFyIGEgPSBuZXcgQXJyYXkobik7XG4gIHZhciBpO1xuICBmb3IgKGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgYVtpXSA9IDA7XG4gIH1cbiAgZm9yIChpID0gMTsgaSA8IG47IGkrKykge1xuICAgIHZhciBqID0gcmFuZF9pbnQoaSk7XG4gICAgYVtpXSA9IGFbal07XG4gICAgYVtqXSA9IGk7XG4gIH1cbiAgcmV0dXJuIGE7XG59XG5cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbnZhciBERUZBVUxUID0ge1xuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFwiW29iamVjdCBERUZBVUxUXVwiO1xuICB9XG59O1xuXG4vLyBUT0RPOiBBY2NlcHQgYSBwcmlvcml0eSBmdW5jdGlvbiBvciBzb21ldGhpbmdcbmV4cG9ydHMuZG9fYWx0cyA9IGZ1bmN0aW9uKG9wZXJhdGlvbnMsIGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gIHZhciBsZW5ndGggPSBvcGVyYXRpb25zLmxlbmd0aDtcbiAgLy8gWFhYIEhtbVxuICBpZiAobGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRW1wdHkgYWx0IGxpc3RcIik7XG4gIH1cblxuICB2YXIgcHJpb3JpdHkgPSAob3B0aW9ucyAmJiBvcHRpb25zLnByaW9yaXR5KSA/IHRydWUgOiBmYWxzZTtcbiAgaWYgKCFwcmlvcml0eSkge1xuICAgIHZhciBpbmRleGVzID0gcmFuZG9tX2FycmF5KGxlbmd0aCk7XG4gIH1cblxuICB2YXIgZmxhZyA9IG5ldyBCb3godHJ1ZSk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBvcGVyYXRpb24gPSBvcGVyYXRpb25zW3ByaW9yaXR5ID8gaSA6IGluZGV4ZXNbaV1dO1xuICAgIHZhciBwb3J0LCByZXN1bHQ7XG4gICAgLy8gWFhYIEhtbVxuICAgIGlmIChvcGVyYXRpb24gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgdmFyIHZhbHVlID0gb3BlcmF0aW9uWzFdO1xuICAgICAgcG9ydCA9IG9wZXJhdGlvblswXTtcbiAgICAgIC8vIFdlIHdyYXAgdGhpcyBpbiBhIGZ1bmN0aW9uIHRvIGNhcHR1cmUgdGhlIHZhbHVlIG9mIFwicG9ydFwiLFxuICAgICAgLy8gYmVjYXVzZSBqcycgY2xvc3VyZSBjYXB0dXJlcyB2YXJzIGJ5IFwicmVmZXJlbmNlc1wiLCBub3RcbiAgICAgIC8vIHZhbHVlcy4gXCJsZXQgcG9ydFwiIHdvdWxkIGhhdmUgd29ya2VkLCBidXQgSSBkb24ndCB3YW50IHRvXG4gICAgICAvLyByYWlzZSB0aGUgcnVudGltZSByZXF1aXJlbWVudCB5ZXQuIFRPRE86IFNvIGNoYW5nZSB0aGlzIHdoZW5cbiAgICAgIC8vIG1vc3QgcnVudGltZXMgYXJlIG1vZGVybiBlbm91Z2guXG4gICAgICByZXN1bHQgPSBwb3J0Ll9wdXQodmFsdWUsIChmdW5jdGlvbihwb3J0KSB7XG4gICAgICAgIHJldHVybiBuZXcgQWx0SGFuZGxlcihmbGFnLCBmdW5jdGlvbihvaykge1xuICAgICAgICAgIGNhbGxiYWNrKG5ldyBBbHRSZXN1bHQob2ssIHBvcnQpKTtcbiAgICAgICAgfSk7XG4gICAgICB9KShwb3J0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBvcnQgPSBvcGVyYXRpb247XG4gICAgICByZXN1bHQgPSBwb3J0Ll90YWtlKChmdW5jdGlvbihwb3J0KSB7XG4gICAgICAgIHJldHVybiBuZXcgQWx0SGFuZGxlcihmbGFnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGNhbGxiYWNrKG5ldyBBbHRSZXN1bHQodmFsdWUsIHBvcnQpKTtcbiAgICAgICAgfSk7XG4gICAgICB9KShwb3J0KSk7XG4gICAgfVxuICAgIC8vIFhYWCBIbW1cbiAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgQm94KSB7XG4gICAgICBjYWxsYmFjayhuZXcgQWx0UmVzdWx0KHJlc3VsdC52YWx1ZSwgcG9ydCkpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKCEocmVzdWx0IGluc3RhbmNlb2YgQm94KVxuICAgICAgJiYgb3B0aW9uc1xuICAgICAgJiYgaGFzT3duUHJvcGVydHkuY2FsbChvcHRpb25zLCBcImRlZmF1bHRcIikpIHtcbiAgICBpZiAoZmxhZy52YWx1ZSkge1xuICAgICAgZmxhZy52YWx1ZSA9IGZhbHNlO1xuICAgICAgY2FsbGJhY2sobmV3IEFsdFJlc3VsdChvcHRpb25zW1wiZGVmYXVsdFwiXSwgREVGQVVMVCkpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0cy5ERUZBVUxUID0gREVGQVVMVDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZGlzcGF0Y2ggPSByZXF1aXJlKFwiLi9kaXNwYXRjaFwiKTtcbnZhciBjaGFubmVscyA9IHJlcXVpcmUoXCIuL2NoYW5uZWxzXCIpO1xuXG5leHBvcnRzLnRpbWVvdXQgPSBmdW5jdGlvbiB0aW1lb3V0X2NoYW5uZWwobXNlY3MpIHtcbiAgdmFyIGNoYW4gPSBjaGFubmVscy5jaGFuKCk7XG4gIGRpc3BhdGNoLnF1ZXVlX2RlbGF5KGZ1bmN0aW9uKCkge1xuICAgIGNoYW4uY2xvc2UoKTtcbiAgfSwgbXNlY3MpO1xuICByZXR1cm4gY2hhbjtcbn07XG4iLCIvLyBDb3B5cmlnaHQgKGMpIDIwMTUgUGF0cmljayBEdWJyb3kgPHBkdWJyb3lAZ21haWwuY29tPlxuLy8gVGhpcyBzb2Z0d2FyZSBpcyBkaXN0cmlidXRlZCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIE1JVCBMaWNlbnNlLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKTtcbnZhciBjc3AgPSByZXF1aXJlKCdqcy1jc3AnKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbnZhciBCVUZGRVJfU0laRSA9IDUxMjtcblxuZnVuY3Rpb24gSm9pblBhdHRlcm4oY2hhbikge1xuICB0aGlzLl9jaGFubmVscyA9IFtjaGFuXTtcbiAgdGhpcy5fc3luY0NoYW5uZWwgPSBjaGFuLmlzU3luY2hyb25vdXMoKSA/IGNoYW4gOiBudWxsO1xufVxuXG5Kb2luUGF0dGVybi5wcm90b3R5cGUuaXNSZWFkeSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fY2hhbm5lbHMuZXZlcnkoZnVuY3Rpb24oYykgeyByZXR1cm4gIWMuaXNFbXB0eSgpOyB9KTtcbn07XG5cbmZ1bmN0aW9uIGdldE1hdGNoZXMocGF0dCkge1xuICByZXR1cm4gcGF0dC5fY2hhbm5lbHMubWFwKGZ1bmN0aW9uKGMpIHsgcmV0dXJuIGMuX3Rha2UoKTsgfSk7XG59XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShKb2luUGF0dGVybi5wcm90b3R5cGUsICdsZW5ndGgnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9jaGFubmVscy5sZW5ndGg7IH1cbn0pO1xuXG5mdW5jdGlvbiBSZWFjdGlvbihwYXR0ZXJuLCBmbikge1xuICB0aGlzLl9wYXR0ZXJuID0gcGF0dGVybjtcbiAgdGhpcy5fYm9keSA9IGZuO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0dGVybi5fY2hhbm5lbHMubGVuZ3RoOyArK2kpIHtcbiAgICBwYXR0ZXJuLl9jaGFubmVsc1tpXS5fYWRkUmVhY3Rpb24odGhpcyk7XG4gIH1cbn1cblxuUmVhY3Rpb24ucHJvdG90eXBlLnRyeSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fcGF0dGVybi5pc1JlYWR5KCkpIHtcbiAgICByZXR1cm4ge3ZhbHVlOiB0aGlzLnJ1bigpfTtcbiAgfVxufTtcblxuUmVhY3Rpb24ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fYm9keS5hcHBseShudWxsLCBnZXRNYXRjaGVzKHRoaXMuX3BhdHRlcm4pKTtcbn07XG5cbkpvaW5QYXR0ZXJuLnByb3RvdHlwZS5hbmQgPSBmdW5jdGlvbihjaGFuKSB7XG4gIHRoaXMuX2NoYW5uZWxzLnB1c2goY2hhbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuSm9pblBhdHRlcm4ucHJvdG90eXBlLmRvID0gZnVuY3Rpb24oZm4pIHtcbiAgcmV0dXJuIG5ldyBSZWFjdGlvbih0aGlzLCBmbik7XG59O1xuXG5mdW5jdGlvbiBDaGFubmVsKCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ2hhbm5lbCkpIHtcbiAgICByZXR1cm4gbmV3IENoYW5uZWwoKTtcbiAgfVxuICB0aGlzLl9jaGFuID0gY3NwLmNoYW4oQlVGRkVSX1NJWkUpO1xuICB0aGlzLl93YWl0aW5nID0gW107XG4gIHRoaXMuX3F1ZXVlID0gW107XG59XG5cbkNoYW5uZWwucHJvdG90eXBlLmlzU3luY2hyb25vdXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5DaGFubmVsLnByb3RvdHlwZS5pc0VtcHR5ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9jaGFuLmJ1Zi5jb3VudCgpID09PSAwO1xufTtcblxuLy8gU2hvdWxkIGJlIHlpZWxkKCllZCBmcm9tLlxuQ2hhbm5lbC5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uKHZhbCkge1xuICBjc3Aub2ZmZXIodGhpcy5fY2hhbiwgdmFsKTtcblxuICAvLyBSdW4gdXAgdG8gb25lIHJlYWN0aW9uIHRoYXQgaXMgd2FpdGluZyBvbiB0aGlzIGNoYW5uZWwuXG4gIC8vIFRPRE86IFNob3VsZCB3ZSB0cnkgdG8gcnVuIGFzIG1hbnkgYXMgcG9zc2libGU/XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fd2FpdGluZy5sZW5ndGg7ICsraSkge1xuICAgIHZhciByZWFjdGlvbiA9IHRoaXMuX3dhaXRpbmdbaV07XG4gICAgdmFyIHJlc3VsdCA9IHJlYWN0aW9uLnRyeSgpO1xuICAgIGlmIChyZXN1bHQpIHtcbiAgICAgIC8vIElmIHRoaXMgaXMgYW4gYXN5bmNocm9ub3VzIGNoYW5uZWwsIGRvbid0IHJldHVybiB0aGUgcmVzdWx0XG4gICAgICAvLyBkaXJlY3RseSAtLSBwdW1wIGl0IGludG8gdGhlIGl0ZXJhdG9yIGFueSBpdGVyYXRvciB0aGF0IGlzXG4gICAgICAvLyB3YWl0aW5nIG9uIHRoZSBzeW5jaHJvbm91cyBjaGFubmVsIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHBhdHRlcm4uXG4gICAgICBpZiAodGhpcy5pc1N5bmNocm9ub3VzKCkpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgICAgIH1cbiAgICAgIC8vIFRPRE86IFJlZmFjdG9yIHRoaXMuXG4gICAgICB2YXIgY2hhbiA9IHJlYWN0aW9uLl9wYXR0ZXJuLl9jaGFubmVsc1swXTtcbiAgICAgIGlmIChjaGFuLmlzU3luY2hyb25vdXMoKSAmJiBjaGFuLl9xdWV1ZS5sZW5ndGggPj0gMCkge1xuICAgICAgICB2YXIgcHJvYyA9IGNoYW4uX3F1ZXVlLnNoaWZ0KCk7XG4gICAgICAgIHByb2Muc3RlcChyZXN1bHQudmFsdWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb25zaXN0ZW50LXJldHVyblxuICAgIH1cbiAgfVxuICByZXR1cm4ge3N0YXR1czogJ0JMT0NLSU5HJywgY2hhbm5lbDogdGhpc307XG59O1xuXG5DaGFubmVsLnByb3RvdHlwZS5fdGFrZSA9IGZ1bmN0aW9uKCkge1xuICBhc3NlcnQoIXRoaXMuaXNFbXB0eSgpLCBcIkNhbid0IHRha2UgZnJvbSBhbiBlbXB0eSBjaGFubmVsXCIpO1xuICByZXR1cm4gY3NwLnBvbGwodGhpcy5fY2hhbik7XG59O1xuXG5DaGFubmVsLnByb3RvdHlwZS5fYWRkUmVhY3Rpb24gPSBmdW5jdGlvbihyKSB7XG4gIHRoaXMuX3dhaXRpbmcucHVzaChyKTtcbn07XG5cbmZ1bmN0aW9uIEFzeW5jQ2hhbm5lbCgpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEFzeW5jQ2hhbm5lbCkpIHtcbiAgICByZXR1cm4gbmV3IEFzeW5jQ2hhbm5lbCgpO1xuICB9XG4gIENoYW5uZWwuY2FsbCh0aGlzKTtcbn1cbmluaGVyaXRzKEFzeW5jQ2hhbm5lbCwgQ2hhbm5lbCk7XG5cbkFzeW5jQ2hhbm5lbC5wcm90b3R5cGUuaXNTeW5jaHJvbm91cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gZmFsc2U7XG59O1xuXG5jbGFzcyBQcm9jZXNzIHtcbiAgY29uc3RydWN0b3IoZm4sIG9wdEFyZ3MsIG9wdFRoaXNBcmcpIHtcbiAgICBhc3NlcnQuZXF1YWwodHlwZW9mIGZuLCAnZnVuY3Rpb24nLCAnRXhwZWN0ZWQgYSBnZW5lcmF0b3IgZnVuY3Rpb24nKTtcbiAgICB0aGlzLl9pdGVyID0gZm4uYXBwbHkob3B0VGhpc0FyZywgb3B0QXJncyB8fCBbXSk7XG4gIH1cblxuICBzdGVwKHZhbHVlKSB7XG4gICAgdmFyIHJlc3VsdCA9IHRoaXMuX2l0ZXIubmV4dCh2YWx1ZSk7XG4gICAgdmFyIHN0YXRlID0gdGhpcy5fc3RhdGUgPSByZXN1bHQudmFsdWU7XG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gJ29iamVjdCcgJiYgc3RhdGUuc3RhdHVzID09PSAnQkxPQ0tJTkcnKSB7XG4gICAgICBzdGF0ZS5jaGFubmVsLl9xdWV1ZS5wdXNoKHRoaXMpO1xuICAgIH1cbiAgICB0aGlzLl9kb25lID0gcmVzdWx0LmRvbmU7XG4gIH1cblxuICBpc0NvbXBsZXRlKCkge1xuICAgIHJldHVybiB0aGlzLl9kb25lO1xuICB9XG59XG5cbmZ1bmN0aW9uIHdoZW4oY2hhbikge1xuICByZXR1cm4gbmV3IEpvaW5QYXR0ZXJuKGNoYW4pO1xufVxuXG5mdW5jdGlvbiBzcGF3bihmbiwgb3B0QXJncywgb3B0VGhpc0FyZykge1xuICB2YXIgcCA9IG5ldyBQcm9jZXNzKGZuLCBvcHRBcmdzLCBvcHRUaGlzQXJnKTtcbiAgcC5zdGVwKCk7XG4gIHJldHVybiBwO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgQXN5bmNDaGFubmVsOiBBc3luY0NoYW5uZWwsXG4gIENoYW5uZWw6IENoYW5uZWwsXG4gIHNwYXduOiBzcGF3bixcbiAgd2hlbjogd2hlblxufTtcbiJdfQ==
