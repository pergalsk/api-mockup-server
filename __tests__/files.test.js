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
