import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import nodeFs from 'node:fs';
import nodeOs from 'node:os';
import nodePath from 'node:path';
import { describe, it } from 'node:test';

import pkg from '../package.json' with { type: 'json' };
import { BIN_PATH, getFreePort, startCli, startUpstream, waitFor } from './helpers.js';

const routesFile = (data) =>
  `module.exports = [{ active: true, path: '/v', data: ${JSON.stringify(data)} }];\n`;
const jsonConfig = (config) => JSON.stringify(config);
const getJson = async (server, path) => (await server.fetch(path)).json();

function runCli(args, files = {}) {
  const cwd = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'amserver-bin-'));
  Object.entries(files).forEach(([name, content]) =>
    nodeFs.writeFileSync(nodePath.join(cwd, name), content),
  );
  const { status, stdout, stderr } = spawnSync(process.execPath, [BIN_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 10000,
  });
  nodeFs.rmSync(cwd, { recursive: true, force: true });
  return { status, output: stdout + stderr };
}

describe('command-line: info and errors', () => {
  it('shows help', () => {
    for (const flag of ['--help', '-h']) {
      const { status, output } = runCli([flag]);
      assert.equal(status, 0);
      assert.match(output, /Usage: api-mockup-server/);
      for (const name of ['config', 'port', 'routes', 'database', 'prefix', 'proxy', 'help', 'version']) {
        assert.match(output, new RegExp(`--${name}`));
      }
    }
  });

  it('shows version', () => {
    for (const flag of ['--version', '-v']) {
      const { status, output } = runCli([flag]);
      assert.equal(status, 0);
      assert.equal(output.trim(), pkg.version);
    }
  });

  it('exits with error on wrong flags', () => {
    for (const args of [['--unknown'], ['--port', 'abc'], ['--port']]) {
      const { status, output } = runCli(args);
      assert.equal(status, 1, args.join(' '));
      assert.match(output, /ERROR: .*\n.*--help/);
    }
  });

  it('exits with error on wrong config file', () => {
    const cases = [
      [{}, 'missing.json', /File not found/],
      [{ 'broken.json': '{' }, 'broken.json', /was not loaded/],
      [{ 'broken.mjs': 'export default {' }, 'broken.mjs', /was not loaded/],
      [{ 'list.json': '[]' }, 'list.json', /must export an object/],
      [{ 'port.json': '{ "port": "abc" }' }, 'port.json', /Invalid port/],
    ];

    for (const [files, name, message] of cases) {
      const { status, output } = runCli(['--config', name], files);
      assert.equal(status, 1, name);
      assert.match(output, /ERROR: Config file/);
      assert.match(output, message);
    }
  });
});

