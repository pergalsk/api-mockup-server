import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startServer, waitFor } from './helpers.js';

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('response headers and content type', () => {
  it('adds route headers and global headers (route wins)', async (t) => {
    const server = await startServer({
      options: `{
        headers: { 'X-Global': 'g', 'X-Both': 'global' },
        routes: [{
          active: true, path: '/books', method: 'POST', status: 201, data: { id: 30 },
          headers: { Location: '/books/30', 'X-Both': 'route' },
        }],
      }`,
    });
    t.after(() => server.stop());

    const res = await server.fetch('/books', { method: 'POST' });
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('location'), '/books/30');
    assert.equal(res.headers.get('x-global'), 'g');
    assert.equal(res.headers.get('x-both'), 'route');
    assert.match(res.headers.get('x-api-mockup-server'), /^mocked,inline/);
    assert.deepEqual(await res.json(), { id: 30 });
  });

  it('sends no body for status 204', async (t) => {
    const server = await startServer({
      options: `{ routes: [{ active: true, path: '/del', method: 'DELETE', status: 204, data: { x: 1 } }] }`,
    });
    t.after(() => server.stop());

    const res = await server.fetch('/del', { method: 'DELETE' });
    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');
    assert.ok(res.headers.get('x-api-mockup-server'));
  });

  it('sends text with custom content type', async (t) => {
    const server = await startServer({
      options: `{ routes: [{ active: true, path: '/txt', contentType: 'text/plain', data: 'Created' }] }`,
    });
    t.after(() => server.stop());

    const res = await server.fetch('/txt');
    assert.match(res.headers.get('content-type'), /^text\/plain/);
    assert.equal(await res.text(), 'Created');
  });

  it('keeps JSON content type and raw string by default', async (t) => {
    const server = await startServer({
      options: `{ routes: [{ active: true, path: '/str', data: '{"a":1}' }] }`,
    });
    t.after(() => server.stop());

    const res = await server.fetch('/str');
    assert.match(res.headers.get('content-type'), /^application\/json/);
    assert.equal(await res.text(), '{"a":1}');
  });

  it('sends file from route "file" option with content type from extension', async (t) => {
    const server = await startServer({
      options: `{ routes: [{ active: true, path: '/cover', status: 202, file: './files/cover.png' }] }`,
      files: { 'files/cover.png': PNG_BYTES },
    });
    t.after(() => server.stop());

    const res = await server.fetch('/cover');
    assert.equal(res.status, 202);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.match(res.headers.get('x-api-mockup-server'), /^mocked,file,static/);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), PNG_BYTES);
  });

  it('route "contentType" overrides type of the file', async (t) => {
    const server = await startServer({
      options: `{ routes: [{ active: true, path: '/f', file: './a.txt', contentType: 'text/csv' }] }`,
      files: { 'a.txt': 'a,b' },
    });
    t.after(() => server.stop());

    const res = await server.fetch('/f');
    assert.match(res.headers.get('content-type'), /^text\/csv/);
    assert.equal(await res.text(), 'a,b');
  });

  it('serves empty body when route file is missing', async (t) => {
    const server = await startServer({
      options: `{ routes: [{ active: true, path: '/missing', file: './nope.txt' }] }`,
    });
    t.after(() => server.stop());

    const res = await server.fetch('/missing');
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '');
  });

  it('sends non-JSON file from database folder by key', async (t) => {
    const server = await startServer({
      options: `{ routes: [{ active: true, path: '/xml', key: 'FEED' }] }`,
      files: { 'database/FEED.xml': '<feed/>' },
    });
    t.after(() => server.stop());

    const res = await server.fetch('/xml');
    assert.match(res.headers.get('content-type'), /^application\/xml/);
    assert.equal(await res.text(), '<feed/>');
  });

  it('prefers JSON file over other files with the same key', async (t) => {
    const server = await startServer({
      options: `{ routes: [{ active: true, path: '/both', key: 'BOTH' }] }`,
      files: { 'database/BOTH.json': '{"json":true}', 'database/BOTH.txt': 'text' },
    });
    t.after(() => server.stop());

    const res = await server.fetch('/both');
    assert.deepEqual(await res.json(), { json: true });
  });
});

describe('empty response warnings', () => {
  const cases = [
    {
      name: 'no data file is found for the key',
      files: {},
    },
    {
      name: 'the JSON data file has a wrong format',
      files: { 'database/MISSING.json': '{ not json' },
    },
  ];

  cases.forEach(({ name, files }) => {
    it(`logs the route path when ${name}`, async (t) => {
      const server = await startServer({
        options: `{ prefix: '/api', routes: [{ active: true, path: '/empty', key: 'MISSING' }] }`,
        files,
      });
      t.after(() => server.stop());

      await server.fetch('/api/empty');
      await waitFor(() => server.output().includes('Route "/api/empty" will be served with empty response.'));
      assert.doesNotMatch(server.output(), /%path%/);
    });
  });
});

describe('route status', () => {
  it('accepts string status without Express deprecation warning', async (t) => {
    const server = await startServer({
      options: `{ routes: [{ active: true, path: '/created', method: 'POST', status: '201', data: { id: 1 } }] }`,
    });
    t.after(() => server.stop());

    const res = await server.fetch('/created', { method: 'POST' });
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { id: 1 });
    await waitFor(() => /POST.*\/created.*ms/.test(server.output()));
    assert.doesNotMatch(server.output(), /deprecated/i);
  });

  it('does not register route with invalid status', async (t) => {
    const server = await startServer({
      options: `{ routes: [{ active: true, path: '/bad', status: 'abc', data: { x: 1 } }] }`,
    });
    t.after(() => server.stop());

    assert.match(server.output(), /Invalid status \(abc\)/);
    const res = await server.fetch('/bad');
    assert.equal(res.status, 404);
  });
});
