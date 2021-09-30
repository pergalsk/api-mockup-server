const log = require('./log');
const _t = require('./texts');
const { LOG_LINE_PREFIX_BASE_CHARS } = require('./constants');

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

const route = {
  method: 'GET',
  status: '200',
};

const proxy = {
  target: '',
  changeOrigin: true,
  ws: true,
  logProvider: log.provider,
  logLevel: 'debug',
  selfHandleResponse: true,
  onProxyRes: () => {},
};

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

module.exports = {
  server,
  route,
  proxy,
  prompt,
};