describe('command-line: options', () => {
  it('starts with flags only', async (t) => {
    const port = await getFreePort();
    const server = await startCli({
      port,
      args: ['-p', String(port), '-r', 'my-routes.cjs', '-d', 'my-db', '-f', '/api'],
      files: {
        'my-routes.cjs': `module.exports = [{ active: true, path: '/book', key: 'BOOK' }];\n`,
        'my-db/BOOK.json': jsonConfig({ title: 'Book' }),
      },
    });
    t.after(() => server.stop());

    assert.deepEqual(await getJson(server, '/api/book'), { title: 'Book' });
  });

  it('accepts absolute paths for routes and database', async (t) => {
    const port = await getFreePort();
    const external = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'amserver-external-'));
    t.after(() => nodeFs.rmSync(external, { recursive: true, force: true }));
    nodeFs.writeFileSync(
      nodePath.join(external, 'routes.cjs'),
      `module.exports = [{ active: true, path: '/book', key: 'BOOK' }];\n`,
    );
    nodeFs.writeFileSync(nodePath.join(external, 'BOOK.json'), jsonConfig({ external: true }));

    const server = await startCli({
      port,
      args: ['-p', String(port), '-r', nodePath.join(external, 'routes.cjs'), '-d', external],
    });
    t.after(() => server.stop());

    assert.deepEqual(await getJson(server, '/book'), { external: true });
  });

  for (const [name, content] of [
    ['config.json', (config) => JSON.stringify(config)],
    ['config.cjs', (config) => `module.exports = ${JSON.stringify(config)};\n`],
    ['config.mjs', (config) => `export default ${JSON.stringify(config)};\n`],
    ['config.js', (config) => `export default ${JSON.stringify(config)};\n`],
  ]) {
    it(`loads and hot reloads ${name}`, async (t) => {
      const port = await getFreePort();
      const server = await startCli({
        port,
        args: ['--config', name],
        files: {
          [name]: content({ port, prefix: '/one', routes: 'routes.cjs' }),
          'routes.cjs': routesFile({ v: 1 }),
        },
      });
      t.after(() => server.stop());

      assert.deepEqual(await getJson(server, '/one/v'), { v: 1 });

      server.writeFile(name, content({ port, prefix: '/two', routes: 'routes.cjs' }));
      await waitFor(async () => (await server.fetch('/two/v')).status === 200);

      server.writeFile(name, content({ port, prefix: '/three', routes: 'routes.cjs' }));
      await waitFor(async () => (await server.fetch('/three/v')).status === 200);
    });
  }

  it('uses priority: flag > config > default', async (t) => {
    const port = await getFreePort();
    const configPort = await getFreePort();
    const server = await startCli({
      port,
      args: ['-c', 'config.json', '-p', String(port), '-f', '/flag'],
      files: {
        'config.json': jsonConfig({
          port: configPort,
          prefix: '/config',
          routes: 'routes.cjs',
          mockHeader: false,
        }),
        'routes.cjs': `module.exports = [
          { active: true, path: '/v', data: { v: 1 } },
          { active: true, path: '/book', key: 'BOOK' },
        ];\n`,
        // default database folder
        'database/BOOK.json': jsonConfig({ fromDefault: true }),
      },
    });
    t.after(() => server.stop());

    // flag wins over config: port, prefix
    const res = await server.fetch('/flag/v');
    assert.deepEqual(await res.json(), { v: 1 });
    assert.equal((await server.fetch('/config/v')).status, 404);
    // config wins over default: mockHeader
    assert.equal(res.headers.get('x-api-mockup-server'), null);
    // default is used when there is no flag and no config value: database
    assert.deepEqual(await getJson(server, '/flag/book'), { fromDefault: true });
  });

  it('--proxy replaces proxy targets from config (no interactive choice)', async (t) => {
    const upstream = await startUpstream();
    t.after(() => upstream.stop());
    const port = await getFreePort();
    const server = await startCli({
      port,
      args: ['-c', 'config.json', '--proxy', upstream.url],
      files: {
        'config.json': jsonConfig({ port, proxy: { server: ['http://one', 'http://two'] } }),
      },
    });
    t.after(() => server.stop());

    assert.equal((await getJson(server, '/other')).from, 'upstream');
    assert.doesNotMatch(server.output(), /Without proxy/);
  });
});

