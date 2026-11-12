#!/usr/bin/env node

import pkg from '../package.json' with { type: 'json' };
import apiMockupServer from '../index.js';
import { parseCliArgs } from '../lib/args.js';
import { loadConfig } from '../lib/config.js';
import { debounce } from '../lib/utils.js';
import { RESTART_DEBOUNCE, NEW_LINE } from '../lib/constants.js';
import * as watcher from '../lib/watch.js';
import * as log from '../lib/log.js';
import _t from '../lib/texts.js';

async function main() {
  let args;

  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (e) {
    log.error(_t('ERROR_CLI_ARGS', { message: e.message }));
    process.exitCode = 1;
    return;
  }

  const { help, version, configPath, flags } = args;

  if (help) {
    log.info(_t('CLI_HELP'));
    return;
  }

  if (version) {
    log.info(pkg.version);
    return;
  }

  let config = {};

  if (configPath) {
    try {
      config = await loadConfig(configPath);
    } catch (e) {
      log.error(_t('ERROR_CONFIG_NOT_LOADED', { path: configPath, message: e.message }));
      process.exitCode = 1;
      return;
    }
  }

  // priority: CLI flag > config file > defaults (defaults are added by apiMockupServer)
  let server;

  try {
    server = await apiMockupServer({ ...config, ...flags });
  } catch (e) {
    // user chose Exit (or Ctrl+C) in the proxy prompt -> quit silently
    if (e.code === 'PROMPT_EXIT') {
      return;
    }
    log.error(NEW_LINE + e.message);
    process.exitCode = 1;
    return;
  }

  // server closed by quit shortcut or after an error (e.g. new port in use) -> end the CLI
  server.closed.then((error) => process.exit(error ? 1 : 0));

  if (configPath) {
    const reloadConfig = debounce(async () => {
      try {
        server.reconfigure({ ...(await loadConfig(configPath)), ...flags });
      } catch (e) {
        log.warn(_t('WARNING_CONFIG_NOT_RELOADED', { path: configPath, message: e.message }));
      }
    }, RESTART_DEBOUNCE);

    await watcher.watchConfig(configPath, reloadConfig);
  }
}

main();
