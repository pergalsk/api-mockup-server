const { getState } = require('./store');
const cli = require('./cli');
const log = require('./log');
const _t = require('./texts');

/**
 * Wraps a Node.js HTTP server to manage its sockets and provide
 * a clean way to destroy the server without hanging on keep-alive connections.
 *
 * @param {import('http').Server} server - HTTP server instance (e.g., from app.listen()).
 * @param {Object} [options]
 * @param {number} [options.keepAliveTimeout=0] - Idle keep-alive timeout (ms). 0 disables keep-alive.
 * @param {number} [options.headersTimeout=2500] - Max time to receive headers (ms).
 * @param {number} [options.socketGraceMs=150] - Grace before force-destroying sockets (ms).
 * @returns {{
 *   server: import('http').Server,
 *   destroy: (callback?: (info: { server: import('http').Server, closed: boolean, socketsClosed: number }) => void) => void
 * }}
 */
function ServerWrapper(server, serverOptions, options = {}) {
  const defaults = { keepAliveTimeout: 0, headersTimeout: 2500, socketGraceMs: 150 };
  const { keepAliveTimeout, headersTimeout, socketGraceMs } = { ...defaults, ...options };
  const { prefix, port } = serverOptions;

  const sockets = new Set();

  assertValidServer(server);
  configureServer(server);

  /**
   * Ensures the provided value looks like a Node HTTP server.
   * @param {any} value
   * @throws {Error} if invalid.
   */
  function assertValidServer(value) {
    const valid =
      value &&
      typeof value === 'object' &&
      typeof value.on === 'function' &&
      typeof value.close === 'function';

    if (!valid) {
      const type = value === null ? 'null' : typeof value;
      throw new Error(`ServerWrapper requires a valid Node.js HTTP server instance (got ${type}).`);
    }
  }

  /**
   * Applies shutdown-friendly timeouts on the server.
   * @param {import('http').Server} srv
   */
  function configureServer(srv) {
    srv.keepAliveTimeout = keepAliveTimeout;
    srv.headersTimeout = headersTimeout;

    // Starts tracking sockets created for this server.
    srv.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });

    // Log when server starts listening, and print CLI help.
    srv.on('listening', () => {
      const { isRestart, target } = getState();

      if (isRestart) {
        return;
      }

      log.serverConfig(prefix, target, port);
      cli.printCliHelp();
    });

    // Handle server 'error' events, specifically EADDRINUSE.
    srv.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log.error('\n' + _t('ERROR_PORT_IN_USE', { port }));
        process.exit(1); // exit the process with error
      } else {
        throw err;
      }
    });
  }

  /**
   * Attempts to gracefully end all sockets, then force-destroys them
   * after a grace period if they don’t close.
   * @returns {number} count of sockets we attempted to close.
   */
  function closeAllSockets() {
    let count = 0;
    for (const socket of sockets) {
      count++;
      try {
        socket.end();
        socket.setTimeout?.(socketGraceMs, () => socket.destroy());
      } catch {
        // ignore errors while tearing down sockets
      }
    }
    return count;
  }

  /**
   * Public destroy method: end/destroy sockets, then close the server.
   * @param {(info: { server: import('http').Server, closed: boolean, socketsClosed: number }) => void} [callback]
   */
  function destroy(callback) {
    const socketsClosed = closeAllSockets();
    server.close((err) => {
      if (typeof callback === 'function') {
        callback({ server, closed: !err, socketsClosed });
      }
    });
  }

  return { server, destroy };
}

module.exports = ServerWrapper;
