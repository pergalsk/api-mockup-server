import assert from 'node:assert/strict';
import nodeFs from 'node:fs';
import nodeOs from 'node:os';
import nodePath from 'node:path';
import { describe, it } from 'node:test';

import amServer from '../index.js';
import { startUpstream, waitFor } from './helpers.js';

const routes = [{ active: true, path: '/v', data: { v: 1 } }];

describe('server handle (in the same process)', () => {
  it('starts on a random port with port 0 and stops with close()', async () => {
    const server = await amServer({ port: 0, routes, silent: true });

    assert.ok(server.port > 0);
    assert.equal(server.url, `http://localhost:${server.port}`);

    const res = await fetch(`${server.url}/v`);
    assert.deepEqual(await res.json(), { v: 1 });

    await server.close();
    await assert.rejects(() => fetch(`${server.url}/v`));

    // second close() is fine
    await server.close();
  });

  it('starts again in the same process after close()', async () => {
    for (const v of [1, 2]) {
      const server = await amServer({ port: 0, routes: [{ active: true, path: '/v', data: { v } }], silent: true });
      const res = await fetch(`${server.url}/v`);
      assert.deepEqual(await res.json(), { v });
      await server.close();
    }
  });

  it('rejects when the port is in use (process keeps running)', async (t) => {
    const upstream = await startUpstream();
    t.after(() => upstream.stop());
    const usedPort = Number(new URL(upstream.url).port);

    await assert.rejects(() => amServer({ port: usedPort, routes, silent: true }), {
      code: 'EADDRINUSE',
      message: new RegExp(`Port ${usedPort} is already in use`),
    });
  });

  it('keeps port and url after hot reload restart', async (t) => {
    const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'amserver-handle-'));
    t.after(() => nodeFs.rmSync(dir, { recursive: true, force: true }));
    const routesFile = nodePath.join(dir, 'routes.cjs');
    const routesSource = (v) => `module.exports = [{ active: true, path: '/v', data: { v: ${v} } }];\n`;
    nodeFs.writeFileSync(routesFile, routesSource(1));

    const server = await amServer({ port: 0, routes: routesFile, database: dir, silent: true });
    t.after(() => server.close());
    const { port, url } = server;

    nodeFs.writeFileSync(routesFile, routesSource(2));
    await waitFor(async () => (await (await fetch(`${url}/v`)).json()).v === 2);

    assert.equal(server.port, port);
    assert.equal(server.url, url);
  });

  it('logs nothing with silent option', async (t) => {
    const consoleLog = t.mock.method(console, 'log', () => {});

    const server = await amServer({ port: 0, routes, silent: true });
    await fetch(`${server.url}/v`);
    await server.close();

    assert.equal(consoleLog.mock.callCount(), 0);
  });

  it('uses the first proxy target without prompt when interactive is false', async (t) => {
    const first = await startUpstream({ name: 'first' });
    const second = await startUpstream({ name: 'second' });
    t.after(() => Promise.all([first.stop(), second.stop()]));

    const server = await amServer({
      port: 0,
      routes,
      proxy: { server: [first.url, second.url] },
      interactive: false,
      silent: true,
    });
    t.after(() => server.close());

    const res = await fetch(`${server.url}/not-mocked`);
    assert.equal((await res.json()).name, 'first');
  });
});
