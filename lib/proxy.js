const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { match } = require('path-to-regexp');
const inquirer = require('inquirer');
const defaultOptions = require('./definitions');
const routing = require('./register');
const log = require('./log');
const _t = require('./texts');

const { LOG_LINE_PREFIX_BASE_CHARS } = require('./constants');

async function getProxy(serverOptions) {
  const { prefix, routes, proxy, encoding } = serverOptions;

  if (!proxy || !proxy.server || (Array.isArray(proxy.server) && proxy.server.length === 0)) {
    log.serverMsg(_t('PROXY_NOT_CONFIGURED'));
    return (req, res, next) => {
      next();
    };
  }

  let target;
  if (Array.isArray(proxy.server)) {
    if (proxy.server.length === 1) {
      target = proxy.server[0];
    }

    if (proxy.server.length > 1) {
      const promptOptions = [
        {
          type: 'list',
          name: 'target',
          message: _t('PROXY_TARGET'),
          prefix: LOG_LINE_PREFIX_BASE_CHARS,
          choices: proxy.server,
          loop: false,
          pageSize: 10,
        },
      ];

      let prompt = await inquirer.prompt(promptOptions);
      target = prompt.target;
    }
  } else {
    target = proxy.server;
  }

  let proxyOpt = {
    target,
    changeOrigin: true,
    ws: true,
    // selfHandleResponse: true,
    // onProxyRes: onProxyRes(encoding),
    logProvider: log.provider,
    logLevel: 'debug',
  };

  if (!Array.isArray(proxy.server) || proxy.server.length <= 1) {
    log.proxyTarget(target);
  }
  log.serverMsg(_t('PROXY_CONFIGURED'));

  const contexts = getPaths(prefix, routes);

  return createProxyMiddleware(filter(contexts), proxyOpt);
}

function onProxyRes(encoding) {
  return responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    if (!proxyRes.headers['content-type'].includes('application/json')) {
      return responseBuffer;
    }

    let data = JSON.parse(responseBuffer.toString(encoding));
    data = Object.assign({}, data, { proxy: true });

    return JSON.stringify(data);
  });
}

function filter(c) {
  // shortened notation due to minimalize HPM logging
  // (pathname, req) => m(pathname, req, contexts);
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
  const { method } = defaultOptions.route;
  return routing.getActiveRoutes(routes).map((route) => ({
    path: route.path,
    method: route.method || method,
    applyIf: route.applyIf,
    match: match((prefix || '') + route.path, { decode: decodeURIComponent }),
  }));
}

module.exports = {
  getPaths,
  getProxy,
};
