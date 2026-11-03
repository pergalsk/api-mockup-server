import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import nodePath from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { getFreePort, startUpstream, waitFor } from './helpers.js';

const PKG_DIR = nodePath.resolve(nodePath.dirname(fileURLToPath(import.meta.url)), '..');

const targetScript = (server) => `
  import { getProxyTarget } from './lib/cli.js';
  const target = await getProxyTarget({ server: ${server} });
  console.log('TARGET=' + target);
  process.exit(0);
`;

function runScript(t, script) {
  const run = { output: '' };
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
    cwd: PKG_DIR,
    stdio: 'pipe',
  });
  child.stdout.on('data', (chunk) => (run.output += chunk));
  child.stderr.on('data', (chunk) => (run.output += chunk));
  run.exited = new Promise((resolve) => child.on('exit', resolve));
  t.after(() => child.kill());

  // arrow down from "without proxy" to first target and confirm
  run.chooseFirstTarget = async (label) => {
    await waitFor(() => run.output.includes('Without proxy'));
    child.stdin.write('\x1b[B');
    await waitFor(() => run.output.includes(`❯ ${label}`) || run.output.includes(`> ${label}`));
    child.stdin.write('\r');
  };

  return run;
}

describe('getProxyTarget', () => {
  it('returns chosen target when stdout is not a TTY', async (t) => {
    const run = runScript(t, targetScript(`['http://first', 'http://second']`));

    await waitFor(() => run.output.includes('http://second'));
    await run.chooseFirstTarget('http://first');

    assert.equal(await run.exited, 0, run.output);
    assert.match(run.output, /TARGET=http:\/\/first/);
  });

  it('shows labels and returns url of chosen object target', async (t) => {
    const run = runScript(
      t,
      targetScript(`[
        { title: 'Integration', url: 'http://it' },
        'http://string',
        { url: 'http://no-title' },
      ]`)
    );

    await waitFor(() => run.output.includes('http://no-title'));
    assert.match(run.output, /Integration - http:\/\/it/);
    assert.doesNotMatch(run.output, / - http:\/\/string/);
    assert.doesNotMatch(run.output, / - http:\/\/no-title/);
    await run.chooseFirstTarget('Integration - http://it');

    assert.equal(await run.exited, 0, run.output);
    assert.match(run.output, /TARGET=http:\/\/it(\r?\n|$)/);
  });

  it('skips invalid items in the list with warning', async (t) => {
    const run = runScript(
      t,
      targetScript(`[{ title: 'Broken' }, 'http://first', { url: 5 }, 'http://second']`)
    );

    await waitFor(() => run.output.includes('http://second'));
    assert.equal(run.output.match(/Invalid proxy target skipped/g).length, 2);
    await run.chooseFirstTarget('http://first');

    assert.equal(await run.exited, 0, run.output);
    assert.match(run.output, /TARGET=http:\/\/first/);
  });

  it('proxies to url of chosen object target', async (t) => {
    const upstream = await startUpstream();
    t.after(() => upstream.stop());
    const port = await getFreePort();

    const run = runScript(
      t,
      `import amServer from './index.js';
      amServer({
        port: ${port},
        routes: [],
        proxy: { server: [{ title: 'Integration', url: '${upstream.url}' }, 'http://second'] },
      });`
    );

    await run.chooseFirstTarget(`Integration - ${upstream.url}`);

    const res = await waitFor(() => fetch(`http://localhost:${port}/other`));
    assert.equal((await res.json()).from, 'upstream');
    assert.deepEqual(upstream.requests.at(-1), { method: 'GET', url: '/other' });
    await waitFor(() => run.output.includes(`Proxy target:  Integration - ${upstream.url}`));
  });
});
