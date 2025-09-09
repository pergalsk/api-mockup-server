const nodeFs = require('fs');
const nodePath = require('path');

const log = require('./log');
const _t = require('./texts');

function getDataFromFile(routeOptions, serverOptions) {
  const { database, encoding, prefix } = serverOptions;
  const { key, status, prefix: routePrefix, path } = routeOptions;

  if (!key) {
    return;
  }

  let data;

  const filePaths = generateFilePaths(database, key, status);
  const fullPath = `${routePrefix ?? prefix}${path}`;

  try {
    // todo: make FS methods async ?
    if (nodeFs.existsSync(filePaths.withStatus)) {
      data = readJSONFile(filePaths.withStatus, encoding);
    } else if (nodeFs.existsSync(filePaths.default)) {
      data = readJSONFile(filePaths.default, encoding);
    } else {
      log.warn(
        _t('WARNING_FILES_RESPONSE_DATA_NOT_FOUND', {
          key,
          filePathWithStatus: filePaths.withStatus,
          filePathDefault: filePaths.default,
        })
      );
      log.warn(_t('ROUTE_PATH_SERVED_EMPTY', { fullPath }));
    }
  } catch (e) {
    log.error(
      _t('ERROR_WHILE_READING_JSON_FILE', {
        key,
        filePathWithStatus: filePaths.withStatus,
        filePathDefault: filePaths.default,
      })
    );
    log.error(_t('ROUTE_PATH_SERVED_EMPTY', { fullPath }));
  }

  return data;
}

function readJSONFile(filePath, encoding) {
  let rawData;

  rawData = nodeFs.readFileSync(filePath, encoding);
  if (typeof rawData !== 'string') {
    return;
  }

  rawData = rawData.trim();
  if (rawData === '') {
    return;
  }

  return JSON.parse(rawData);
}

function generateFilePaths(database, key, status) {
  return {
    default: getFullFilePath(database, `${key}.json`),
    withStatus: getFullFilePath(database, `${key}.${status}.json`),
  };
}

function getFullFilePath(database, fileName) {
  return nodePath.join(process.cwd(), database, fileName);
}

function getRoutesFromFile(routesDef) {
  let routesList = [];

  if (typeof routesDef !== 'string') {
    return routesList;
  }

  try {
    const routesPath = nodePath.join(process.cwd(), routesDef);
    if (nodeFs.existsSync(routesPath) && nodeFs.lstatSync(routesPath).isFile()) {
      routesList = require(routesPath);
    }
  } catch (e) {
    routesList = [];
  }

  return routesList;
}

/**
 * Clears the require cache for a specific module.
 * Note: NodeJs caches required modules (files), so if a module's content changes,
 * it won't be reloaded unless the cache is cleared. This function helps
 * with watching file changes.
 * @param {string} modulePath - The modulePath to the module to clear from the cache.
 * @returns {void}
 */
function clearRequireCache(modulePath) {
  if (typeof modulePath !== 'string') {
    return;
  }

  try {
    // Get the full path to the module
    const fullPath = nodePath.join(process.cwd(), modulePath);

    // Check if the module exists and is a file
    if (nodeFs.existsSync(fullPath) && nodeFs.lstatSync(fullPath).isFile()) {
      // Remove the module from the require cache
      delete require.cache[require.resolve(fullPath)];
    }
  } catch (e) {
    log.error(_t('ERROR_WHILE_CLEARING_REQUIRE_CACHE', { modulePath }));
  }
}

module.exports = {
  getDataFromFile,
  getRoutesFromFile,
  clearRequireCache,
};
