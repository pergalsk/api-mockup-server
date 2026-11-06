import nodeFs from 'node:fs';
import nodePath from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import * as log from './log.js';
import _t from './texts.js';

// import() of CommonJS file uses require cache, so it has to be cleared before reload
const require = createRequire(import.meta.url);

function getDataFromFile(routeOptions, serverOptions) {
  const { database, encoding, prefix } = serverOptions;
  const { key, status, prefix: routePrefix, path } = routeOptions;

  if (!key) {
    return {};
  }

  let data;
  let file;

  const filePaths = generateFilePaths(database, key, status);
  const fullPath = `${routePrefix ?? prefix}${path}`;

  try {
    // todo: make FS methods async ?
    if (nodeFs.existsSync(filePaths.withStatus)) {
      data = readJSONFile(filePaths.withStatus, encoding);
    } else if (nodeFs.existsSync(filePaths.default)) {
      data = readJSONFile(filePaths.default, encoding);
    } else if ((file = findOtherDataFile(database, key))) {
      // non-JSON file (e.g. KEY.txt, KEY.png) is sent as it is
    } else {
      log.warn(
        _t('WARNING_FILES_RESPONSE_DATA_NOT_FOUND', {
          key,
          filePathWithStatus: filePaths.withStatus,
          filePathDefault: filePaths.default,
          filePathOther: getFullFilePath(database, `${key}.*`),
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

  return { data, file };
}

/**
 * Finds non-JSON data file `KEY.<ext>` (no status suffix) in database folder.
 * If there are more such files, the first one in alphabetical order is used.
 * @param {string} database Database folder
 * @param {string} key Route key
 * @returns {string|undefined} Full path to the file
 */
function findOtherDataFile(database, key) {
  const dir = nodePath.resolve(process.cwd(), database);
  if (!nodeFs.existsSync(dir)) {
    return;
  }

  const fileName = nodeFs
    .readdirSync(dir)
    .filter((name) => {
      const ext = name.slice(key.length + 1);
      return name.startsWith(`${key}.`) && ext && !ext.includes('.') && ext !== 'json';
    })
    .sort()[0];

  return fileName && nodePath.join(dir, fileName);
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
  return nodePath.resolve(process.cwd(), database, fileName);
}

async function getRoutesFromFile(routesDef) {
  let routesList = [];

  if (typeof routesDef !== 'string') {
    return routesList;
  }

  const routesPath = nodePath.resolve(process.cwd(), routesDef);

  try {
    if (!nodeFs.existsSync(routesPath)) {
      log.warn(_t('WARNING_ROUTES_FILE_NOT_FOUND', { path: routesPath }));
      return [];
    }

    if (!nodeFs.lstatSync(routesPath).isFile()) {
      log.warn(_t('WARNING_ROUTES_PATH_NOT_FILE', { path: routesPath }));
      return [];
    }

    const routesModule = await loadFile(routesPath);
    // CommonJS file can have its routes in `exports.default`
    routesList = Array.isArray(routesModule) ? routesModule : routesModule?.default;
  } catch (e) {
    log.error(_t('ERROR_ROUTES_FILE_NOT_LOADED', { path: routesPath }));
    log.error(e?.message ?? e);
    return [];
  }

  if (!Array.isArray(routesList)) {
    log.warn(_t('WARNING_ROUTES_FILE_NOT_ARRAY', { path: routesPath }));
    return [];
  }

  return routesList;
}

/**
 * Loads a fresh copy of a JS or JSON file.
 * @param {string} filePath - Path to the file (absolute or relative to current folder).
 * @returns {Promise<*>} Default export of the file.
 */
async function loadFile(filePath) {
  const fullPath = nodePath.resolve(process.cwd(), filePath);
  clearRequireCache(fullPath);
  return importFile(fullPath);
}

/**
 * Loads fresh default export of a file. ESM cache can't be cleared, so every call
 * uses a new URL (old copy of the file stays in memory).
 * @param {string} filePath - Full path to the file.
 * @returns {Promise<*>} Default export of the file.
 */
async function importFile(filePath) {
  try {
    const fileModule = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`);
    return fileModule.default;
  } catch (e) {
    // import() does not load some files (e.g. .json), require does
    if (['ERR_IMPORT_ATTRIBUTE_MISSING', 'ERR_UNKNOWN_FILE_EXTENSION'].includes(e.code)) {
      return require(filePath);
    }
    throw e;
  }
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
    const fullPath = nodePath.resolve(process.cwd(), modulePath);

    // Check if the module exists and is a file
    if (nodeFs.existsSync(fullPath) && nodeFs.lstatSync(fullPath).isFile()) {
      // Remove the module from the require cache
      delete require.cache[require.resolve(fullPath)];
    }
  } catch (e) {
    log.error(_t('ERROR_WHILE_CLEARING_REQUIRE_CACHE', { modulePath }));
  }
}

export {
  getDataFromFile,
  getRoutesFromFile,
  loadFile,
};
