/**
 * Definitions module. Contains default options definitions.
 * @module definitions
 */

const log = require('./log');
const _t = require('./texts');
const { LOG_LINE_PREFIX_BASE_CHARS } = require('./constants');

/**
 * Default options for this application.
 * Simple Mock Server.
 * @type {Object}
 */
const server = {
  port: 9933,
  routes: [],
  prefix: '',
  database: 'database',
  encoding: 'utf8',
  cors: true,
  delay: {
    min: 0,
    max: 0,
  },
};

/**
 * Default options for route definition.
 * @type {Object}
 */
const route = {
  method: 'GET',
  status: '200',
};

/**
 * Default options for proxy server.
 * Http proxy middleware.
 * @type {Object}
 */
const proxy = {
  target: '',
  changeOrigin: true,
  ws: true,
  logProvider: log.provider,
  logLevel: 'debug',
  selfHandleResponse: true,
  onProxyRes: () => {},
};

/**
 * Default options for interactive CLI.
 * Inquirer.
 * @type {Object}
 */
const prompt = {
  proxy: {
    type: 'list',
    name: 'target',
    message: _t('PROXY_TARGET'),
    prefix: LOG_LINE_PREFIX_BASE_CHARS,
    choices: [],
    loop: false,
    pageSize: 10,
  },
};

/**
 * Default options for chokidar watcher.
 * @type {Object}
 */
const watcher = {
  ignoreInitial: true,
};

module.exports = {
  server,
  route,
  proxy,
  prompt,
  watcher,
};
