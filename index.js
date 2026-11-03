import express from 'express';
import corsMiddleware from 'cors';

import { getState, setState } from './lib/store.js';
import * as defaultOptions from './lib/definitions.js';
import ServerWrapper from './lib/server.js';
import * as routing from './lib/register.js';
import * as proxy from './lib/proxy.js';
import * as watcher from './lib/watch.js';
import * as cli from './lib/cli.js';
import * as log from './lib/log.js';
import { debounce } from './lib/utils.js';

import { RESTART_DEBOUNCE } from './lib/constants.js';

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

  // load routes file (if used)
  let loadedOptions = await routing.loadRoutes(serverOptions);
  let routesFileChanged = false;

  // use generated http proxy middleware
  let proxyMiddleware = proxy.getProxy(loadedOptions);
  app.use((...params) => {
    proxyMiddleware(...params);
  });

  // use generated router middleware
  let { routerMiddleware, routesDisplayList, stats } = routing.getRouter(loadedOptions);
  app.use((...params) => {
    routerMiddleware(...params);
  });

  // watch for changes (wait until ready, otherwise early file changes are missed)
  await watcher.watch({ routes, database }, () => {
    routesFileChanged = true;
    debouncedServerRestart(true);
  });

  // start server listening
  let server = ServerWrapper(app.listen(port), serverOptions, routesDisplayList, stats);

  const debouncedServerRestart = debounce(async (...args) => {
    // load routes only after a change (each load of ESM file stays in memory)
    if (routesFileChanged) {
      routesFileChanged = false;
      loadedOptions = await routing.loadRoutes(serverOptions);
    }
    server.destroy(() => handleServerRestart(...args));
  }, RESTART_DEBOUNCE);

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

    // regenerate middleware (routes or suspended state could be changed)
    proxyMiddleware = proxy.getProxy(loadedOptions);
    const {
      routerMiddleware: router,
      routesDisplayList: routes,
      stats,
    } = routing.getRouter(loadedOptions, isFileChange);
    routerMiddleware = router;
    routesDisplayList = routes;

    // re-create server on the same port
    server = ServerWrapper(app.listen(port), serverOptions, routesDisplayList, stats);
  }
}

export { amServer as default, amServer as 'module.exports' };
