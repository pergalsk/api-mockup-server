const express = require('express');
const nodeFs = require('fs');
const nodePath = require('path');
const cloneDeep = require('lodash/cloneDeep');
const isFunction = require('lodash/isFunction');

const defaultOptions = require('./definitions');
const methods = require('./methods');
const utils = require('./utils');
const log = require('./log');
const _t = require('./texts');

function getRouter(serverOptions) {
  const router = express.Router();
  const { routes, proxy } = serverOptions;

  log.hrSeparator();

  let acceptedRoutesNum = 0;

  // all routes file entries
  let allRoutes = getAllRoutes(routes);

  // filter only routes set by user as active
  let activeRoutes = allRoutes.filter((route) => route.active === true);
  let routesDisplayList = [];

  activeRoutes.forEach((route) => {
    const routeOptions = { ...defaultOptions.route, ...route };
    const { method, path, key, status, applyIf } = routeOptions;

    if (!path) {
      log.error(_t('ERROR_NO_PATH_FOUND_IN_CONFIG'));
      log.error(_t('ROUTE_WAS_NOT_REGISTERED'));
      return;
    }

    if (!methods.valid(method)) {
      log.warn(_t('WARNING_INVALID_METHOD', { method }));
      log.warn(_t('ROUTE_WAS_NOT_REGISTERED'));
      log.warn(_t('AVAILABLE_METHODS', { methods: methods.list() }));
      return;
    }

    acceptedRoutesNum++;
    routesDisplayList.push({ method, status, key, path, applyIf });

    // register HTTP method
    router[method.toLowerCase()](path, routeFn(routeOptions, serverOptions));
  });

  // do some extended console output to inform user
  log.serverMsg(
    _t('ACTIVE_REGISTERED_ROUTES', {
      active: acceptedRoutesNum,
      all: allRoutes.length,
      invalid: activeRoutes.length - acceptedRoutesNum,
    })
  );

  if (activeRoutes.length === 0) {
    const textCode =
      proxy && proxy.server
        ? 'WARNING_MISSING_ROUTE_DEFINITIONS_SERVER_ACTIVE'
        : 'WARNING_MISSING_ROUTE_DEFINITIONS';
    log.warn(_t(textCode));
  }

  log.routesList(routesDisplayList);

  return router;
}

function getDataFromFile(routeOptions, serverOptions) {
  const { key, status, path } = routeOptions;
  const { database, encoding } = serverOptions;

  if (!key) {
    return;
  }

  let data;

  const filePaths = generateFilePaths(database, key, status);

  try {
    // todo: make FS methods async ?
    if (nodeFs.existsSync(filePaths.withStatus)) {
      data = readJSONFile(filePaths.withStatus, encoding);
    } else if (nodeFs.existsSync(filePaths.default)) {
      data = readJSONFile(filePaths.default, encoding);
    } else {
      log.warn(
        _t('WARNING_FILES_RESPONSE_DATA_NOT_FOUND', {
          key,
          filePathWithStatus: filePaths.withStatus,
          filePathDefault: filePaths.default,
        })
      );
      log.warn(_t('ROUTE_PATH_SERVED_EMPTY', { path }));
    }
  } catch (e) {
    log.error(
      _t('ERROR_WHILE_READING_JSON_FILE', {
        key,
        filePathWithStatus: filePaths.withStatus,
        filePathDefault: filePaths.default,
      })
    );
    log.error(_t('ROUTE_PATH_SERVED_EMPTY', { path }));
  }

  return data;
}

function readJSONFile(filePath, encoding) {
  let rawData;

  rawData = nodeFs.readFileSync(filePath, encoding);
  if (typeof rawData !== 'string') {
    return;
  }

  rawData = rawData.trim();
  if (rawData === '') {
    return;
  }

  return JSON.parse(rawData);
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

function routeFn(routeOptions, serverOptions) {
  return async (req, res) => {
    // time measurement
    const startTime = process.hrtime();

    const { data, status, method, key, delay, callback } = routeOptions;
    const { delay: delayInterval } = serverOptions;

    // delay response - get it from the route or global server config
    const interval = delay || utils.getRandomInt(delayInterval.min, delayInterval.max);

    // TODO: fix problem with not JSON data (e.g. plain string)
    res.type('application/json');
    res.status(status);

    let resultData = cloneDeep(data);

    if (resultData == null) {
      // TODO: memoization ?
      resultData = getDataFromFile(routeOptions, serverOptions);
    }

    if (isFunction(callback)) {
      const callbackData = await callback(req, res, resultData);
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

function getAllRoutes(routesDef) {
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

  return routesList;
}

function getActiveRoutes(routesDef) {
  return getAllRoutes(routesDef).filter((route) => route.active === true);
}

module.exports = {
  getRouter,
  getAllRoutes,
  getActiveRoutes,
};
