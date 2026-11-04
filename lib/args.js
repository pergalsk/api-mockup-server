/**
 * Args module. Parses command-line flags.
 * @module args
 */

import { parseArgs } from 'node:util';

import { isValidPort } from './utils.js';
import _t from './texts.js';

const flagDefs = {
  config: { type: 'string', short: 'c' },
  port: { type: 'string', short: 'p' },
  routes: { type: 'string', short: 'r' },
  database: { type: 'string', short: 'd' },
  prefix: { type: 'string', short: 'f' },
  proxy: { type: 'string', short: 'x' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
};

/**
 * Parses command-line flags. Throws an error on unknown flag, missing value or invalid port.
 * @param {string[]} argv Command-line arguments (without node and script path)
 * @returns {{help: boolean, version: boolean, configPath: string|undefined, flags: Object}}
 *  `flags` contains only server options set on the command line
 */
function parseCliArgs(argv) {
  const { values } = parseArgs({ args: argv, options: flagDefs });
  const { help = false, version = false, config: configPath, port, routes, database, prefix, proxy } = values;

  const flags = {};

  if (port !== undefined) {
    if (!isValidPort(port)) {
      throw new Error(_t('ERROR_INVALID_PORT', { port }));
    }
    flags.port = Number(port);
  }

  if (routes !== undefined) flags.routes = routes;
  if (database !== undefined) flags.database = database;
  if (prefix !== undefined) flags.prefix = prefix;
  if (proxy !== undefined) flags.proxy = { server: proxy };

  return { help, version, configPath, flags };
}

export { parseCliArgs };
