/**
 * Config module. Loads server options from a config file.
 * @module config
 */

import nodeFs from 'node:fs';

import { loadFile } from './file.js';
import { isValidPort } from './utils.js';
import _t from './texts.js';

/**
 * Loads and checks a config file (JS or JSON). Every call reads a fresh copy of the file.
 * Throws an error if the file can't be loaded or has wrong content.
 * @param {string} configPath Path to the config file
 * @returns {Promise<Object>} Server options from the config file
 */
async function loadConfig(configPath) {
  if (!nodeFs.existsSync(configPath) || !nodeFs.lstatSync(configPath).isFile()) {
    throw new Error(_t('ERROR_CONFIG_NOT_FOUND'));
  }

  const config = await loadFile(configPath);

  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(_t('ERROR_CONFIG_NOT_OBJECT'));
  }

  if ('port' in config && !isValidPort(config.port)) {
    throw new Error(_t('ERROR_INVALID_PORT', { port: config.port }));
  }

  return config;
}

export { loadConfig };
