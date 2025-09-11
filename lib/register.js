const express = require('express');

const { getRandomInt, isFn, calculateHRTime } = require('./utils');
const { MOCK_HEADER_NAME } = require('./constants');
const { getDataFromFile, getRoutesFromFile } = require('./file');
const defaultOptions = require('./definitions');
const methods = require('./methods');
const log = require('./log');
const _t = require('./texts');

function getRouter(serverOptions, target) {
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

    if (isProxyInterceptor(routeOptions, target)) {
      return;
    }

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

function routeFn(routeOptions, serverOptions) {
  return async (req, res) => {
    // time measurement
    const startTime = process.hrtime();

    const { data, status, method, key, delay, callback } = routeOptions;
    const { delay: delayInterval, mockHeader } = serverOptions;

    // delay response - get it from the route or global server config
    const interval = delay || getRandomInt(delayInterval.min, delayInterval.max);

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

    if (isFn(callback)) {
      const { params, query, body } = req;
      const callbackProps = { params, query, body, data: resultData, req };

      try {
        const callbackData = await callback(callbackProps);
        resultData = global.structuredClone(callbackData);
        mockHeaderValue += ',dynamic';
      } catch (error) {
        log.fnErrorStart(key || '-', 'callback');
        console.error(error);
        log.fnErrorEnd(key || '-', 'callback');
        mockHeaderValue += ',static';
      }
    } else {
      mockHeaderValue += ',static';
    }

    if (mockHeader) {
      mockHeaderValue += `,${interval}ms`;
      res.setHeader(MOCK_HEADER_NAME, mockHeaderValue);
    }

    const isEmptyData = !resultData;

    setTimeout(() => {
      const time = calculateHRTime(process.hrtime(startTime));
      res.send(resultData);
      log.routeCall(req, method, status, key, time, isEmptyData);
      isFn(callback) && log.callbackRoute(req.method, res.statusCode, key, req.originalUrl);
    }, interval);
  };
}

function getAllRoutes(routesDef) {
  if (Array.isArray(routesDef)) {
    return [...routesDef];
  }

  if (typeof routesDef === 'string') {
    return getRoutesFromFile(routesDef);
  }

  return [];
}

function getActiveRoutes(routesDef) {
  return getAllRoutes(routesDef).filter((route) => route.active === true);
}

function isProxyInterceptor(routeDef, target) {
  const { key, data, callback } = routeDef;
  return target && target !== -1 && !key && data == null && isFn(callback);
}

module.exports = {
  getRouter,
  getAllRoutes,
  getActiveRoutes,
  isProxyInterceptor,
};
