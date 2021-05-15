const nodeFs = require('fs');
const nodePath = require('path');
const express = require('express');
const corsMiddleware = require('cors');
const chokidar = require('chokidar');
const chalk = require('chalk');

const registerRoute = require('./lib/register');
const defaultOptions = require('./lib/definitions');
const log = require('./lib/log');
const _t = require('./lib/texts');

function smServer(options = {}) {
  console.log(chalk.green('*** ') + `Starting Simple mock server.`);

  const serverOptions = { ...defaultOptions.server, ...options };
  const { port, routes, database, cors } = serverOptions;

  // create express application
  const app = express();

  if (cors === true) {
    app.use(corsMiddleware());
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // load routes definitions in JS format
  let routesList = [];
  if (Array.isArray(routes)) {
    routesList = [...routes];
  } else if (typeof routes === 'string') {
    try {
      const routesPath = nodePath.join(process.cwd(), routes);
      if (nodeFs.existsSync(routesPath) && nodeFs.lstatSync(routesPath).isFile()) {
        routesList = require(routesPath);
      }
    } catch (e) {
      routesList = [];
    }
  }

  if (routesList.length === 0) {
    log.warning(_t('WARNING_MISSING_ROUTE_DEFINITIONS'));
  }

  // generate rest API routes
  routesList.forEach(registerRoute(app, serverOptions));

  // starts server listening
  app.listen(port, () => {
    console.log(
      chalk.green('*** ') +
        `Simple mock server listening at ` +
        chalk.green(`http://localhost:${port}`)
    );
    log.log(chalk.green('*** ') + 'Handled routes:');

    if (Array.isArray(routesList) && routesList.length === 0) {
      log.info('No routes defined.');
    }
  });

  // watch for changes
  const watcher = chokidar.watch([routes, database]);
  watcher.on('change', (path, stats) => {
    log.warning(_t('FILE_OR_DIR_CHANGED', { path }));
  });
}

module.exports = smServer;
