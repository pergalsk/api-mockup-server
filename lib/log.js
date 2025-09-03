/**
 * Log module. Methods for colored console log output
 * and enhanced logging of data in different situations.
 * @module log
 */

const { formatDate } = require('./utils');
const chalk = require('chalk');
const utils = require('./utils');
const _t = require('./texts');

const {
  LOG_LINE_MARK_CHAR,
  LOG_LINE_PREFIX_CHARS,
  LOG_LINE_PREFIX_COLOR,
  LOG_TIME_FORMAT,
  HPM_PREFIX,
} = require('./constants');

/**
 * Generates function for colored console output with text color
 * given by parameter `chalkColor`. Generated function's parameter
 * `messages` could be either a string or an array of strings.
 * @param {string} chalkColor Chalk method name for colored log output
 * @returns {Function} Generated function for colored output
 */
function coloredLog(chalkColor) {
  return (messages) => {
    if (Array.isArray(messages)) {
      messages.forEach((message) => {
        console.log(chalk[chalkColor](message));
      });
    } else {
      console.log(chalk[chalkColor](messages));
    }
  };
}

/**
 * Method for colored console logging at level ERROR.
 * It will use red text color.
 * @type {Function}
 */
const error = coloredLog('red');

/**
 * Method for colored console logging at level WARN.
 * It will use yellow text color.
 * @type {Function}
 */
const warn = coloredLog('yellow');

/**
 * Method for colored console logging at level INFO.
 * It will use white text color.
 * @type {Function}
 */
const info = coloredLog('white');

/**
 * Method for colored console logging at level DEBUG.
 * It will use gray text color.
 * @type {Function}
 */
const debug = coloredLog('gray');

/**
 * Returns colored prefix defined in LOG_LINE_PREFIX_CHARS
 * and colored by provided chalkColor parameter.
 * @param {string} [chalkColor] Chalk method name for colored console output.
 * If not provided, LOG_LINE_PREFIX_COLOR constant is used as a color.
 * @returns {string} Colored prefix which can be used in console logs.
 */
function prefix(chalkColor = LOG_LINE_PREFIX_COLOR) {
  return chalk[chalkColor](LOG_LINE_PREFIX_CHARS);
}

/**
 * Logs a colored horizontal separator composed from defined LOG_LINE_MARK_CHAR constant.
 * If separatorLength is not provided length is calculated from title message
 * and prefix characters length.
 * @param {number} [separatorLength] Number of characters to output
 */
function hrSeparator(separatorLength) {
  const length = separatorLength || _t('STARTING_SM_SERVER').length + LOG_LINE_PREFIX_CHARS.length;
  info(chalk[LOG_LINE_PREFIX_COLOR](LOG_LINE_MARK_CHAR.repeat(length)));
}

/**
 * Outputs text with graphical prefix in color given by `chalkColor` parameter to console log.
 * @param {string} text Text to be logged
 * @param {string} [chalkColor] Chalk method name for colored log output.
 * If not provided, LOG_LINE_PREFIX_COLOR constant will
 */
function serverMsg(text, chalkColor = LOG_LINE_PREFIX_COLOR) {
  info(prefix(chalkColor) + text);
}

/**
 * Logs decorated title app message with information about application name and server start.
 */
function serverStart() {
  hrSeparator();
  serverMsg(chalk.whiteBright.bold(_t('STARTING_SM_SERVER')));
  hrSeparator();
}

/**
 * Logs decorated message with information about port which application is listen on.
 * @param {Object} serverOptions API Mockup Server options
 */
function serverListen(serverOptions) {
  const { port } = serverOptions;

  hrSeparator();
  info(prefix() + _t('SERVER_LISTENING_AT') + chalk.greenBright(port));
  serverMsg(_t('HANDLED_ROUTES'));
}

/**
 * Logs decorated message with information about proxy server.
 * @param {string} target Proxy server address
 */
function proxyTarget(target) {
  serverMsg(chalk.whiteBright.bold(_t('PROXY_TARGET')) + ' ' + chalk.cyan(target));
}

