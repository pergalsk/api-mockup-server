const express = require('express');
const corsMiddleware = require('cors');
const chokidar = require('chokidar');
const chalk = require('chalk');

const routing = require('./lib/register');
const defaultOptions = require('./lib/definitions');
const log = require('./lib/log');
const _t = require('./lib/texts');

function smServer(options = {}) {
  console.log(chalk.green('*** ') + `Starting Simple mock server.`);

  const serverOptions = { ...defaultOptions.server, ...options };
  const { port, routes, database, cors } = serverOptions;

  // create express application
  const app = express();

  // use middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (cors === true) {
    app.use(corsMiddleware());
  }

  // generate rest API routes
  const routesList = routing.getRoutes(routes);
  routesList.forEach(routing.register(app, serverOptions));

  // start server listening
  app.listen(port, log.serverListen(port, routesList));

  // watch for changes
  const watchLocations = [];
  if (typeof routes === 'string') {
    watchLocations.push(routes);
  }
  if (typeof database === 'string') {
    watchLocations.push(database);
  }

  if (watchLocations.length > 0) {
    const watcher = chokidar.watch(watchLocations);
    watcher.on('change', (path, stats) => {
      log.warning(_t('FILE_OR_DIR_CHANGED', { path }));
    });
  }
}

module.exports = smServer;
