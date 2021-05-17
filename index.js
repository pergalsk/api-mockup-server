const express = require('express');
const corsMiddleware = require('cors');
const chalk = require('chalk');
const defaultOptions = require('./lib/definitions');
const routing = require('./lib/register');
const watcher = require('./lib/watch');
const log = require('./lib/log');

function smServer(options = {}) {
  console.log(chalk.green('*** ') + `Starting Simple mock server.`);

  const serverOptions = { ...defaultOptions.server, ...options };
  const { port, prefix, routes, database, cors } = serverOptions;

  // create express application
  const app = express();

  // use middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (cors === true) {
    app.use(corsMiddleware());
  }

  // use generated router middleware
  app.use(prefix, routing.getRouter(serverOptions));

  // start server listening
  app.listen(port, log.serverListen(port /* routesList */));

  // watch for changes
  watcher.watch([routes, database]);
}

module.exports = smServer;
