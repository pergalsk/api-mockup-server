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
  const { port, prefix, routes, database, cors } = serverOptions;

  // create express application
  const app = express();

  if (cors !== false) {
    app.use(corsMiddleware());
  }

  // use JSON middleware
  app.use(express.json());

  // use encode URLs middleware
  app.use(express.urlencoded({ extended: true }));

  // use generated http proxy middleware
  app.use(await proxy.getProxy(serverOptions));

  // use generated router middleware
  app.use(prefix, routing.getRouter(serverOptions));

  // start server listening
  app.listen(port, log.serverListen(serverOptions));

  // watch for changes
  watcher.watch({ routes, database });
}

module.exports = amServer;
