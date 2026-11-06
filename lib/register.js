import nodePath from 'node:path';

import express from 'express';

import { getState } from './store.js';
import { getRandomInt, isFn, calculateHRTime } from './utils.js';
import { MOCK_HEADER_NAME } from './constants.js';
import { getDataFromFile, getRoutesFromFile } from './file.js';
import * as defaultOptions from './definitions.js';
import * as methods from './methods.js';
import * as log from './log.js';
import _t from './texts.js';

function getRouter(serverOptions, isFileChange) {
  const router = express.Router();

  const { routes, prefix } = serverOptions;
  const { suspended, target } = getState();

  // filter only routes set by user as active
  let allRoutes = getAllRoutes(routes);
  let activeRoutes = allRoutes.filter((route) => route.active === true);
  let acceptedRoutesNum = 0;
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
    const interceptor = isProxyInterceptor(routeOptions, target);

    acceptedRoutesNum++;
    routesDisplayList.push({ method, status, key, path: fullPath, applyIf, interceptor });

    if (interceptor) {
      return;
    }

    // register HTTP method
    if (suspended == null || suspended === 'TURNING_OFF') {
      router[method.toLowerCase()](fullPath, routeFn(routeOptions, serverOptions));
    }
  });

  log.suspendedMessage(suspended, isFileChange);

  const stats = { activeRoutes, acceptedRoutesNum, allRoutes };

  return { routerMiddleware: router, routesDisplayList, stats };
}

function routeFn(routeOptions, serverOptions) {
  return async (req, res) => {
    // time measurement
    const startTime = process.hrtime();

    const { data, status, method, key, delay, callback, headers, contentType, file } = routeOptions;
    const { delay: delayInterval, mockHeader, headers: globalHeaders } = serverOptions;

    // delay response - get it from the route or global server config
    const interval = delay || getRandomInt(delayInterval.min, delayInterval.max);

    res.status(status);
    res.set({ ...globalHeaders, ...headers });

    let mockHeaderValue = 'mocked';

    let resultData = data;
    let resultFile;
    // let resultData = global.structuredClone(data);

    if (resultData != null) {
      mockHeaderValue += ',inline';
    } else if (file) {
      resultFile = nodePath.resolve(process.cwd(), file);
      mockHeaderValue += ',file';
    } else {
      ({ data: resultData, file: resultFile } = getDataFromFile(routeOptions, serverOptions));
      mockHeaderValue += ',file';
    }

    if (resultFile) {
      // file is sent as it is, callback is not called
      mockHeaderValue += ',static';
    } else if (isFn(callback)) {
      const { params, query, body } = req;
      const callbackProps = { params, query, body, data: resultData, req };

      try {
        resultData = await callback(callbackProps);
        mockHeaderValue += ',dynamic';
      } catch (error) {
        log.fnErrorStart(key || '-', 'callback');
        log.error(error);
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

    const isNoBodyStatus = [204, 304].includes(Number(status));
    const isEmptyData = isNoBodyStatus || (!resultFile && !resultData);

    setTimeout(() => {
      const time = calculateHRTime(process.hrtime(startTime));
      log.routeCall(req, method, status, key, time, isEmptyData);

      if (isNoBodyStatus) {
        res.end();
        return;
      }

      if (resultFile) {
        // content type from file extension, unless route sets it
        contentType && res.type(contentType);
        res.sendFile(resultFile, { dotfiles: 'allow' }, (error) => {
          if (error && !res.headersSent) {
            log.warn(_t('WARNING_RESPONSE_FILE_NOT_SENT', { file: resultFile, message: error.message }));
            res.status(status).end();
          }
        });
        return;
      }

      res.type(contentType || 'application/json');
      res.send(resultData);
      isFn(callback) && log.callbackRoute(req.method, res.statusCode, key, req.originalUrl);
    }, interval);
  };
}

/**
 * Gets server options with routes from routes file (when routes option is a path).
 * Proxy and router setup then use the same loaded routes.
 * @param {Object} serverOptions API Mockup Server options
 * @returns {Promise<Object>} API Mockup Server options with routes list
 */
async function loadRoutes(serverOptions) {
  const { routes } = serverOptions;

  if (typeof routes !== 'string' && !Array.isArray(routes)) {
    log.warn(_t('WARNING_ROUTES_OPTION_INVALID', { type: typeof routes }));
  }

  return typeof routes === 'string'
    ? { ...serverOptions, routes: await getRoutesFromFile(routes) }
    : serverOptions;
}

function getAllRoutes(routesDef) {
  return Array.isArray(routesDef) ? [...routesDef] : [];
}

function getActiveRoutes(routesDef) {
  return getAllRoutes(routesDef).filter((route) => route.active === true);
}

function isProxyInterceptor(routeDef, target) {
  const { key, data, file, callback } = routeDef;
  return target && target !== -1 && !key && data == null && !file && isFn(callback);
}

export {
  loadRoutes,
  getRouter,
  getAllRoutes,
  getActiveRoutes,
  isProxyInterceptor,
};
