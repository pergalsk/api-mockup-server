import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startServer, startUpstream, waitFor } from './helpers.js';

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

  it('skips route with invalid path and proxies its requests', async (t) => {
    const { server } = await startWithProxy(
      t,
      `[
        { active: true, path: '/old/:id?', data: { old: true } },
        { active: true, path: '/mocked', data: { mocked: true } },
      ]`
    );

    assert.match(server.output(), /Invalid route path "\/api\/old\/:id\?"/);
    const proxied = await server.fetch('/api/old/1');
    assert.deepEqual(await proxied.json(), { from: 'upstream', method: 'GET', url: '/api/old/1' });
    assert.deepEqual(await (await server.fetch('/api/mocked')).json(), { mocked: true });
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
    async (t) => {
      const { server } = await startWithProxy(
        t,
        `[{ active: true, path: '/users/:id', callback: ({ data, params }) => ({ ...data, params }) }]`
      );

      for (const id of ['5', 'name with spaces', 'another']) {
        const res = await server.fetch(`/api/users/${encodeURIComponent(id)}?q=ignored`);
        assert.deepEqual((await res.json()).params, { id });
      }
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
    assert.deepEqual(JSON.parse(upstream.bodies.at(-1)), { name: 'x' });
  });

  it('proxies PUT requests with JSON and urlencoded body', async (t) => {
    const { server, upstream } = await startWithProxy(t, `[]`);

    await server.fetch('/api/items/1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'y' }),
    });
    assert.deepEqual(upstream.requests.at(-1), { method: 'PUT', url: '/api/items/1' });
    assert.deepEqual(JSON.parse(upstream.bodies.at(-1)), { name: 'y' });

    await server.fetch('/api/items/2', {
      method: 'PUT',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'a=1&b=two',
    });
    assert.equal(upstream.bodies.at(-1), 'a=1&b=two');
  });

  it('passes POST body to interceptor callback', async (t) => {
    const { server, upstream } = await startWithProxy(
      t,
      `[{ active: true, method: 'POST', path: '/items', callback: ({ data, body }) => ({ ...data, body }) }]`
    );

    const res = await server.fetch('/api/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'z' }),
    });
    assert.deepEqual((await res.json()).body, { name: 'z' });
    assert.deepEqual(JSON.parse(upstream.bodies.at(-1)), { name: 'z' });
    assert.equal(res.headers.get('x-api-mockup-server'), 'proxy,intercept');
  });

  it('proxies without util._extend deprecation warning (DEP0060)', async (t) => {
    const { server } = await startWithProxy(t, `[]`);

    await server.fetch('/api/other');
    assert.doesNotMatch(server.output(), /DEP0060/);
  });

  it('uses single object server without CLI choice and shows its title', async (t) => {
    const upstream = await startUpstream();
    t.after(() => upstream.stop());

    const server = await startServer({
      options: `{ proxy: { server: { title: 'Integration', url: '${upstream.url}' } }, routes: [] }`,
    });
    t.after(() => server.stop());

    assert.equal((await (await server.fetch('/other')).json()).from, 'upstream');
    await waitFor(() => server.output().includes(`Integration - ${upstream.url}`));
  });

  it('skips invalid targets with warning', async (t) => {
    const upstream = await startUpstream();
    t.after(() => upstream.stop());

    const server = await startServer({
      options: `{ proxy: { server: [{ title: 'Broken' }, { url: 5 }, null, '${upstream.url}'] }, routes: [] }`,
    });
    t.after(() => server.stop());

    assert.equal((await (await server.fetch('/other')).json()).from, 'upstream');
    assert.equal(server.output().match(/Invalid proxy target skipped/g).length, 3);
  });

  it('warns and runs without proxy when single object server is invalid', async (t) => {
    const server = await startServer({
      options: `{ proxy: { server: { title: 'Broken' } }, routes: [] }`,
    });
    t.after(() => server.stop());

    assert.match(server.output(), /Invalid proxy target skipped/);
    await waitFor(() => server.output().includes('Not configured.'));
  });

  it('proxies path of route with invalid status (route is not registered)', async (t) => {
    const { server } = await startWithProxy(t, `[{ active: true, path: '/bad', status: 'abc', data: { x: 1 } }]`);

    const res = await server.fetch('/api/bad');
    assert.equal((await res.json()).from, 'upstream');
    assert.equal(res.headers.get('x-api-mockup-server'), 'proxy');
  });
});
