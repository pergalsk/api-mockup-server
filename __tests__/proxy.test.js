import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startServer, startUpstream } from './helpers.js';

async function startWithProxy(t, routes) {
  const upstream = await startUpstream();
  t.after(() => upstream.stop());

  const server = await startServer({
    options: `{ prefix: '/api', proxy: { server: '${upstream.url}' }, routes: ${routes} }`,
  });
  t.after(() => server.stop());

  return { server, upstream };
}

describe('proxy', () => {
  it('proxies not mocked paths and serves mocked ones', async (t) => {
    const { server } = await startWithProxy(
      t,
      `[{ active: true, path: '/mocked', data: { mocked: true } }]`
    );

    const mocked = await server.fetch('/api/mocked');
    assert.deepEqual(await mocked.json(), { mocked: true });
    assert.match(mocked.headers.get('x-api-mockup-server'), /mocked/);

    const proxied = await server.fetch('/api/other?a=1');
    assert.deepEqual(await proxied.json(), { from: 'upstream', method: 'GET', url: '/api/other?a=1' });
    assert.equal(proxied.headers.get('x-api-mockup-server'), 'proxy');
  });

  it('mocks only when applyIf returns true, otherwise proxies', async (t) => {
    const { server } = await startWithProxy(
      t,
      `[{
        active: true,
        path: '/books/:id',
        data: { mocked: true },
        applyIf: ({ params }) => params.id === '10',
      }]`
    );

    assert.deepEqual(await (await server.fetch('/api/books/10')).json(), { mocked: true });

    const proxied = await (await server.fetch('/api/books/11')).json();
    assert.equal(proxied.from, 'upstream');
  });

  it('modifies proxied response with interceptor callback', async (t) => {
    const { server } = await startWithProxy(
      t,
      `[{
        active: true,
        path: '/users/:id',
        callback: ({ data, query }) => ({ ...data, intercepted: true, q: query.q }),
      }]`
    );

    const res = await server.fetch('/api/users/5?q=x');
    assert.deepEqual(await res.json(), {
      from: 'upstream',
      method: 'GET',
      url: '/api/users/5?q=x',
      intercepted: true,
      q: 'x',
    });
    assert.equal(res.headers.get('x-api-mockup-server'), 'proxy,intercept');
  });

  it(
    'passes URL params to interceptor callback',
    { todo: 'bug: params is always {} in interceptor callback (lib/proxy.js:109)' },
    async (t) => {
      const { server } = await startWithProxy(
        t,
        `[{ active: true, path: '/users/:id', callback: ({ data, params }) => ({ ...data, params }) }]`
      );

      const res = await server.fetch('/api/users/5');
      assert.deepEqual((await res.json()).params, { id: '5' });
    }
  );

  it('proxies POST requests with JSON body', async (t) => {
    const { server, upstream } = await startWithProxy(t, `[]`);

    const res = await server.fetch('/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(upstream.requests.at(-1), { method: 'POST', url: '/api/items' });
  });
});
