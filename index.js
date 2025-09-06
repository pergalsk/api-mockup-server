const express = require('express');
const corsMiddleware = require('cors');
const defaultOptions = require('./lib/definitions');
const routing = require('./lib/register');
const proxy = require('./lib/proxy');
const watcher = require('./lib/watch');
const log = require('./lib/log');

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
  let routerMiddleware = routing.getRouter(serverOptions);
  app.use((...params) => {
    routerMiddleware(...params);
  });

  // start server listening
  app.listen(port, log.serverListen(serverOptions));

  // watch for changes
  watcher.watch({ routes, database }, () => {
    // required files are cached in NodeJs -> clear cache
    routing.clearRequireCache(serverOptions.routes);
    // regenerate middleware (files could be changed)
    proxyMiddleware = proxy.getProxy(serverOptions, target);
    routerMiddleware = routing.getRouter(serverOptions);
  });
}

module.exports = amServer;
