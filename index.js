const express = require('express');
const corsMiddleware = require('cors');

const defaultOptions = require('./lib/definitions');
const ServerWrapper = require('./lib/server');
const routing = require('./lib/register');
const proxy = require('./lib/proxy');
const file = require('./lib/file');
const watcher = require('./lib/watch');
const cli = require('./lib/cli');
const log = require('./lib/log');
const { debounce } = require('./lib/utils');

const { SERVER_RESTART_DEBOUNCE_MS } = require('./lib/constants');

async function amServer(options = {}) {
  log.serverStart();

  const serverOptions = { ...defaultOptions.server, ...options };
  const { port, routes, database, cors } = serverOptions;

  // get proxy target from user selection
  const target = await cli.getProxyTarget(serverOptions.proxy);

  // create express application
  const app = express();

  if (cors !== false) {
    app.use(corsMiddleware());
  }

  // use JSON middleware
  app.use(express.json());

  // use encode URLs middleware
  app.use(express.urlencoded({ extended: true }));

  let suspended = null;

  // use generated http proxy middleware
  let proxyMiddleware = proxy.getProxy(serverOptions, target, suspended);
  app.use((...params) => {
    proxyMiddleware(...params);
  });

  // use generated router middleware
  let { routerMiddleware, routesDisplayList } = routing.getRouter(serverOptions, target, suspended);
  app.use((...params) => {
    routerMiddleware(...params);
  });

  // start server listening
  let server = ServerWrapper(app.listen(port), serverOptions);

  const debouncedServerRestart = debounce(
    () => server.destroy(handleServerRestart),
    SERVER_RESTART_DEBOUNCE_MS
  );

  // watch for changes
  watcher.watch({ routes, database }, debouncedServerRestart);

  // create command-line shortcuts
  cli.shortcuts(() => {
    return {
      serverOptions,
      target,
      routesDisplayList,
      suspended,
      callbacks: {
        suspend: () => {
          if (suspended == null || suspended === 'TURNING_OFF') {
            suspended = 'TURNING_ON';
          } else {
            suspended = 'TURNING_OFF';
          }
          debouncedServerRestart(suspended);
        },
      },
    };
  });

  function handleServerRestart() {
    const isRestart = true;

    suspended == null && log.serverRestart();

    // required files are cached in NodeJs -> clear cache
    file.clearRequireCache(serverOptions.routes);

    // regenerate middleware (files could be changed)
    proxyMiddleware = proxy.getProxy(serverOptions, target, suspended);
    const { routerMiddleware: router, routesDisplayList: routes } = routing.getRouter(
      serverOptions,
      target,
      suspended
    );
    routerMiddleware = router;
    routesDisplayList = routes;

    // re-create server on the same port
    server = ServerWrapper(app.listen(port), serverOptions, isRestart);
  }
}

module.exports = amServer;
