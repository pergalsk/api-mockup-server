import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startServer } from './helpers.js';

const INLINE_ROUTES = `{
  prefix: '/api',
  routes: [
    { active: true, path: '/books', data: [{ id: 1 }] },
    { active: true, path: '/books', method: 'POST', status: 201, data: { created: true } },
    { active: true, path: '/v2/books', prefix: '/api2', data: { v: 2 } },
    { active: true, path: '/root', prefix: '', data: { root: true } },
    { active: true, path: '/error', status: 400, data: { error: 'bad' } },
    { active: false, path: '/inactive', data: { inactive: true } },
  ],
}`;

for (const moduleType of ['esm', 'cjs']) {
  describe(`package loaded with ${moduleType === 'esm' ? 'import' : 'require()'}`, () => {
    it('exports a function and serves inline routes', async (t) => {
      const server = await startServer({ options: INLINE_ROUTES, moduleType });
      t.after(() => server.stop());

      assert.match(server.output(), /typeof amServer: function/);

      const res = await server.fetch('/api/books');
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), [{ id: 1 }]);
      assert.match(res.headers.get('x-api-mockup-server'), /mocked,inline/);
    });
  });
}

describe('inline routes', () => {
  it('handles methods, prefixes, statuses and inactive routes', async (t) => {
    const server = await startServer({ options: INLINE_ROUTES });
    t.after(() => server.stop());

    const post = await server.fetch('/api/books', { method: 'POST' });
    assert.equal(post.status, 201);
    assert.deepEqual(await post.json(), { created: true });

    const routePrefix = await server.fetch('/api2/v2/books');
    assert.deepEqual(await routePrefix.json(), { v: 2 });

    const emptyPrefix = await server.fetch('/root');
    assert.deepEqual(await emptyPrefix.json(), { root: true });

    const error = await server.fetch('/api/error');
    assert.equal(error.status, 400);
    assert.deepEqual(await error.json(), { error: 'bad' });

    const inactive = await server.fetch('/api/inactive');
    assert.equal(inactive.status, 404);

    const unknown = await server.fetch('/api/unknown');
    assert.equal(unknown.status, 404);
  });

  it('modifies response data with callback', async (t) => {
    const server = await startServer({
      options: `{
        routes: [{
          active: true,
          path: '/books/:id',
          data: { title: 'Book' },
          callback: ({ params, query, data }) => ({ ...data, id: params.id, q: query.q }),
        }],
      }`,
    });
    t.after(() => server.stop());

    const res = await server.fetch('/books/7?q=x');
    assert.deepEqual(await res.json(), { title: 'Book', id: '7', q: 'x' });
    assert.match(res.headers.get('x-api-mockup-server'), /dynamic/);
  });

  it('gives callback empty body and nested query (Express 4 behavior)', async (t) => {
    const server = await startServer({
      options: `{
        routes: [{
          active: true,
          path: '/search',
          data: {},
          callback: ({ query, body }) => ({ query, body }),
        }],
      }`,
    });
    t.after(() => server.stop());

    const res = await server.fetch('/search?filter[genre]=novel');
    assert.deepEqual(await res.json(), { query: { filter: { genre: 'novel' } }, body: {} });
  });
});

describe('route paths', () => {
  it('supports Express 5 optional parts and wildcards', async (t) => {
    const server = await startServer({
      options: `{
        routes: [
          { active: true, path: '/movies{/:genre}', data: {}, callback: ({ params }) => params },
          { active: true, path: '/files/*filePath', data: {}, callback: ({ params }) => params },
        ],
      }`,
    });
    t.after(() => server.stop());

    assert.deepEqual(await (await server.fetch('/movies')).json(), {});
    assert.deepEqual(await (await server.fetch('/movies/drama')).json(), { genre: 'drama' });
    assert.deepEqual(await (await server.fetch('/files/a/b.txt')).json(), { filePath: ['a', 'b.txt'] });
  });

  it('skips route with invalid path and keeps other routes', async (t) => {
    const server = await startServer({
      options: `{
        routes: [
          { active: true, path: '/old/:id?', data: { old: true } },
          { active: true, path: '/all(.*)', data: { all: true } },
          { active: true, path: '/ok', data: { ok: true } },
        ],
      }`,
    });
    t.after(() => server.stop());

    assert.match(server.output(), /Invalid route path "\/old\/:id\?"/);
    assert.match(server.output(), /Invalid route path "\/all\(\.\*\)"/);
    assert.equal((await server.fetch('/old/1')).status, 404);
    assert.deepEqual(await (await server.fetch('/ok')).json(), { ok: true });
  });
});
