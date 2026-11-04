import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startServer, waitFor } from './helpers.js';

const routesFile = (routes) => `module.exports = ${routes};\n`;

const getJson = async (server, path) => (await server.fetch(path)).json();

describe('routes file', () => {
  it('loads routes from a CommonJS routes file', async (t) => {
    const server = await startServer({
      options: `{ routes: './routes.cjs' }`,
      files: { 'routes.cjs': routesFile(`[{ active: true, path: '/v', data: { v: 1 } }]`) },
    });
    t.after(() => server.stop());

    assert.deepEqual(await getJson(server, '/v'), { v: 1 });
  });

  it('loads routes from an ESM routes file (export default)', async (t) => {
    const server = await startServer({
      options: `{ routes: './routes.mjs' }`,
      files: { 'routes.mjs': `export default [{ active: true, path: '/v', data: { esm: true } }];\n` },
    });
    t.after(() => server.stop());

    assert.deepEqual(await getJson(server, '/v'), { esm: true });
  });

  it('reloads routes when the routes file changes', async (t) => {
    const server = await startServer({
      options: `{ routes: './routes.cjs' }`,
      files: { 'routes.cjs': routesFile(`[{ active: true, path: '/v', data: { v: 1 } }]`) },
    });
    t.after(() => server.stop());

    assert.deepEqual(await getJson(server, '/v'), { v: 1 });

    server.writeFile('routes.cjs', routesFile(`[{ active: true, path: '/v', data: { v: 2 } }]`));

    await waitFor(async () => (await getJson(server, '/v')).v === 2);
  });

  it('reloads routes when the ESM routes file changes', async (t) => {
    const esmRoutesFile = (v) => `export default [{ active: true, path: '/v', data: { v: ${v} } }];\n`;
    const server = await startServer({
      options: `{ routes: './routes.mjs' }`,
      files: { 'routes.mjs': esmRoutesFile(1) },
    });
    t.after(() => server.stop());

    assert.deepEqual(await getJson(server, '/v'), { v: 1 });

    server.writeFile('routes.mjs', esmRoutesFile(2));
    await waitFor(async () => (await getJson(server, '/v')).v === 2);

    // second reload: every reload has to get a fresh copy
    server.writeFile('routes.mjs', esmRoutesFile(3));
    await waitFor(async () => (await getJson(server, '/v')).v === 3);
    assert.ok(server.isRunning());
  });

  it('loads the routes file again only when it changed', async (t) => {
    // routes file counts how many times it was loaded
    const countingRoutesFile = (comment) =>
      `// ${comment}\nglobalThis.loads = (globalThis.loads ?? 0) + 1;\n` +
      `export default [{ active: true, path: '/loads', callback: () => ({ loads: globalThis.loads }) }];\n`;
    const server = await startServer({
      // keyboard shortcuts work only in TTY
      options: `(process.stdin.isTTY = true, { routes: './routes.mjs' })`,
      files: { 'routes.mjs': countingRoutesFile('v1') },
    });
    t.after(() => server.stop());

    assert.deepEqual(await getJson(server, '/loads'), { loads: 1 });

    // suspend and resume restart the server, routes file is not changed
    server.writeStdin('s');
    await waitFor(async () => (await server.fetch('/loads')).status === 404);
    server.writeStdin('s');
    await waitFor(async () => (await server.fetch('/loads')).status === 200);
    assert.deepEqual(await getJson(server, '/loads'), { loads: 1 });

    server.writeFile('routes.mjs', countingRoutesFile('v2'));
    await waitFor(async () => (await getJson(server, '/loads')).loads === 2);
  });

  it('recovers after a syntax error in the ESM routes file', async (t) => {
    const server = await startServer({
      options: `{ routes: './routes.mjs' }`,
      files: { 'routes.mjs': `export default [{` },
    });
    t.after(() => server.stop());

    assert.equal((await server.fetch('/v')).status, 404);

    server.writeFile('routes.mjs', `export default [{ active: true, path: '/v', data: { v: 1 } }];\n`);

    await waitFor(async () => (await server.fetch('/v')).status === 200);
    assert.deepEqual(await getJson(server, '/v'), { v: 1 });
  });

  it('reloads routes when the JSON routes file changes', async (t) => {
    const jsonRoutesFile = (v) => JSON.stringify([{ active: true, path: '/v', data: { v } }]);
    const server = await startServer({
      options: `{ routes: './routes.json' }`,
      files: { 'routes.json': jsonRoutesFile(1) },
    });
    t.after(() => server.stop());

    assert.deepEqual(await getJson(server, '/v'), { v: 1 });

    server.writeFile('routes.json', jsonRoutesFile(2));

    await waitFor(async () => (await getJson(server, '/v')).v === 2);
  });

  it('loads routes when the routes file is added after start', async (t) => {
    const server = await startServer({ options: `{ routes: './routes.cjs' }` });
    t.after(() => server.stop());

    assert.equal((await server.fetch('/v')).status, 404);

    server.writeFile('routes.cjs', routesFile(`[{ active: true, path: '/v', data: { added: true } }]`));

    await waitFor(async () => (await server.fetch('/v')).status === 200);
    assert.deepEqual(await getJson(server, '/v'), { added: true });
  });

  it('does not crash when the routes file does not export an array', async (t) => {
    const server = await startServer({
      options: `{ routes: './routes.cjs' }`,
      files: { 'routes.cjs': routesFile(`{ notAnArray: true }`) },
    });
    t.after(() => server.stop());

    assert.equal((await server.fetch('/v')).status, 404);
    assert.ok(server.isRunning());
  });
});