describe('command-line: config hot reload', () => {
  it('flags still win over new config values', async (t) => {
    const port = await getFreePort();
    const server = await startCli({
      port,
      args: ['-c', 'config.json', '-f', '/flag'],
      files: {
        'config.json': jsonConfig({ port, prefix: '/a', routes: 'routes.cjs', mockHeader: true }),
        'routes.cjs': routesFile({ v: 1 }),
      },
    });
    t.after(() => server.stop());

    const before = await server.fetch('/flag/v');
    assert.match(before.headers.get('x-api-mockup-server'), /mocked/);

    server.writeFile(
      'config.json',
      jsonConfig({ port, prefix: '/b', routes: 'routes.cjs', mockHeader: false }),
    );
    // mockHeader comes from new config, prefix is still from the flag
    await waitFor(async () => {
      const res = await server.fetch('/flag/v');
      return res.status === 200 && res.headers.get('x-api-mockup-server') === null;
    });
    assert.equal((await server.fetch('/b/v')).status, 404);
  });

  it('listens on the new port', async (t) => {
    let server;
    let newPort;
    // another test file can take the new port before the server uses it
    // (server then stops with "port in use"), so try again with another port
    for (let attempt = 1; attempt <= 3; attempt++) {
      const port = await getFreePort();
      server = await startCli({
        port,
        args: ['-c', 'config.json'],
        files: {
          'config.json': jsonConfig({ port, routes: 'routes.cjs' }),
          'routes.cjs': routesFile({ v: 1 }),
        },
      });
      t.after(server.stop);

      newPort = await getFreePort();
      server.writeFile('config.json', jsonConfig({ port: newPort, routes: 'routes.cjs' }));

      // stop waiting at once when the server process exits
      await waitFor(
        () => !server.isRunning() || server.output().includes(`Server port:   ${newPort}`),
      );
      if (server.isRunning()) {
        break;
      }
    }
    assert.ok(server.isRunning(), `server stopped:\n${server.output()}`);

    // new server config is logged only when the new server listens
    const res = await fetch(`http://localhost:${newPort}/v`);
    assert.deepEqual(await res.json(), { v: 1 });
    await assert.rejects(() => server.fetch('/v'));
  });

  it('logs new server config only when the new server listens', async (t) => {
    const port = await getFreePort();
    const server = await startCli({
      port,
      args: ['-c', 'config.json'],
      files: {
        'config.json': jsonConfig({ port, prefix: '/one', routes: 'routes.cjs' }),
        'routes.cjs': routesFile({ v: 1 }),
      },
    });
    t.after(() => server.stop());

    server.writeFile('config.json', jsonConfig({ port, prefix: '/two', routes: 'routes.cjs' }));

    // check output often, so the request is sent right after the log line
    const end = Date.now() + 10000;
    while (server.output().match(/Proxy target:/g).length < 2 && Date.now() < end) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    // single request, no retry
    assert.deepEqual(await getJson(server, '/two/v'), { v: 1 });
  });

  it('stops with an error when the new port is already in use', async (t) => {
    const upstream = await startUpstream();
    t.after(() => upstream.stop());
    const usedPort = Number(new URL(upstream.url).port);
    const port = await getFreePort();
    const server = await startCli({
      port,
      args: ['-c', 'config.json'],
      files: { 'config.json': jsonConfig({ port }) },
    });
    t.after(() => server.stop());

    server.writeFile('config.json', jsonConfig({ port: usedPort }));

    await waitFor(() => !server.isRunning());
    assert.match(server.output(), new RegExp(`Port ${usedPort} is already in use`));
  });

  it('watches new routes file and new database folder', async (t) => {
    const port = await getFreePort();
    const keyRoutes = (extra) =>
      `module.exports = [{ active: true, path: '/book', key: 'BOOK', status: 200 }, ${extra}];\n`;
    const server = await startCli({
      port,
      args: ['-c', 'config.json'],
      files: {
        'config.json': jsonConfig({ port, routes: 'old.cjs', database: 'db1' }),
        'old.cjs': keyRoutes(''),
        'new.cjs': keyRoutes(''),
        'db1/BOOK.json': jsonConfig({ db: 1 }),
        'db2/BOOK.json': jsonConfig({ db: 2 }),
      },
    });
    t.after(() => server.stop());

    assert.deepEqual(await getJson(server, '/book'), { db: 1 });

    server.writeFile('config.json', jsonConfig({ port, routes: 'new.cjs', database: 'db2' }));
    await waitFor(async () => (await getJson(server, '/book')).db === 2);

    server.writeFile('new.cjs', keyRoutes(`{ active: true, path: '/added', data: { added: true } }`));
    await waitFor(async () => (await server.fetch('/added')).status === 200);

    server.writeFile('db2/BOOK.json', jsonConfig({ db: 22 }));
    await waitFor(() => server.output().includes('BOOK.json" has been changed'));
  });

  it('applies changed cors option', async (t) => {
    const port = await getFreePort();
    const config = (cors) => jsonConfig({ port, cors, routes: 'routes.cjs' });
    const server = await startCli({
      port,
      args: ['-c', 'config.json'],
      files: { 'config.json': config(true), 'routes.cjs': routesFile({ v: 1 }) },
    });
    t.after(() => server.stop());

    const before = await server.fetch('/v');
    assert.equal(before.headers.get('access-control-allow-origin'), '*');

    server.writeFile('config.json', config(false));
    await waitFor(async () => {
      const res = await server.fetch('/v');
      return res.headers.get('access-control-allow-origin') === null;
    });
  });

  it('changes proxy target without interactive choice', async (t) => {
    const first = await startUpstream({ name: 'first' });
    const second = await startUpstream({ name: 'second' });
    t.after(() => first.stop());
    t.after(() => second.stop());
    const port = await getFreePort();
    const server = await startCli({
      port,
      args: ['-c', 'config.json'],
      files: { 'config.json': jsonConfig({ port, proxy: { server: first.url } }) },
    });
    t.after(() => server.stop());

    assert.equal((await getJson(server, '/x')).name, 'first');

    // only one target: it is used
    server.writeFile('config.json', jsonConfig({ port, proxy: { server: second.url } }));
    await waitFor(async () => (await getJson(server, '/x')).name === 'second');

    // current target is still in the list: it stays
    server.writeFile(
      'config.json',
      jsonConfig({ port, proxy: { server: [first.url, second.url] } }),
    );
    await waitFor(() => server.output().match(/has been changed/g).length === 2);
    await waitFor(() => server.output().match(/Proxy target:/g).length === 3);
    await waitFor(async () => (await getJson(server, '/x')).name === 'second');

    // current target was removed and there is more targets: no proxy, with warning
    server.writeFile(
      'config.json',
      jsonConfig({ port, proxy: { server: [first.url, 'http://other'] } }),
    );
    await waitFor(async () => (await server.fetch('/x')).status === 404);
    assert.match(server.output(), /is not in config anymore/);
  });

  it('keeps old config when new config is broken', async (t) => {
    const port = await getFreePort();
    const config = (prefix) => jsonConfig({ port, prefix, routes: 'routes.cjs' });
    const server = await startCli({
      port,
      args: ['-c', 'config.json'],
      files: { 'config.json': config('/old'), 'routes.cjs': routesFile({ v: 1 }) },
    });
    t.after(() => server.stop());

    const broken = ['{', '[]', jsonConfig({ port: 99999, prefix: '/bad' })];

    for (const [index, content] of broken.entries()) {
      server.writeFile('config.json', content);
      await waitFor(() => server.output().match(/was not reloaded/g)?.length === index + 1);
      assert.deepEqual(await getJson(server, '/old/v'), { v: 1 });
    }

    assert.ok(server.isRunning());

    server.writeFile('config.json', config('/new'));
    await waitFor(async () => (await server.fetch('/new/v')).status === 200);
  });

  it('keeps old config when config file is deleted, loads it when added back', async (t) => {
    const port = await getFreePort();
    const config = (prefix) => jsonConfig({ port, prefix, routes: 'routes.cjs' });
    const server = await startCli({
      port,
      args: ['-c', 'config.json'],
      files: { 'config.json': config('/old'), 'routes.cjs': routesFile({ v: 1 }) },
    });
    t.after(() => server.stop());

    nodeFs.rmSync(nodePath.join(server.dir, 'config.json'));
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.deepEqual(await getJson(server, '/old/v'), { v: 1 });

    server.writeFile('config.json', config('/new'));
    await waitFor(async () => (await server.fetch('/new/v')).status === 200);
  });
});
