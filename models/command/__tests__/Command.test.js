'use strict';

const Command = require('..');
const assert = require('assert').strict;

assert.strictEqual(Command(), 'Hello from Command');
console.info('Command tests passed');
