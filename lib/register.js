const express = require('express');
const nodeFs = require('fs');
const nodePath = require('path');

const { MOCK_HEADER_NAME } = require('./constants');
const defaultOptions = require('./definitions');
const methods = require('./methods');
const utils = require('./utils');
const log = require('./log');
const _t = require('./texts');

function getRouter(serverOptions) {
  const router = express.Router();
  const { routes, prefix, proxy } = serverOptions;

  log.hrSeparator();

  let acceptedRoutesNum = 0;

  // all routes file entries
  let allRoutes = getAllRoutes(routes);

  // filter only routes set by user as active
  let activeRoutes = allRoutes.filter((route) => route.active === true);
  let routesDisplayList = [];

  activeRoutes.forEach((route) => {
    const routeOptions = { ...defaultOptions.route, ...route };
    const { method, prefix: routePrefix, path, key, status, applyIf } = routeOptions;

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

    const fullPath = `${routePrefix ?? prefix}${path}`;

    acceptedRoutesNum++;
    routesDisplayList.push({ method, status, key, path: fullPath, applyIf });

    // register HTTP method
    router[method.toLowerCase()](fullPath, routeFn(routeOptions, serverOptions));
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
  const { database, encoding, prefix } = serverOptions;
  const { key, status, prefix: routePrefix, path } = routeOptions;

  if (!key) {
    return;
  }

  let data;

  const filePaths = generateFilePaths(database, key, status);
  const fullPath = `${routePrefix ?? prefix}${path}`;

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
      log.warn(_t('ROUTE_PATH_SERVED_EMPTY', { fullPath }));
    }
  } catch (e) {
    log.error(
      _t('ERROR_WHILE_READING_JSON_FILE', {
        key,
        filePathWithStatus: filePaths.withStatus,
        filePathDefault: filePaths.default,
      })
    );
    log.error(_t('ROUTE_PATH_SERVED_EMPTY', { fullPath }));
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
    const { delay: delayInterval, mockHeader } = serverOptions;

    // delay response - get it from the route or global server config
    const interval = delay || utils.getRandomInt(delayInterval.min, delayInterval.max);

    // TODO: fix problem with not JSON data (e.g. plain string)
    res.type('application/json');
    res.status(status);

    let mockHeaderValue = 'mocked';

    let resultData = global.structuredClone(data);

    if (resultData == null) {
      resultData = getDataFromFile(routeOptions, serverOptions);
      mockHeaderValue += ',file';
    } else {
      mockHeaderValue += ',inline';
    }

    if (utils.isFunction(callback)) {
      const { params, query, body } = req;
      const callbackProps = { params, query, body, data: resultData, req };
      const callbackData = await callback(callbackProps);
      resultData = global.structuredClone(callbackData);
      mockHeaderValue += ',dynamic';
    } else {
      mockHeaderValue += ',static';
    }

    if (mockHeader) {
      mockHeaderValue += `,${interval}ms`;
      res.setHeader(MOCK_HEADER_NAME, mockHeaderValue);
    }

    const isEmptyData = !resultData;

    setTimeout(() => {
      const time = utils.calculateHRTime(process.hrtime(startTime));
      res.send(resultData);
      log.routeCall(req, method, status, key, time, isEmptyData);
      utils.isFunction(callback) &&
        log.callbackRoute(req.method, res.statusCode, key, req.originalUrl);
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

/**
 * Clears the require cache for a specific module.
 * @param {string} filePath - The filePath to the module to clear from the cache.
 * @returns {void}
 */
function clearRequireCache(modulePath) {
  if (typeof modulePath !== 'string') {
    return;
  }

  try {
    // Get the full path to the module
    const fullPath = nodePath.join(process.cwd(), modulePath);

    // Check if the module exists and is a file
    if (nodeFs.existsSync(fullPath) && nodeFs.lstatSync(fullPath).isFile()) {
      // Remove the module from the require cache
      delete require.cache[require.resolve(fullPath)];
    }
  } catch (e) {
    log.error(_t('ERROR_WHILE_CLEARING_REQUIRE_CACHE', { modulePath }));
  }
}

module.exports = {
  getRouter,
  getAllRoutes,
  getActiveRoutes,
  clearRequireCache,
};
