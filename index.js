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

  let serverOptions = { ...defaultOptions.server, ...options };
  let newServerOptions = null;

  // get proxy target from user selection
  const target = await cli.getProxyTarget(serverOptions.proxy);
  setState({ target });

  // create express application
  const app = express();

  // cors option can change while the server runs
  const cors = corsMiddleware();
  app.use((req, res, next) => {
    serverOptions.cors !== false ? cors(req, res, next) : next();
  });

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
  const startWatchers = () => {
    const { routes, database } = serverOptions;
    return watcher.watch({ routes, database }, () => {
      routesFileChanged = true;
      debouncedServerRestart(true);
    });
  };
  let closeWatchers = await startWatchers();

  // start server listening
  let server = ServerWrapper(app.listen(serverOptions.port), serverOptions, routesDisplayList, stats);

  const debouncedServerRestart = debounce(async (...args) => {
    if (newServerOptions) {
      await applyNewServerOptions();
    }
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

  async function applyNewServerOptions() {
    const { routes, database } = serverOptions;

    serverOptions = newServerOptions;
    newServerOptions = null;
    routesFileChanged = true;
    setState({ target: proxy.getProxyTargetOnReload(serverOptions.proxy, getState().target) });

    if (serverOptions.routes !== routes || serverOptions.database !== database) {
      await closeWatchers();
      closeWatchers = await startWatchers();
    }

    const { prefix, port } = serverOptions;
    log.serverConfig(prefix, proxy.getProxyTargetText(serverOptions), port);
  }

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

    // re-create server (port could be changed by new options)
    server = ServerWrapper(app.listen(serverOptions.port), serverOptions, routesDisplayList, stats);
  }

  return {
    // used by the command-line tool when the config file changes
    reconfigure: (options) => {
      newServerOptions = { ...defaultOptions.server, ...options };
      debouncedServerRestart(true);
    },
  };
}

export { amServer as default, amServer as 'module.exports' };
