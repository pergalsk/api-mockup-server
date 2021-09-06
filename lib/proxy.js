const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { match } = require('path-to-regexp');
const routing = require('./register');
const log = require('./log');

function getProxy(serverOptions) {
  const { routes, proxy } = serverOptions;

  if (!proxy?.server) {
    log.serverMsg('yellow', 'PROXY_NOT_CONFIGURED');
    return (req, res, next) => {
      next();
    };
  }

  log.serverMsg('green', 'PROXY_CONFIGURED');

  // TODO: add proxy callback for modifiyng returned data
  const onProxyRes = responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    if (!proxyRes.headers['content-type'].includes('application/json')) {
      return responseBuffer;
    }

    let data = JSON.parse(responseBuffer.toString('utf8'));
    data = Object.assign({}, data, { proxy: true });
    return JSON.stringify(data);
  });

  let proxyOpt = {
    target: proxy?.server,
    changeOrigin: true,
    // selfHandleResponse: true,
    // onProxyRes,
    logLevel: 'debug',
  };

  const contexts = getPaths(routes);

  return createProxyMiddleware(filter(contexts), proxyOpt);
}

function filter(contexts) {
  return (pathname, req) => {
    return !contexts.some(
      (ctx) =>
        ctx.method === req.method &&
        ctx.match(pathname) &&
        (typeof ctx.applyIf === 'function' ? ctx.applyIf(pathname, req, ctx) : true)
    );
  };
}

function getPaths(routes) {
  let oo = routing.getRoutes(routes);
  let uu = oo.filter((route) => route.active === true);

  return uu.map((route) => ({
    path: route.path,
    method: route.method,
    applyIf: route.applyIf,
    match: match(route.path, { decode: decodeURIComponent }),
  }));
}

module.exports = {
  getPaths,
  getProxy,
};
