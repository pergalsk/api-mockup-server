const express = require('express');
const corsMiddleware = require('cors');
const defaultOptions = require('./lib/definitions');
const routing = require('./lib/register');
const proxy = require('./lib/proxy');
const file = require('./lib/file');
const watcher = require('./lib/watch');
const log = require('./lib/log');
const { SERVER_RESTART_DEBOUNCE_MS } = require('./lib/constants');

async function amServer(options = {}) {
  log.serverStart();

  const serverOptions = { ...defaultOptions.server, ...options };
  const { port, routes, database, cors } = serverOptions;

  // create express application
  const app = express();

  if (cors !== false) {
    app.use(corsMiddleware());
  }

  // use JSON middleware
  app.use(express.json());

  // use encode URLs middleware
  app.use(express.urlencoded({ extended: true }));

  // get proxy target from user selection
  const target = await proxy.getProxyTarget(serverOptions.proxy);

  // use generated http proxy middleware
  let proxyMiddleware = proxy.getProxy(serverOptions, target);
  app.use((...params) => {
    proxyMiddleware(...params);
  });

  // use generated router middleware
  let routerMiddleware = routing.getRouter(serverOptions, target);
  app.use((...params) => {
    routerMiddleware(...params);
  });

  // start server listening
  let server = app.listen(port, log.serverListen(serverOptions));

  let restartTimeout;

  // watch for changes
  watcher.watch({ routes, database }, () => {
    debouncedServerRestart();
  });

  function debouncedServerRestart() {
    clearTimeout(restartTimeout);
    restartTimeout = setTimeout(() => {
      server.close(() => {
        log.serverRestart();
        recreateMiddleware();
        server = app.listen(port);
      });
    }, SERVER_RESTART_DEBOUNCE_MS);
  }

  function recreateMiddleware() {
    // required files are cached in NodeJs -> clear cache
    file.clearRequireCache(serverOptions.routes);
    // regenerate middleware (files could be changed)
    proxyMiddleware = proxy.getProxy(serverOptions, target);
    routerMiddleware = routing.getRouter(serverOptions);
  }
}

module.exports = amServer;
