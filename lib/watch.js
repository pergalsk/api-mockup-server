/**
 * Watch module. Watch for changes.
 * @module watch
 */

const chokidar = require('chokidar');
const defaultOptions = require('./definitions');
const utils = require('./utils');
const log = require('./log');
const _t = require('./texts');

/**
 * Starts a watcher. It will watch given routes and database files for changes.
 * @param {Object} watchPaths Object containing routes and/or database paths to watch for changes.
 * @param {string} watchPaths.routes String containing path to file with routes definitions.
 * @param {string} watchPaths.database String containing path to directory with data files.
 * @param {Function} callbackFn Function to call when a change is detected.
 * @example
 *  const watcher = require('./lib/watch');
 *  watcher.watch({
 *   database: './db', // database should be a folder
 *   routes: './routes.js' // routes should be a file
 * });
 */
function watch(watchPaths, callbackFn) {
  const { routes, database } = watchPaths;

  if (utils.isString(routes)) {
    const routesWatcher = chokidar.watch(routes, defaultOptions.watcher);
    routesWatcher
      .on('change', (path) => {
        log.warn(_t('FILE_OR_DIR_CHANGED_ROUTES', { path }));
        callbackFn();
      })
      .on('add', (path) => {
        log.warn(_t('FILE_OR_DIR_ADDED_ROUTES', { path }));
        callbackFn;
      });
  }

  if (utils.isString(database)) {
    const databaseWatcher = chokidar.watch(database, defaultOptions.watcher);
    databaseWatcher
      .on('change', (path) => log.info(_t('FILE_OR_DIR_CHANGED_DATABASE', { path })))
      .on('add', (path) => log.info(_t('FILE_OR_DIR_ADDED_DATABASE', { path })));
  }
}

/**
 * Starts a watcher. It will watch given path/paths for changes.
 * @param {string|Array<string>} watchPaths String containing path to watch for changes. It could be also array of strings.
 */
function watchSimple(watchPaths) {
  let watchLocations = [];

  if (utils.isString(watchPaths)) {
    watchLocations = [watchPaths];
  }

  if (Array.isArray(watchPaths)) {
    watchPaths.filter(utils.isString);
    watchLocations = [...watchLocations, watchPaths];
  }

  if (watchLocations.length > 0) {
    const watcher = chokidar.watch(watchLocations, { ignoreInitial: true });
    watcher
      .on('change', (path) => log.warn(_t('FILE_OR_DIR_CHANGED', { path })))
      .on('add', (path) => log.warn(_t('FILE_OR_DIR_ADDED', { path })));
  }
}

module.exports = { watch, watchSimple };