/**
 * Logs detailed colored route information on every route call
 * with datetime and params listed below.
 * @param {Object} req ExpressJS request object
 * @param {string} method HTTP method name
 * @param {string} status HTTP status code
 * @param {string} key Code used to find data file in DB folder
 * @param {number} time Measured time spend with request processing
 * @param {boolean} isEmptyData `true` if data object is empty
 */
function routeCall(req, method, status, key, time, isEmptyData) {
  const c = {
    dateTime: chalk.white('[' + formatDate(new Date(), LOG_TIME_FORMAT) + ']'),
    method: chalk.greenBright(method.toUpperCase()),
    status: status < 400 ? chalk.whiteBright(status) : chalk.redBright(status),
    key: chalk.yellowBright(key || '-'),
    path: chalk.whiteBright(req.originalUrl),
    time: chalk.grey(time + 'ms'),
    emptyData: isEmptyData ? chalk.grey(' ' + _t('EMPTY_RESPONSE')) : '',
  };

  info(`${c.dateTime} ${c.method} ${c.status} ${c.key} ${c.path} ${c.time}` + c.emptyData);

  if (!utils.isEmptyObject(req.body)) {
    // debug('>> ' + JSON.stringify(req.body));
  }
}

/**
 * Logs detailed info about invoking callback method in route handler.
 * @param {string} method HTTP method name
 * @param {string|number} status HTTP status code
 * @param {string} key Code used to find data file in DB folder
 * @param {string} url Called URL
 */
function callbackRoute(method, status, key, url) {
  debug(LOG_LINE_PREFIX_CHARS + `callback -> ${method} ${status} ${key || '-'} ${url}`);
}

/**
 * Logs detailed info about invoking callback method in proxy request handler.
 * @param {string} method HTTP method name
 * @param {string|number} status HTTP status code
 * @param {string} key Code used to find data file in DB folder
 * @param {string} url Called URL
 */
function callbackProxy(method, status, key, url) {
  debug(
    LOG_LINE_PREFIX_CHARS +
      _t('PROXY_LABEL') +
      ` callback -> ${method} ${status} ${key || '-'} ${url}`
  );
}

/**
 * Logs colored list with active routes marked with symbol (*)
 * which indicates conditionally mocked routes.
 * @param {Object} routesDisplayList Routes list to display
 */
function routesList(routesDisplayList) {
  let note = false;

  routesDisplayList.forEach((route) => {
    const { applyIf, method, status, key, path } = route;

    let hasApplyIf = typeof applyIf === 'function';

    if (hasApplyIf && !note) {
      note = true;
    }

    warn((hasApplyIf ? ' * ' : '   ') + `${method} ${status} ${key || '-'} ${path}`);
  });

  note && debug('   ' + _t('ROUTES_MARKED_WITH_ASTERISK'));
}

/**
 * Removes original prefix from HTTP Proxy Middleware log message
 * and replaces it with new app decoration prefix and Proxy label.
 * @param {string} msg Message to display
 * @returns {string} Modified HTTP Proxy Middleware message
 */
function standardizeHPMMessage(msg) {
  return LOG_LINE_PREFIX_CHARS + _t('PROXY_LABEL') + msg.replace(HPM_PREFIX, '');
}

/**
 * Generates log provider with error, warn, info, debug and log methods.
 * @returns {Object} Log provider
 */
function provider() {
  return {
    error: (msg) => error(standardizeHPMMessage(msg)),
    warn: (msg) => warn(standardizeHPMMessage(msg)),
    info: (msg) => debug(standardizeHPMMessage(msg)),
    debug: (msg) => debug(standardizeHPMMessage(msg)),
    log: (msg) => debug(standardizeHPMMessage(msg)),
  };
}

module.exports = {
  error,
  warn,
  info,
  debug,
  hrSeparator,
  serverMsg,
  serverListen,
  serverStart,
  proxyTarget,
  routeCall,
  callbackRoute,
  callbackProxy,
  routesList,
  provider,
};
