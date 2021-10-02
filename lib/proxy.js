const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { match } = require('path-to-regexp');
const inquirer = require('inquirer');
const defaultOptions = require('./definitions');
const routing = require('./register');
const utils = require('./utils');
const log = require('./log');
const _t = require('./texts');

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
  const onProxyRes = getOnProxyResFn(encoding, contexts);

  if (!Array.isArray(proxy.server) || proxy.server.length <= 1) {
    log.proxyTarget(target);
  }
  log.serverMsg(_t('PROXY_CONFIGURED'));

  const options = { target, onProxyRes };
  return createProxyMiddleware(getFilterFn(contexts), { ...defaultOptions.proxy, ...options });
}

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

function getFilterFn(c) {
  // shortened notation due to minimalize HPM logging
  // (pathname, req) => m(pathname, req, contexts);
  return (p, r) => m(p, r, c);
}

// m - method for matching routes
function m(pathname, req, contexts) {
  return !contexts.some(getMatchRouteFn(req, pathname, true));
}

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

    // get result from user custom callback method
    const params = pathMatch ? pathMatch.params : {};
    const applyIf = typeof context.applyIf === 'function' ? context.applyIf(req, params) : true;
    if (negateApllyIf ? !applyIf : applyIf) {
      return false;
    }

    // all checks passed
    return true;
  };
}

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
