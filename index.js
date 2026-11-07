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

import { RESTART_DEBOUNCE, NEW_LINE } from './lib/constants.js';

/**
 * Starts API Mockup Server.
 * @param {Object} [options] server options
 * @returns {Promise<{port: number, url: string, close: () => Promise<void>}>}
 *  resolves when the server listens, rejects when it can't start (e.g. port in use)
 */
async function amServer(options = {}) {
  let serverOptions = { ...defaultOptions.server, ...options };
  let newServerOptions = null;

  log.setSilent(serverOptions.silent);
  log.appStart();

  // get proxy target from user selection (state is reset, previous server could change it)
  const target = await cli.getProxyTarget(serverOptions.proxy, serverOptions.interactive !== false);
  setState({ target, suspended: null, isRestart: false });

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
  let serverConfigChanged = false;

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

  let server = null;
  let port = null; // real port (differs from options with port 0)
  let isClosed = false;
  let closing = null;
  let resolveClosed;
  const closed = new Promise((resolve) => (resolveClosed = resolve));

  // starts server listening, port 0 is used only for the first start (then the same port is kept)
  async function listen() {
    server = ServerWrapper(app.listen(serverOptions.port || port || 0), serverOptions, routesDisplayList, stats);
    await server.listening;
    port = server.server.address().port;
  }

  try {
    await listen();
  } catch (e) {
    await closeWatchers();
    throw e;
  }

  const debouncedServerRestart = debounce(async (...args) => {
    if (isClosed) {
      return;
    }
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

  // create command-line shortcuts (only with `interactive` option and TTY)
  const getShortcutParams = () => {
    return {
      serverOptions: { ...serverOptions, port },
      routesDisplayList,
      callbacks: {
        suspend: () => {
          const turnOn = getState().suspended == null || getState().suspended === 'TURNING_OFF';
          setState({ suspended: turnOn ? 'TURNING_ON' : 'TURNING_OFF' });
          debouncedServerRestart();
        },
      },
    };
  };
  const closeShortcuts = cli.hasShortcuts(serverOptions)
    ? cli.shortcuts(getShortcutParams, () => close())
    : () => {};

  /**
   * Stops the server, file watchers and keyboard shortcuts.
   * @param {Error} [error] reason when the server stops itself (e.g. port in use after restart)
   * @returns {Promise<void>}
   */
  function close(error) {
    if (!closing) {
      isClosed = true;
      closing = (async () => {
        closeShortcuts();
        await closeWatchers();
        await new Promise((resolve) => server.destroy(resolve));
        resolveClosed(error);
      })();
    }
    return closing;
  }

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

    // server config is logged after the new server listens
    serverConfigChanged = true;
  }

  async function handleServerRestart(isFileChange = false) {
    if (isClosed) {
      return;
    }

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
    try {
      await listen();
    } catch (e) {
      log.error(NEW_LINE + e.message);
      await close(e);
      return;
    }

    // close() was called while the new server was starting
    if (isClosed) {
      server.destroy();
    } else if (serverConfigChanged) {
      serverConfigChanged = false;
      log.serverConfig(serverOptions.prefix, proxy.getProxyTargetText(serverOptions), port);
    }
  }

  return {
    get port() {
      return port;
    },
    get url() {
      return `http://localhost:${port}`;
    },
    close: () => close(),
    // used by the command-line tool: resolves when the server is closed (with error if it failed)
    closed,
    // used by the command-line tool when the config file changes
    reconfigure: (options) => {
      newServerOptions = { ...defaultOptions.server, ...options };
      debouncedServerRestart(true);
    },
  };
}

export { amServer as default, amServer as 'module.exports' };
