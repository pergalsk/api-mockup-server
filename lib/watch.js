const chokidar = require('chokidar');
const utils = require('./utils');
const log = require('./log');
const _t = require('./texts');

function watch(watchPaths) {
  let watchLocations = [];

  if (utils.isString(watchPaths)) {
    watchLocations = [watchPaths];
  }

  if (Array.isArray(watchPaths)) {
    watchPaths.filter(utils.isString);
    watchLocations = [...watchLocations, watchPaths];
  }

  if (watchLocations.length > 0) {
    const watcher = chokidar.watch(watchLocations);
    watcher.on('change', (path, stats) => {
      log.warning(_t('FILE_OR_DIR_CHANGED', { path }));
    });
  }
}

module.exports = { watch };
