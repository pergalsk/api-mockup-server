import { spawn } from 'node:child_process';
import nodeFs from 'node:fs';
import nodeHttp from 'node:http';
import nodeNet from 'node:net';
import nodeOs from 'node:os';
import nodePath from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PKG_DIR = nodePath.resolve(nodePath.dirname(fileURLToPath(import.meta.url)), '..');
const BIN_PATH = nodePath.join(PKG_DIR, 'bin', 'api-mockup-server.js');
const WAIT_TIMEOUT_MS = 10000;
const POLL_INTERVAL_MS = 100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gets a free TCP port from the OS.
 * @returns {Promise<number>} free port
 */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = nodeNet.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Writes files into a new temp directory.
 * @param {Object<string, string>} files map of relative path -> content
 * @returns {string} temp directory path
 */
function createFixture(files = {}) {
  const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'amserver-test-'));
  Object.entries(files).forEach(([name, content]) => writeFile(dir, name, content));
  return dir;
}

function writeFile(dir, name, content) {
  const filePath = nodePath.join(dir, name);
  nodeFs.mkdirSync(nodePath.dirname(filePath), { recursive: true });
  nodeFs.writeFileSync(filePath, content);
}

/**
 * Starts API Mockup Server in a child process (it has global state and watchers,
 * so each server needs its own process).
 * @param {Object} params
 * @param {string} params.options server options as JS object literal source (without port)
 * @param {Object<string, string>} [params.files] fixture files (routes, db, ...)
 * @param {'esm'|'cjs'} [params.moduleType] how the package is loaded: import or require
 * @returns {Promise<Object>} server handle: { port, dir, url(), fetch(), writeFile(), output(), stop() }
 */
async function startServer({ options, files = {}, moduleType = 'esm' }) {
  const port = await getFreePort();
  const dir = createFixture(files);

  const config = `{ port: ${port}, ...${options} }`;
  const script =
    moduleType === 'cjs'
      ? `const amServer = require(${JSON.stringify(PKG_DIR)});\n` +
        `console.log('typeof amServer:', typeof amServer);\namServer(${config});\n`
      : `import amServer from ${JSON.stringify(pathToFileURL(nodePath.join(PKG_DIR, 'index.js')).href)};\n` +
        `console.log('typeof amServer:', typeof amServer);\namServer(${config});\n`;
  const scriptName = moduleType === 'cjs' ? '__server.cjs' : '__server.mjs';
  writeFile(dir, scriptName, script);

  return runServer({ dir, port, scriptName });
}

/**
 * Starts an example from `examples/<name>` in a child process. The example is copied
 * into a temp directory (so tests can edit its files) with `api-mockup-server` linked
 * in its node_modules (so `npm install` is not needed).
 * @param {string} name example folder name
 * @param {Object<string, string>} [env] extra env vars (e.g. PROXY_TARGET)
 * @returns {Promise<Object>} server handle (same as startServer)
 */
async function startExample(name, env = {}) {
  const port = await getFreePort();
  const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), `amserver-example-${name}-`));

  nodeFs.cpSync(nodePath.join(PKG_DIR, 'examples', name), dir, {
    recursive: true,
    filter: (src) => !/node_modules|package-lock\.json/.test(nodePath.basename(src)),
  });
  nodeFs.mkdirSync(nodePath.join(dir, 'node_modules'));
  nodeFs.symlinkSync(PKG_DIR, nodePath.join(dir, 'node_modules', 'api-mockup-server'), 'junction');

  return runServer({ dir, port, scriptName: 'server.js', env: { PORT: String(port), ...env } });
}

/**
 * Starts the command-line tool in a child process.
 * @param {Object} params
 * @param {number} params.port port on which the server is expected to listen
 * @param {string[]} params.args command-line arguments
 * @param {Object<string, string>} [params.files] fixture files (config, routes, db, ...)
 * @returns {Promise<Object>} server handle (same as startServer)
 */
async function startCli({ port, args, files = {} }) {
  const dir = createFixture(files);
  return runServer({ dir, port, scriptName: BIN_PATH, args });
}

/**
 * Runs server script in a child process and waits until it responds.
 * @returns {Promise<Object>} server handle: { port, dir, url(), fetch(), writeFile(), output(), stop() }
 */
async function runServer({ dir, port, scriptName, args = [], env = {} }) {
  let output = '';
  const child = spawn(process.execPath, [scriptName, ...args], {
    cwd: dir,
    stdio: 'pipe',
    // no colors (`node --test` sets FORCE_COLOR in a terminal, color codes break output checks)
    env: { ...process.env, FORCE_COLOR: '0', ...env },
  });
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const exited = new Promise((resolve) => child.on('exit', resolve));

  const url = (path) => `http://localhost:${port}${path}`;

  const server = {
    port,
    dir,
    url,
    fetch: (path, init) => fetch(url(path), init),
    writeFile: (name, content) => writeFile(dir, name, content),
    writeStdin: (text) => child.stdin.write(text),
    output: () => output,
    isRunning: () => child.exitCode === null,
    stop: async () => {
      if (child.exitCode === null) {
        child.kill();
        await exited;
      }
      nodeFs.rmSync(dir, { recursive: true, force: true });
    },
  };

  try {
    await waitFor(async () => {
      if (child.exitCode !== null) {
        throw new Error('server process exited');
      }
      await fetch(url('/__ping__'));
      return true;
    });
  } catch (e) {
    await server.stop();
    throw new Error(`Server did not start: ${e.message}\n${output}`, { cause: e });
  }

  return server;
}

/**
 * Repeats `fn` until it returns a truthy value (errors are retried too).
 * @param {Function} fn async check function
 * @param {number} [timeout] max wait time in ms
 * @returns {Promise<*>} first truthy result
 */
async function waitFor(fn, timeout = WAIT_TIMEOUT_MS) {
  const end = Date.now() + timeout;
  let lastError;
  while (Date.now() < end) {
    try {
      const result = await fn();
      if (result) {
        return result;
      }
    } catch (e) {
      lastError = e;
      if (e.message === 'server process exited') {
        throw e;
      }
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw lastError || new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Starts a fake upstream server for proxy tests. Responds with JSON describing the request.
 * @param {Object} [extra] extra fields added to every response
 * @returns {Promise<Object>} { url, requests, bodies, stop() }
 */
async function startUpstream(extra = {}) {
  const requests = [];
  const bodies = [];
  const srv = nodeHttp.createServer(async (req, res) => {
    requests.push({ method: req.method, url: req.url });
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    bodies.push(body);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ from: 'upstream', method: req.method, url: req.url, ...extra }));
  });
  await new Promise((resolve) => srv.listen(0, resolve));
  const { port } = srv.address();

  return {
    url: `http://localhost:${port}`,
    requests,
    bodies,
    stop:() => new Promise((resolve) => srv.close(resolve)),
  };
}

export { BIN_PATH, createFixture, getFreePort, startServer, startExample, startCli, startUpstream, waitFor };
