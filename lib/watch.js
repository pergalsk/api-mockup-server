/**
 * Watch module. Watch for changes.
 * @module watch
 */

import chokidar from 'chokidar';
import * as defaultOptions from './definitions.js';
import * as utils from './utils.js';
import * as log from './log.js';
import _t from './texts.js';
import { NEW_LINE } from './constants.js';

/**
 * Starts a watcher. It will watch given routes and database files for changes.
 * @param {Object} watchPaths Object containing routes and/or database paths to watch for changes.
 * @param {string} watchPaths.routes String containing path to file with routes definitions.
 * @param {string} watchPaths.database String containing path to directory with data files.
 * @param {Function} callbackFn Function to call when a change is detected.
 * @example
 *  import * as watcher from './lib/watch.js';
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
        log.warn(NEW_LINE + _t('FILE_OR_DIR_CHANGED_ROUTES', { path }));
        callbackFn();
      })
      .on('add', (path) => {
        log.warn(NEW_LINE + _t('FILE_OR_DIR_ADDED_ROUTES', { path }));
        callbackFn();
      });
  }

  if (utils.isString(database)) {
    const databaseWatcher = chokidar.watch(database, defaultOptions.watcher);
    databaseWatcher
      .on('change', (path) => log.warn(NEW_LINE + _t('FILE_OR_DIR_CHANGED_DATABASE', { path })))
      .on('add', (path) => log.warn(NEW_LINE + _t('FILE_OR_DIR_ADDED_DATABASE', { path })));
  }
}

export { watch };
