const nodeFs = require('fs');
const nodePath = require('path');
const express = require('express');
const cors = require('cors');
const chalk = require('chalk');
const utils = require('./lib/utils.js')


function simpleMockServer(options) {
  const app = express();

  // todo: allow to be as params
  const port = options.port || 7766;
  const routesPath = nodePath.join(process.cwd(), options.routesPath || './routes.js');
  // const routes = require(options.routesPath || './routes.js');
  const partials = options.databasePath || 'database';
  const dataFilesEncoding = options.encoding || 'utf8';
  const prefix = options.prefix || '/ibs';
  const delayInterval = options.delayInterval || {
    min: 150, // miliseconds
    max: 1500 // miliseconds
  };

  if (options.cors === true) {
    app.use(cors());
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // load routes definitions in JS format
  try {
    if (nodeFs.existsSync(routesPath)) {
      routes = require(routesPath);
    }
  } catch (e) {
    console.log(chalk.red(`ERROR: File with routes definitions not found. Please define routes in "./routes.js" file.`));
    return;
  }

  if (Array.isArray(routes)) {
    routes.forEach(registerRoute);
  } else {
    console.log(chalk.red(`WARNING: File with routes definitions has wrong format. It has to be array of routes definitions.`));
    return;
  }

  app.listen(port, () => {
    console.log(chalk.red('***') + ` Mock server listening at http://localhost:${port}`);
    console.log('Handled routes:');
  });


  // mathods

  function registerRoute(route) {
    const { key, method, path, status, delay, callback } = route;
    let { data } = route

    if (!key || !method || !path || !status) {
      console.log(chalk.red('WARNING: No key, method, path or status found in routes list config item.'));
      return;
    }

    // todo: move to app.METHOD exec ?
    if (!data) {
      // data = require(partials + '/' + key + '.json');
      // console.log(data);

      const filePathDefault = nodePath.join(process.cwd(), partials, key + '.json');
      const filePathWithStatus = nodePath.join(process.cwd(), partials, key + '.' + status + '.json');

      try {
        // todo: make FS methods async ?
        if (nodeFs.existsSync(filePathWithStatus)) {
          data = nodeFs.readFileSync(filePathWithStatus, dataFilesEncoding);
        } else {
          data = nodeFs.readFileSync(filePathDefault, dataFilesEncoding);
        }
      } catch (e) {
        console.log(chalk.red(`WARNING: File with response data: "${filePathWithStatus}" or "${filePathDefault}" not found.`));
        return;
      }
    }

    // remove part with URL paramaters (? and chars after)
    const basePath = prefix + utils.getBasePath(path);

    // check for valid HTTP method
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH'];
    if (methods.indexOf(method.toUpperCase()) === -1) {
      console.log(chalk.red('WARNING: No valid method found in routes list config item.'));
      console.log(chalk.red('WARNING: Available methods are: GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS, TRACE, PATCH'));
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

      // util function for response sending
      function send() {
        res.send(data);
        utils.logRouteCall(req, method, status, key, utils.calculateHRTime(process.hrtime(startTime)));
      }
    });
  }
}

// EXAMPLE
/*simpleMockServer({
  port: 9933,
  routesPath: './paths',
  databasePath: 'db',
  encoding: 'utf8',
  prefix: '/api',
  delayInterval: {min: 10, max: 90},
  cors: true,
});*/


module.exports = simpleMockServer;
