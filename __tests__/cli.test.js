import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import nodePath from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { waitFor } from './helpers.js';

const PKG_DIR = nodePath.resolve(nodePath.dirname(fileURLToPath(import.meta.url)), '..');

const SCRIPT = `
  import { getProxyTarget } from './lib/cli.js';
  const target = await getProxyTarget({ server: ['http://first', 'http://second'] });
  console.log('TARGET=' + target);
  process.exit(0);
`;

describe('getProxyTarget', () => {
  it('returns chosen target when stdout is not a TTY', async (t) => {
    let output = '';
    const child = spawn(process.execPath, ['--input-type=module', '-e', SCRIPT], {
      cwd: PKG_DIR,
      stdio: 'pipe',
    });
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    const exited = new Promise((resolve) => child.on('exit', resolve));
    t.after(() => child.kill());

    await waitFor(() => output.includes('http://second'));
    child.stdin.write('\x1b[B'); // arrow down: from "without proxy" to first target
    await waitFor(() => output.includes('❯ http://first') || output.includes('> http://first'));
    child.stdin.write('\r');

    assert.equal(await exited, 0, output);
    assert.match(output, /TARGET=http:\/\/first/);
  });
});
