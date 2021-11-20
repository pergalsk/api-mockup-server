/**
 * Proxy module. Handle proxying http requests.
 * @module proxy
 */
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { match } = require('path-to-regexp');
const inquirer = require('inquirer');
const defaultOptions = require('./definitions');
const routing = require('./register');
const utils = require('./utils');
const log = require('./log');
const _t = require('./texts');

/**
 * Method generates HTTP Proxy Middleware.
 * @async
 * @param {Object} serverOptions API Mockup Server options
 * @returns {Promise<Function>} ExpressJS HTTP Proxy Middleware
 */
async function getProxy(serverOptions) {
  const { prefix, routes, proxy, encoding } = serverOptions;

  const target = await getProxyTarget(proxy);

  if (!target || target === -1) {
    log.serverMsg(_t('PROXY_NOT_CONFIGURED'));
    return (req, res, next) => {
      next();
    };
  }

  const contexts = getPaths(prefix, routes);
  const onProxyReq = getOnProxyReqFn();
  const onProxyRes = getOnProxyResFn(encoding, contexts);
  const options = { target, onProxyReq, onProxyRes };

  const proxyMiddleware = createProxyMiddleware(getFilterFn(contexts), {
    ...defaultOptions.proxy,
    ...options,
  });

  if (!Array.isArray(proxy.server) || proxy.server.length <= 1) {
    log.proxyTarget(target);
  }
  log.serverMsg(_t('PROXY_CONFIGURED'));

  return proxyMiddleware;
}

/**
 * Generates `onProxyReq` method needed for intercept proxy requests.
 * @returns {Function} HPM `onProxyReq` method
 */
function getOnProxyReqFn() {
  return (proxyReq, req, res, options) => {
    if (!proxyReq || !req || !req.body) {
      return;
    }

    // If there is parsed body in request re-stream it before proxying
    // it causes problem with PUT/POST proxyied responses.
    // https://github.com/chimurai/http-proxy-middleware/issues/40#issuecomment-249430255
    let bodyData = JSON.stringify(req.body);
    // incase if content-type is application/x-www-form-urlencoded
    // -> we need to change to application/json
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    // stream the content
    proxyReq.write(bodyData);
  };
}

/**
 * Generates `onProxyRes` method needed for intercept proxy responses.
 * @param {string} encoding Proxy response buffer encoding (e.g. 'UTF8')
 * @param {Array<Object>} contexts Contexts - active routes containing method for matching tested path
 * @returns {Function} `onProxyRes` function gerated by HPM `responseInterceptor` method
 */
function getOnProxyResFn(encoding, contexts) {
  return responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    const contentType = proxyRes.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return responseBuffer;
    }

    const context = contexts.find(getMatchRouteFn(req, req.url, false));
    if (!context || !utils.isFunction(context.callback)) {
      return responseBuffer;
    }

    try {
      const parsedData = JSON.parse(responseBuffer.toString(encoding));
      const modifiedData = context.callback(req, proxyRes, parsedData);
      const responseData = JSON.stringify(modifiedData);
      log.info(_t('RESPONSE_MODIFIED'));
      return responseData;
    } catch (e) {
      log.error(_t('ERROR_IN_PROCESSING_JSON_DATA'));
      return responseBuffer;
    }
  });
}

/**
 * HPM filter method with shortened notation due to minimize HPM logging.
 * (pathname, req) => m(pathname, req, contexts)
 * @param {Array<Object>} c Contexts - active routes containing method for matching tested path
 * @returns {Function} HPM filter function
 */
function getFilterFn(c) {
  return (p, r) => m(p, r, c);
}

/**
 * HPM filter method for matching routes.
 * @param {string} pathname Tested pathname
 * @param {Object} req ExpressJS request
 * @param {*} contexts Contexts - active routes containing method for matching tested path
 * @returns {boolean} `true` if path should be proxied
 */
function m(pathname, req, contexts) {
  return !contexts.some(getMatchRouteFn(req, pathname, true));
}

/**
 * Generates iteratee method - the function invoked per context iteration.
 * It checks if request matches tested context.
 * @param {Object} req ExpressJS request
 * @param {string} pathname Tested pathname
 * @param {boolean} negateApllyIf use negation of applyIf method
 * @returns {(Object) => boolean} Iteratee method
 */
function getMatchRouteFn(req, pathname, negateApllyIf) {
  return (context) => {
    // match request method
    const methodMatch = context.method === req.method;
    if (!methodMatch) {
      return false;
    }

    // match path using generated regexp
    const pathMatch = context.match(utils.getPathname(pathname));
    if (!pathMatch) {
      return false;
    }

    const isFn = typeof context.applyIf === 'function';
    const applyIf = isFn ? context.applyIf(req, pathMatch.params, req.body) : true;
    const applyCheck = negateApllyIf ? !applyIf : applyIf;
    if (applyCheck) {
      return false;
    }

    // all checks passed
    return true;
  };
}

/**
 * Get active paths prepared for route matching.
 * @param {Object} req ExpressJS request
 * @param {string} prefix Route prefix
 * @param {Array<Object>} routes Routes deined in API Mockup Server options
 * @returns {Array<Object>} Contexts - active routes containing method for matching tested path
 */
function getPaths(prefix, routes) {
  const { method } = defaultOptions.route;
  return routing.getActiveRoutes(routes).map((route) => ({
    path: route.path,
    method: route.method || method,
    applyIf: route.applyIf,
    callback: route.callback,
    match: match((prefix || '') + route.path, { decode: decodeURIComponent }),
  }));
}

/**
 * Method fetches proxy target from server options.
 * If there is multiple targets, when the server starts it runs CLI
 * for getting chiose from user.
 * @async
 * @param {string|Array<string>} proxy API Mockup Server proxy options
 * @returns {string} proxy target (proxy server URL)
 */
async function getProxyTarget(proxy) {
  if (!proxy || !proxy.server) {
    return null;
  }

  if (typeof proxy.server === 'string') {
    return proxy.server;
  }

  if (!Array.isArray(proxy.server)) {
    return null;
  }

  if (proxy.server.length === 0) {
    return null;
  }

  if (proxy.server.length === 1) {
    return proxy.server[0];
  }

  const choices = [
    {
      name: _t('WITHOUT_PROXY'),
      value: null,
    },
    ...proxy.server.map((item) => ({
      name: item,
      value: item,
    })),
    // todo: exit choice
    // {
    //   name: _t('EXIT'),
    //   value: -1,
    // },
  ];

  // get value from interactive CLI
  const prompt = await inquirer.prompt([{ ...defaultOptions.prompt.proxy, choices }]);

  return prompt.target;
}

module.exports = {
  getPaths,
  getProxy,
};
