import assert from 'node:assert/strict';
import nodeFs from 'node:fs';
import nodePath from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { startExample, startUpstream, waitFor } from './helpers.js';

const EXAMPLES_DIR = nodePath.resolve(
  nodePath.dirname(fileURLToPath(import.meta.url)),
  '..',
  'examples'
);

const getJson = async (server, path, init) => (await server.fetch(path, init)).json();

const postJson = (server, path, body) =>
  server.fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

// basic and cjs examples have the same routes
for (const name of ['basic', 'cjs']) {
  describe(`${name} example`, () => {
    let server;
    before(async () => (server = await startExample(name)));
    after(() => server.stop());

    it('serves books list', async () => {
      const res = await server.fetch('/api/books/all');
      assert.equal(res.status, 200);
      const books = await res.json();
      assert.equal(books.length, 6);
      assert.deepEqual(books[0], {
        id: 1,
        title: 'Robinson Crusoe',
        authorId: 1,
        year: 1719,
        genre: 'Adventure',
        available: true,
      });
    });

    it('serves book detail for any id', async () => {
      const book = await getJson(server, '/api/books/7');
      assert.equal(book.title, 'Robinson Crusoe');
      assert.deepEqual(book.author, { id: 1, name: 'Daniel Defoe' });
      assert.deepEqual(book.tags, ['adventure', 'island', 'survival']);
      assert.equal(book.series, null);
    });

    it('returns 400 with validation error for POST /authors', async () => {
      const res = await server.fetch('/api/authors', { method: 'POST' });
      assert.equal(res.status, 400);
      const err = await res.json();
      assert.equal(err.errorCode, 'VALIDATION_ERROR');
      assert.equal(err.details[0].field, 'name');
    });

    it('returns 404 for unknown path and path without prefix', async () => {
      assert.equal((await server.fetch('/api/unknown')).status, 404);
      assert.equal((await server.fetch('/books/all')).status, 404);
    });
  });
}

describe('cjs example source', () => {
  it('loads the package with require()', () => {
    const dir = nodePath.join(EXAMPLES_DIR, 'cjs');
    const source = nodeFs.readFileSync(nodePath.join(dir, 'server.js'), 'utf8');
    const pkg = JSON.parse(nodeFs.readFileSync(nodePath.join(dir, 'package.json'), 'utf8'));
    assert.match(source, /require\('api-mockup-server'\)/);
    assert.equal(pkg.type, 'commonjs');
  });
});

describe('extended example', () => {
  let server;
  before(async () => (server = await startExample('extended')));
  after(() => server.stop());

  it('serves books from db file with timestamp from callback', async () => {
    const books = await getJson(server, '/api/v1/books/all');
    assert.equal(books.length, 12);
    assert.ok(books.every((book) => typeof book._t === 'number'));
  });

  it('delays mocked responses', async () => {
    const start = Date.now();
    await server.fetch('/api/v1/books/all');
    assert.ok(Date.now() - start >= 500);
  });

  it('filters books by query param', async () => {
    const books = await getJson(server, '/api/v1/books/search?genre=Romance');
    assert.deepEqual(
      books.map((book) => book.title),
      ['Pride and Prejudice', 'Emma', 'Sense and Sensibility']
    );
    assert.equal((await getJson(server, '/api/v1/books/search')).length, 12);
  });

  it('serves book detail with id from URL on route prefix', async () => {
    const book = await getJson(server, '/api/v2/books/7');
    assert.equal(book.id, 7);
    assert.equal(book.author.name, 'Daniel Defoe');
    assert.equal((await server.fetch('/api/v1/books/7')).status, 404);
  });

  it('creates book from request body (POST 200)', async () => {
    const res = await postJson(server, '/api/v1/books', { title: 'Ivanhoe', authorId: 8 });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      title: 'Ivanhoe',
      authorId: 8,
      id: 13,
      available: true,
      createdAt: '2026-11-03T12:00:00Z',
    });
  });

  it('returns 400 data file for PUT', async () => {
    const res = await server.fetch('/api/v1/books/10', { method: 'PUT' });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).details.length, 2);
  });

  it('deletes book (DELETE 200)', async () => {
    const res = await server.fetch('/api/v1/books/10', { method: 'DELETE' });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { deleted: true, id: 10 });
  });

  it('serves changed db file without restart', async () => {
    server.writeFile('db/BOOKS_ALL.json', JSON.stringify([{ id: 1, genre: 'Romance' }]));
    assert.equal((await getJson(server, '/api/v1/books/search')).length, 1);
  });

  it('hot reloads routes file (disabled route turned on)', async () => {
    assert.equal((await server.fetch('/api/v1/authors')).status, 404);

    const routesPath = nodePath.join(server.dir, 'routes.js');
    const routes = nodeFs.readFileSync(routesPath, 'utf8');
    server.writeFile('routes.js', routes.replace('active: false', 'active: true'));

    await waitFor(async () => (await server.fetch('/api/v1/authors')).status === 200);
    const authors = await getJson(server, '/api/v1/authors');
    assert.equal(authors.length, 7);
    assert.deepEqual(authors[0].bookIds, [1, 10]);
  });
});

describe('proxy example', () => {
  let server;
  let upstream;
  before(async () => {
    upstream = await startUpstream({ title: 'hello', completed: true });
    server = await startExample('proxy', { PROXY_TARGET: upstream.url });
  });
  after(async () => {
    await server.stop();
    await upstream.stop();
  });

  it('serves mocked route without calling proxy target', async () => {
    const res = await server.fetch('/users/1');
    assert.deepEqual(await res.json(), { id: 1, name: '__MOCKED USER__' });
    assert.match(res.headers.get('x-api-mockup-server'), /mocked/);
    assert.ok(!upstream.requests.some((req) => req.url === '/users/1'));
  });

  it('proxies not mocked paths', async () => {
    const res = await server.fetch('/users/2');
    assert.equal((await res.json()).from, 'upstream');
    assert.equal(res.headers.get('x-api-mockup-server'), 'proxy');
  });

  it('intercepts proxied posts', async () => {
    const res = await server.fetch('/posts/1');
    const post = await res.json();
    assert.equal(post.title, 'HELLO');
    assert.equal(post.intercepted, true);
    assert.equal(res.headers.get('x-api-mockup-server'), 'proxy,intercept');
  });

  it('intercepts proxied todos', async () => {
    const todo = await getJson(server, '/todos/1');
    assert.equal(todo.from, 'upstream');
    assert.equal(todo.status, 'done');
  });

  it('mocks POST with 200 without calling proxy target', async () => {
    const res = await postJson(server, '/posts', { title: 'Hello', userId: 1 });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { title: 'Hello', userId: 1, id: 101 });
    assert.ok(!upstream.requests.some((req) => req.method === 'POST'));
  });

  it('mocks PUT error with 500', async () => {
    const res = await server.fetch('/posts/1', { method: 'PUT' });
    assert.equal(res.status, 500);
    assert.equal((await res.json()).errorCode, 'SERVER_ERROR');
  });
});
