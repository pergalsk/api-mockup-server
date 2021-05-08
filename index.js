const nodeFs = require('fs');
const nodePath = require('path');
const express = require('express');
const corsMiddleware = require('cors');
const chalk = require('chalk');

const utils = require('./lib/utils');
const log = require('./lib/log');
const defaultOptions = require('./lib/definitions');
const methods = require('./lib/methods');

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
    log.warning([
      `WARNING: Missing routes definitions or definitions file has wrong format.`,
      `Please define some routes in server options { routes: [ ... ] },`,
      `or provide path to routes config JS file.`,
      `For example in { routes: "./routes.js" } config file could contain:`,
      `module.exports = [`,
      `  { key: 'PRODUCT_CREATE', method: 'POST', path: '/api/product', status: '200' },`,
      `  { key: 'PRODUCT_DETAIL', method: 'GET', path: '/api/product/:id', status: '200' },`,
      `  { key: 'PRODUCT_DELETE', method: 'DELETE', path: '/api/product/:id', status: '201' }`,
      `];`,
      `Look into documentation for more details.`,
    ]);
  }

  // generate rest API routes
  routesList.forEach(registerRoute);

  // starts server listening
  app.listen(port, () => {
    console.log(chalk.green('*** ') + `Simple mock server listening at http://localhost:${port}`);
    log.log('Handled routes:');
    if (Array.isArray(routesList) && routesList.length === 0) {
      log.info('No routes defined.');
    }
  });

  // methods

  function registerRoute(route) {
    const { key, method, path, status, delay, callback } = {
      ...defaultOptions.route,
      ...route,
    };

    let { data } = route;

    if (!path) {
      log.error('ERROR: No path found in route config item.');
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
            log.warning([
              `WARNING: Files with response data for key: ${key} not found:`,
              `"${filePathWithStatus}"`,
              `"${filePathDefault}"`,
              `Route "${path}" will be served with empty response.`,
            ]);
          }
        } catch (e) {
          log.warning([
            `WARNING: Files with response data for key: ${key} not found:`,
            `"${filePathWithStatus}"`,
            `"${filePathDefault}"`,
            `Route "${path}" will be served with empty response.`,
          ]);
        }
      } else {
        log.warning([
          `WARNING: You provided no data or key.`,
          `Route "${path}" will be served with empty response.`,
        ]);
      }
    }

    // remove part with URL paramaters (? and chars after)
    const basePath = prefix + utils.getBasePath(path);

    // check for valid HTTP method
    if (methods.indexOf(method.toUpperCase()) === -1) {
      log.warning([
        'WARNING: No valid method found in routes list config item.',
        'WARNING: Available methods are: ' + methods.join(', '),
      ]);
      return;
    }

    // register HTTP method
    app[method.toLowerCase()](basePath, (req, res) => {
      // time measurement
      const startTime = process.hrtime();
      // delay response
      const interval = delay || utils.getRandomInt(delayInterval.min, delayInterval.max);

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
