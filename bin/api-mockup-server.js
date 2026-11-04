#!/usr/bin/env node

import pkg from '../package.json' with { type: 'json' };
import amServer from '../index.js';
import { parseCliArgs } from '../lib/args.js';
import { loadConfig } from '../lib/config.js';
import { debounce } from '../lib/utils.js';
import { RESTART_DEBOUNCE } from '../lib/constants.js';
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

  // priority: CLI flag > config file > defaults (defaults are added by amServer)
  const server = await amServer({ ...config, ...flags });

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
