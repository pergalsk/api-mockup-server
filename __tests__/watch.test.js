import assert from 'node:assert/strict';
import nodeFs from 'node:fs';
import nodeOs from 'node:os';
import nodePath from 'node:path';
import { describe, it } from 'node:test';

import { watch } from '../lib/watch.js';
import { waitFor } from './helpers.js';

describe('watch', () => {
  it('detects a routes file added right after the watcher is ready', async (t) => {
    t.mock.method(console, 'log', () => {});
    const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'amserver-watch-'));
    const routes = nodePath.join(dir, 'routes.cjs');
    let calls = 0;

    const close = await watch({ routes }, () => calls++);
    t.after(async () => {
      await close();
      nodeFs.rmSync(dir, { recursive: true, force: true });
    });

    // no delay: the file is written right after the watcher is ready
    nodeFs.writeFileSync(routes, 'module.exports = [];\n');
    await waitFor(() => calls === 1);

    nodeFs.writeFileSync(routes, 'module.exports = [{}];\n');
    await waitFor(() => calls === 2);
  });
});
