import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCliArgs } from '../lib/args.js';

describe('parseCliArgs', () => {
  it('returns nothing set when there are no flags', () => {
    assert.deepEqual(parseCliArgs([]), {
      help: false,
      version: false,
      configPath: undefined,
      flags: {},
    });
  });

  it('parses long flags', () => {
    const { configPath, flags } = parseCliArgs([
      '--config', 'c.json',
      '--port', '3000',
      '--routes', 'r.js',
      '--database', 'db',
      '--prefix', '/api',
      '--proxy', 'http://x',
    ]);

    assert.equal(configPath, 'c.json');
    assert.deepEqual(flags, {
      port: 3000,
      routes: 'r.js',
      database: 'db',
      prefix: '/api',
      proxy: { server: 'http://x' },
    });
  });

  it('parses short flags', () => {
    const { configPath, flags } = parseCliArgs([
      '-c', 'c.json',
      '-p', '3000',
      '-r', 'r.js',
      '-d', 'db',
      '-f', '/api',
      '-x', 'http://x',
    ]);

    assert.equal(configPath, 'c.json');
    assert.deepEqual(flags, {
      port: 3000,
      routes: 'r.js',
      database: 'db',
      prefix: '/api',
      proxy: { server: 'http://x' },
    });
  });

  it('parses help and version', () => {
    assert.equal(parseCliArgs(['--help']).help, true);
    assert.equal(parseCliArgs(['-h']).help, true);
    assert.equal(parseCliArgs(['--version']).version, true);
    assert.equal(parseCliArgs(['-v']).version, true);
  });

  it('keeps empty prefix (it overrides prefix from config)', () => {
    assert.equal(parseCliArgs(['--prefix=']).flags.prefix, '');
  });

  it('throws on unknown flag, missing value and extra argument', () => {
    assert.throws(() => parseCliArgs(['--unknown']), /unknown/i);
    assert.throws(() => parseCliArgs(['--port']), /--port/);
    assert.throws(() => parseCliArgs(['routes.js']), /routes\.js/);
  });

  it('throws on invalid port', () => {
    for (const port of ['abc', '0', '65536', '80.5']) {
      assert.throws(() => parseCliArgs(['--port', port]), /Invalid port/, port);
    }
  });
});
