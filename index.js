const express = require('express');
const corsMiddleware = require('cors');

const { getState, setState } = require('./lib/store');
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
  log.appStart();

  const serverOptions = { ...defaultOptions.server, ...options };
  const { port, routes, database, cors } = serverOptions;

  // get proxy target from user selection
  const target = await cli.getProxyTarget(serverOptions.proxy);
  setState({ target });

  // create express application
  const app = express();

  if (cors !== false) {
    app.use(corsMiddleware());
  }

  // use JSON middleware
  app.use(express.json());

  // use encode URLs middleware
  app.use(express.urlencoded({ extended: true }));

  // use generated http proxy middleware
  let proxyMiddleware = proxy.getProxy(serverOptions);
  app.use((...params) => {
    proxyMiddleware(...params);
  });

  // use generated router middleware
  let { routerMiddleware, routesDisplayList } = routing.getRouter(serverOptions);
  app.use((...params) => {
    routerMiddleware(...params);
  });

  // start server listening
  let server = ServerWrapper(app.listen(port), serverOptions);

  const debouncedServerRestart = debounce(
    (...args) => server.destroy(() => handleServerRestart(...args)),
    SERVER_RESTART_DEBOUNCE_MS
  );

  // watch for changes
  watcher.watch({ routes, database }, () => debouncedServerRestart(true));

  // create command-line shortcuts
  cli.shortcuts(() => {
    return {
      serverOptions,
      routesDisplayList,
      callbacks: {
        suspend: () => {
          const turnOn = getState().suspended == null || getState().suspended === 'TURNING_OFF';
          setState({ suspended: turnOn ? 'TURNING_ON' : 'TURNING_OFF' });
          debouncedServerRestart();
        },
      },
    };
  });

  function handleServerRestart(isFileChange = false) {
    setState({ isRestart: true });

    // required files are cached in NodeJs -> clear cache
    file.clearRequireCache(serverOptions.routes);

    // regenerate middleware (files could be changed)
    proxyMiddleware = proxy.getProxy(serverOptions);
    const { routerMiddleware: router, routesDisplayList: routes } = routing.getRouter(
      serverOptions,
      isFileChange
    );
    routerMiddleware = router;
    routesDisplayList = routes;

    // re-create server on the same port
    server = ServerWrapper(app.listen(port), serverOptions);
  }
}

module.exports = amServer;
