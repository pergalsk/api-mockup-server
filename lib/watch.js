/**
 * Watch module. Watch for changes.
 * @module watch
 */

import nodeFs from 'node:fs';
import nodePath from 'node:path';
import chokidar from 'chokidar';
import * as defaultOptions from './definitions.js';
import * as utils from './utils.js';
import * as log from './log.js';
import _t from './texts.js';
import { NEW_LINE } from './constants.js';

/**
 * Starts a watcher for a file which may not exist yet.
 * For a missing file chokidar emits 'ready' before it really watches the parent directory,
 * so a file added right after 'ready' is missed. Watching the parent directory directly
 * avoids that: 'ready' then comes only after the directory is watched.
 * @param {string} filePath path to the file
 * @returns {Object} chokidar watcher
 */
function watchFile(filePath) {
  if (nodeFs.existsSync(filePath)) {
    return chokidar.watch(filePath, defaultOptions.watcher);
  }

  const parent = nodePath.dirname(filePath);
  const watched = [nodePath.resolve(parent), nodePath.resolve(filePath)];
  return chokidar.watch(parent, {
    ...defaultOptions.watcher,
    depth: 0,
    ignored: (path) => !watched.includes(nodePath.resolve(path)),
  });
}

/**
 * Starts a watcher. It will watch given routes and database files for changes.
 * @param {Object} watchPaths Object containing routes and/or database paths to watch for changes.
 * @param {string} watchPaths.routes String containing path to file with routes definitions.
 * @param {string} watchPaths.database String containing path to directory with data files.
 * @param {Function} callbackFn Function to call when a change is detected.
 * @returns {Promise<Function>} resolves with a function which closes the watchers,
 * when all watchers are ready (changes before that are missed)
 * @example
 *  import * as watcher from './lib/watch.js';
 *  watcher.watch({
 *   database: './db', // database should be a folder
 *   routes: './routes.js' // routes should be a file
 * });
 */
async function watch(watchPaths, callbackFn) {
  const { routes, database } = watchPaths;
  const watchers = [];

  if (utils.isString(routes)) {
    const routesWatcher = watchFile(routes);
    watchers.push(routesWatcher);
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
    watchers.push(databaseWatcher);
    databaseWatcher
      .on('change', (path) => log.warn(NEW_LINE + _t('FILE_OR_DIR_CHANGED_DATABASE', { path })))
      .on('add', (path) => log.warn(NEW_LINE + _t('FILE_OR_DIR_ADDED_DATABASE', { path })));
  }

  await Promise.all(watchers.map((w) => new Promise((resolve) => w.once('ready', resolve))));

  return () => Promise.all(watchers.map((w) => w.close()));
}

/**
 * Starts a watcher for the config file.
 * @param {string} configPath Path to the config file.
 * @param {Function} callbackFn Function to call when a change is detected.
 * @returns {Promise<void>} resolves when the watcher is ready
 */
function watchConfig(configPath, callbackFn) {
  const configWatcher = chokidar.watch(configPath, defaultOptions.watcher);
  configWatcher
    .on('change', (path) => {
      log.warn(NEW_LINE + _t('FILE_OR_DIR_CHANGED_CONFIG', { path }));
      callbackFn();
    })
    .on('add', (path) => {
      log.warn(NEW_LINE + _t('FILE_OR_DIR_ADDED_CONFIG', { path }));
      callbackFn();
    });

  return new Promise((resolve) => configWatcher.once('ready', resolve));
}

export { watch, watchConfig };
