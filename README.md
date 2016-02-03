# jsjoins

A JavaScript concurrency library based on the join calculus.

The [join calculus](http://research.microsoft.com/en-us/um/people/fournet/papers/join-tutorial.pdf)
is a formal model for message passing concurrency. The name comes from its
most powerful feature: _join patterns_ (also known as _chords_). In the join
calculus, programs do not actively request to receive a messages on a certain
channel. Instead, they use join patterns, which declaratively specify reactions
to specific message patterns (much like method declarations in object-oriented
programming). The power of join patterns is that they can be used to
atomically process messages from multiple channels.

This project includes a library implementation of join patterns (see [src/index.js](./src/index.js)),
as well as a JavaScript syntax extension for declaring channels and join
patterns (see [src/joinjs.ohm](./src/joinjs.ohm) and [src/joinjs.js](./src/joinjs.js)).