describe('wrong routes warnings', () => {
  const cases = [
    {
      name: 'routes path does not exist',
      options: `{ routes: './missing.cjs' }`,
      expected: /WARNING: Routes file ".*missing\.cjs" not found/,
    },
    {
      name: 'routes path is a folder',
      options: `{ routes: './routes-dir' }`,
      files: { 'routes-dir/file.txt': '' },
      expected: /WARNING: Routes path ".*routes-dir" is not a file/,
    },
    {
      name: 'routes file throws an error',
      options: `{ routes: './routes.cjs' }`,
      files: { 'routes.cjs': `throw new Error('boom from routes');\n` },
      expected: /ERROR: Routes file ".*routes\.cjs" could not be loaded:\s+boom from routes/,
    },
    {
      name: 'routes file has a syntax error',
      options: `{ routes: './routes.mjs' }`,
      files: { 'routes.mjs': `export default [{` },
      expected: /ERROR: Routes file ".*routes\.mjs" could not be loaded:\s+\S+/,
    },
    {
      name: 'routes file has a bad import',
      options: `{ routes: './routes.mjs' }`,
      files: { 'routes.mjs': `import './nope.mjs';\nexport default [];\n` },
      expected: /ERROR: Routes file ".*routes\.mjs" could not be loaded:\s+.*nope\.mjs/,
    },
    {
      name: 'routes file exports an object',
      options: `{ routes: './routes.cjs' }`,
      files: { 'routes.cjs': routesFile(`{ notAnArray: true }`) },
      expected: /WARNING: Routes file ".*routes\.cjs" does not export an array/,
    },
    {
      name: 'routes option is an object',
      options: `{ routes: { path: '/v' } }`,
      expected: /WARNING: Option "routes" must be a path to a file or an array \(got object\)/,
    },
    {
      name: 'routes option is a number',
      options: `{ routes: 42 }`,
      expected: /WARNING: Option "routes" must be a path to a file or an array \(got number\)/,
    },
  ];

  cases.forEach(({ name, options, files, expected }) => {
    it(`logs a message and keeps running when ${name}`, async (t) => {
      const server = await startServer({ options, files });
      t.after(() => server.stop());

      assert.match(server.output(), expected);
      assert.equal((await server.fetch('/v')).status, 404);
      assert.ok(server.isRunning());
    });
  });

  it('logs no message when routes are correct', async (t) => {
    const server = await startServer({
      options: `{ routes: './routes.cjs' }`,
      files: { 'routes.cjs': routesFile(`[{ active: true, path: '/v', data: { v: 1 } }]`) },
    });
    t.after(() => server.stop());

    assert.doesNotMatch(server.output(), /Routes (file|path) ".*(not found|not a file|could not be|not export)/);
  });

  const reloadCases = [
    {
      name: 'throws an error',
      content: `throw new Error('boom on reload');\n`,
      expected: /ERROR: Routes file ".*routes\.cjs" could not be loaded:\s+boom on reload/,
    },
    {
      name: 'does not export an array',
      content: routesFile(`{ notAnArray: true }`),
      expected: /WARNING: Routes file ".*routes\.cjs" does not export an array/,
    },
  ];

  reloadCases.forEach(({ name, content, expected }) => {
    it(`logs the same message on hot reload when the file ${name}`, async (t) => {
      const server = await startServer({
        options: `{ routes: './routes.cjs' }`,
        files: { 'routes.cjs': routesFile(`[{ active: true, path: '/v', data: { v: 1 } }]`) },
      });
      t.after(() => server.stop());

      assert.doesNotMatch(server.output(), expected);

      server.writeFile('routes.cjs', content);

      await waitFor(() => expected.test(server.output()));
      await waitFor(async () => (await server.fetch('/v')).status === 404);
      assert.ok(server.isRunning());
    });
  });
});

describe('database files', () => {
  it('serves data from <key>.json and <key>.<status>.json', async (t) => {
    const server = await startServer({
      options: `{
        database: './db',
        routes: [
          { active: true, path: '/book', key: 'BOOK' },
          { active: true, path: '/book-error', key: 'BOOK', status: 400 },
          { active: true, path: '/missing', key: 'MISSING' },
        ],
      }`,
      files: {
        'db/BOOK.json': JSON.stringify({ title: 'Book' }),
        'db/BOOK.400.json': JSON.stringify({ error: 'Bad book' }),
      },
    });
    t.after(() => server.stop());

    const book = await server.fetch('/book');
    assert.equal(book.status, 200);
    assert.deepEqual(await book.json(), { title: 'Book' });
    assert.match(book.headers.get('x-api-mockup-server'), /mocked,file/);

    const error = await server.fetch('/book-error');
    assert.equal(error.status, 400);
    assert.deepEqual(await error.json(), { error: 'Bad book' });

    const missing = await server.fetch('/missing');
    assert.equal(missing.status, 200);
    assert.equal(await missing.text(), '');
  });

  it('serves changed data file content without restart', async (t) => {
    const server = await startServer({
      options: `{ database: './db', routes: [{ active: true, path: '/book', key: 'BOOK' }] }`,
      files: { 'db/BOOK.json': JSON.stringify({ v: 1 }) },
    });
    t.after(() => server.stop());

    assert.deepEqual(await getJson(server, '/book'), { v: 1 });

    server.writeFile('db/BOOK.json', JSON.stringify({ v: 2 }));

    assert.deepEqual(await getJson(server, '/book'), { v: 2 });
  });
});
