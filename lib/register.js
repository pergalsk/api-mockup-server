const express = require('express');
const nodeFs = require('fs');
const nodePath = require('path');
const fetch = require('node-fetch');
const cloneDeep = require('lodash/cloneDeep');
const isFunction = require('lodash/isFunction');

const defaultOptions = require('./definitions');
const methods = require('./methods');
const utils = require('./utils');
const log = require('./log');
const _t = require('./texts');

function getRouter(serverOptions) {
  const { routes } = serverOptions;
  const routesList = getRoutes(routes);
  const router = express.Router();

  routesList.forEach((route) => {
    const routeOptions = { ...defaultOptions.route, ...route };
    const { method, path } = routeOptions;

    if (!path) {
      log.error(_t('ERROR_NO_PATH_FOUND_IN_CONFIG'));
      log.error(_t('ROUTE_WAS_NOT_REGISTERED'));
      return;
    }

    if (!method) {
      log.warning(_t('WARNING_NO_VALID_METHOD'));
      log.warning(_t('ROUTE_WAS_NOT_REGISTERED'));
      log.warning(_t('AVAILABLE_METHODS', { methods: methods.list() }));
      return;
    }

    if (!methods.valid(method)) {
      log.warning(_t('WARNING_INVALID_METHOD', { method }));
      log.warning(_t('ROUTE_WAS_NOT_REGISTERED'));
      log.warning(_t('AVAILABLE_METHODS', { methods: methods.list() }));
      return;
    }

    // register HTTP method
    router[method.toLowerCase()](
      utils.getBasePath(path),
      routeFn(routeOptions, serverOptions)
    );
  });

  return router;
}

function getDataFromFile(routeOptions, serverOptions) {
  const { key, status, path } = routeOptions;
  const { database, encoding } = serverOptions;

  let data;

  if (!key) {
    // log.warning(_t('WARNING_NO_DATA_OR_KEY', { path }));
    return;
  }

  const filePaths = generateFilePaths(database, key, status);

  try {
    // todo: make FS methods async ?
    if (nodeFs.existsSync(filePaths.withStatus)) {
      const rawData = nodeFs.readFileSync(filePaths.withStatus, encoding);
      data = JSON.parse(rawData);
    } else if (nodeFs.existsSync(filePaths.default)) {
      const rawData = nodeFs.readFileSync(filePaths.default, encoding);
      data = JSON.parse(rawData);
    } else {
      log.warning(
        _t('WARNING_FILES_RESPONSE_DATA_NOT_FOUND', {
          key,
          filePathWithStatus: filePaths.withStatus,
          filePathDefault: filePaths.default,
          path,
        })
      );
    }
  } catch (e) {
    log.warning(
      _t('WARNING_FILES_RESPONSE_DATA_NOT_FOUND', {
        key,
        filePathWithStatus: filePaths.withStatus,
        filePathDefault: filePaths.default,
        path,
      })
    );
  }

  return data;
}

function generateFilePaths(database, key, status) {
  return {
    default: getFullFilePath(database, `${key}.json`),
    withStatus: getFullFilePath(database, `${key}.${status}.json`),
  };
}

function getFullFilePath(database, fileName) {
  return nodePath.join(process.cwd(), database, fileName);
}

function getBasePath(prefix, path) {
  // remove part with URL paramaters (? and chars after)
  return prefix + utils.getBasePath(path);
}

function routeFn(routeOptions, serverOptions) {
  return async (req, res) => {
    // time measurement
    const startTime = process.hrtime();

    const { data, status, method, key, bypass, delay, callback } = routeOptions;
    const { delay: delayInterval, bypass: bypassOpt } = serverOptions;

    // delay response
    const interval = delay || utils.getRandomInt(delayInterval.min, delayInterval.max);

    // TODO: fix problem with not JSON data (e.g. plain string)
    res.type('application/json');
    res.status(status);

    let resultData = cloneDeep(data);

    if (resultData == null) {
      // TODO: memoization ?
      resultData = getDataFromFile(routeOptions, serverOptions);
    }

    let extData;
    if (bypass === true && bypassOpt.server) {
      const externalRoute = bypassOpt.server + req.originalUrl;
      const headers = {...req.headers};
      
      log.info('External call -> ' + externalRoute);

      extData = await fetch(externalRoute, {headers})
        .then((res) => res.json())
        .then((json) => json)
        .catch((err) => log.error(err));
    }

    if (isFunction(callback)) {
      const callbackData = await callback(req, res, resultData, extData);
      resultData = cloneDeep(callbackData);
    }

    const isEmptyData = !resultData;

    setTimeout(() => {
      const time = utils.calculateHRTime(process.hrtime(startTime));
      res.send(resultData);
      log.routeCall(req, method, status, key, time, isEmptyData);
    }, interval);
  };
}

function getRoutes(routesDef) {
  let routesList = [];
  if (Array.isArray(routesDef)) {
    routesList = [...routesDef];
  } else if (typeof routesDef === 'string') {
    try {
      const routesPath = nodePath.join(process.cwd(), routesDef);
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

  return routesList;
}

module.exports = {
  getRouter,
  getRoutes,
};
