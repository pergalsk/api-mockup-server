const nodeFs = require('fs');
const nodePath = require('path');
const express = require('express');
const corsMiddleware = require('cors');
const chokidar = require('chokidar');
const chalk = require('chalk');

const defaultOptions = require('./lib/definitions');
const methods = require('./lib/methods');
const _t = require('./lib/texts');
const log = require('./lib/log');
const utils = require('./lib/utils');

function smServer(options = {}) {
  console.log(chalk.green('*** ') + `Starting Simple mock server.`);

  // create express application
  const app = express();

  const { port, routes, database, encoding, cors, prefix, delay: delayInterval } = {
    ...defaultOptions.server,
    ...options,
  };

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
  routesList.forEach(registerRoute);

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

  // methods

  function registerRoute(route) {
    const { key, method, path, status, delay, callback } = {
      ...defaultOptions.route,
      ...route,
    };

    let { data } = route;

    if (!path) {
      log.error(_t('ERROR_NO_PATH_FOUND_IN_CONFIG'));
      return;
    }

    // check for valid HTTP method
    if (methods.indexOf(method.toUpperCase()) === -1) {
      log.warning(_t('WARNING_NO_VALID_METHOD', { methods: methods.join(', ') }));
      return;
    }

    // todo: move to app.METHOD exec ?
    if (data == null) {
      if (key) {
        const filePathDefault = nodePath.join(process.cwd(), database, key + '.json');
        const filePathWithStatus = nodePath.join(
          process.cwd(),
          database,
          key + '.' + status + '.json'
        );

        try {
          // todo: make FS methods async ?
          if (nodeFs.existsSync(filePathWithStatus)) {
            data = nodeFs.readFileSync(filePathWithStatus, encoding);
          } else if (nodeFs.existsSync(filePathDefault)) {
            data = nodeFs.readFileSync(filePathDefault, encoding);
          } else {
            log.warning(
              _t('WARNING_FILES_RESPONSE_DATA_NOT_FOUND', {
                key,
                filePathWithStatus,
                filePathDefault,
                path,
              })
            );
          }
        } catch (e) {
          log.warning(
            _t('WARNING_FILES_RESPONSE_DATA_NOT_FOUND', {
              key,
              filePathWithStatus,
              filePathDefault,
              path,
            })
          );
        }
      } else {
        log.warning(_t('WARNING_NO_DATA_OR_KEY', { path }));
      }
    }

    // remove part with URL paramaters (? and chars after)
    const basePath = prefix + utils.getBasePath(path);

    // register HTTP method
    app[method.toLowerCase()](basePath, (req, res) => {
      // time measurement
      const startTime = process.hrtime();
      // delay response
      const interval = delay || utils.getRandomInt(delayInterval.min, delayInterval.max);

      // TODO: fix problem with not JSON data (e.g. plain string)
      res.type('application/json');
      res.status(status);

      // todo: check for funtion
      if (callback) {
        data = callback(req, res, data);
      }

      setTimeout(send, interval);

      const isEmptyData = !data;

      // util function for response sending
      function send() {
        res.send(data);

        utils.logRouteCall(
          req,
          method,
          status,
          key,
          utils.calculateHRTime(process.hrtime(startTime)),
          isEmptyData
        );
      }
    });
  }
}

module.exports = smServer;
