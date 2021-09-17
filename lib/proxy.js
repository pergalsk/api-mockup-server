const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { match } = require('path-to-regexp');
const routing = require('./register');
const log = require('./log');
const _t = require('./texts');

function getProxy(serverOptions) {
  const { prefix, routes, proxy, encoding } = serverOptions;

  if (!proxy || !proxy.server) {
    log.serverMsg(_t('PROXY_NOT_CONFIGURED'));
    return (req, res, next) => {
      next();
    };
  }

  log.serverMsg(_t('PROXY_CONFIGURED'));

  // TODO: add proxy callback for modifiyng returned data
  const onProxyRes = responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    if (!proxyRes.headers['content-type'].includes('application/json')) {
      return responseBuffer;
    }

    let data = JSON.parse(responseBuffer.toString(encoding));
    data = Object.assign({}, data, { proxy: true });
    return JSON.stringify(data);
  });

  let proxyOpt = {
    target: proxy && proxy.server,
    changeOrigin: true,
    ws: true,
    // selfHandleResponse: true,
    // onProxyRes,
    logProvider: log.provider,
    logLevel: 'debug',
  };

  const contexts = getPaths(prefix, routes);

  return createProxyMiddleware(filter(contexts), proxyOpt);
}

function filter(c) {
  // shortened notation due to minimalize HPM logging
  return (p, r) => m(p, r, c);
}

// m - method for matching routes
function m(pathname, req, contexts) {
  return !contexts.some((ctx) => {
    // match request method
    const methodMatch = ctx.method === req.method;
    if (!methodMatch) {
      return false;
    }

    // match path using generated regexp
    const pathMatch = ctx.match(pathname);
    if (!pathMatch) {
      return false;
    }

    // get result from user custom callback method
    const params = pathMatch ? pathMatch.params : {};
    const applyIf = typeof ctx.applyIf === 'function' ? ctx.applyIf(req, params) : true;
    if (!applyIf) {
      return false;
    }

    // all checks passed
    return true;
  });
}

function getPaths(prefix, routes) {
  return routing.getActiveRoutes(routes).map((route) => ({
    path: route.path,
    method: route.method,
    applyIf: route.applyIf,
    match: match((prefix || '') + route.path, { decode: decodeURIComponent }),
  }));
}

module.exports = {
  getPaths,
  getProxy,
};
