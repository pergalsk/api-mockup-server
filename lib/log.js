/**
 * Log module. Methods for colored console log output
 * and enhanced logging of data in different situations.
 * @module log
 */
const chalk = require('chalk');

const pkg = require('../package.json');
const _t = require('./texts');
const { formatDate, isEmptyObject } = require('./utils');

const {
  LOG_FRAME_BLOCKS,
  LOG_LINE_MARK_CHAR,
  LOG_LINE_PREFIX_CHARS,
  LOG_LINE_PREFIX_COLOR,
  LOG_TIME_FORMAT,
  HPM_PREFIX,
  HPM_SUPPRESSED_MSGS,
  LEFT_PAD,
  NEW_LINE,
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
    if (!Array.isArray(messages)) {
      console.log(chalk[chalkColor](messages));
      return;
    }

    messages.forEach((message) => {
      console.log(chalk[chalkColor](message));
    });
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
 * Method for colored console logging at level NOTICE.
 * It will use cyan text color.
 * @type {Function}
 */
const notice = coloredLog('cyan');

/**
 * Method for colored console logging at level EMPHASIZE.
 * It will use whiteBright text color.
 * @type {Function}
 */
const emphasize = coloredLog('whiteBright');

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
 * Displays the application startup banner with app name and version.
 */
function appStart() {
  const appName = _t('APP_NAME');
  const versionTitle = _t('VERSION');
  const versionNumber = `${pkg.version} 😎`;
  buildFrame([appName, `${versionTitle} ${versionNumber}`]);
}

/**
 * Renders a framed block to the log output using double-line box characters.
 *
 * Prints one or more lines inside a double-line box built from LOG_FRAME_BLOCKS, coloring the frame
 * with LOG_LINE_PREFIX_COLOR via chalk. The first line is treated as a title and emphasized using
 * chalk.whiteBright.bold; subsequent lines are logged in chalk.white. The inner width is derived
 * from the longest line and all lines are right-padded to match this width.
 * ╔══════════════╗
 * ║ Server start ║
 * ║ Listening    ║
 * ╚══════════════╝
 *
 * @param {string[]} texts - Ordered lines to render within the frame; may be empty.
 * @returns {void}
 */
function buildFrame(texts) {
  const block = LOG_FRAME_BLOCKS;

  const length = texts.reduce((acc, text) => Math.max(text.length, acc), 0);
  const top = block[2] + block[0].repeat(length + 2) + block[3];
  const bottom = block[4] + block[0].repeat(length + 2) + block[5];

  info(chalk[LOG_LINE_PREFIX_COLOR](top));
  texts.map((text, index) =>
    info(
      chalk[LOG_LINE_PREFIX_COLOR](block[1]) +
        ' ' +
        (index ? chalk.white(text) : chalk.whiteBright.bold(text)) +
        ' '.repeat(Math.max(0, length - text.length)) +
        ' ' +
        chalk[LOG_LINE_PREFIX_COLOR](block[1])
    )
  );
  info(chalk[LOG_LINE_PREFIX_COLOR](bottom));
}

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
  const length = separatorLength || _t('APP_NAME').length + LOG_LINE_PREFIX_CHARS.length;
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
  serverMsg(chalk.whiteBright.bold(_t('APP_NAME')));
  serverMsg(chalk.gray(_t('VERSION') + ' ' + pkg.version));
  hrSeparator();
}

/**
 * Logs decorated message with information about server restart.
 */
function serverRestart() {
  hrSeparator();
  serverMsg(chalk.whiteBright.bold(_t('RECONFIGURING_SM_SERVER')));
}

/**
 * Logs decorated message with information about port which application is listen on.
 * @param {Object} serverOptions API Mockup Server options
 */
function serverListen({ port }) {
  emphasize(NEW_LINE + _t('SERVER_LISTENING_AT'));
  notice(LEFT_PAD + port);
}

/**
 * Logs decorated message with information about proxy server.
 * @param {string} target Proxy server address
 */
function proxyTarget(target) {
  emphasize(NEW_LINE + _t('PROXY_TARGET'));
  notice(LEFT_PAD + target);
}

function serverConfig(prefix, target, port) {
  emphasize(NEW_LINE + _t('CONFIGURATION'));
  notice(LEFT_PAD + chalk.white(_t('GLOBAL_PREFIX')) + ' ' + prefix);
  notice(LEFT_PAD + chalk.white(_t('PROXY_TARGET')) + '  ' + target);
  notice(LEFT_PAD + chalk.white(_t('SERVER_PORT')) + '   ' + port);
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

  if (!isEmptyObject(req.body)) {
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
 * Renders a colorized list of routes with inline badges.
 *
 * For each route a single line is printed using warn():
 * - '&' badge marks a route with an interceptor.
 * - '*' badge marks a conditionally mocked route (applyIf provided).
 * If any badge is used, a legend note is emitted via debug() at the end.
 * Fields are colorized: method (greenBright), status (<400 whiteBright, otherwise redBright),
 * key (yellowBright, '-' if absent), path (whiteBright).
 *
 * @param {Array} routesDisplayList Route definitions to display.
 * @returns {void}
 */
function routesList(routesDisplayList) {
  let note = false;

  routesDisplayList.forEach((route) => {
    const { applyIf, method, status, key, path, interceptor } = route;

    let hasApplyIf = typeof applyIf === 'function';

    if ((hasApplyIf || interceptor) && !note) {
      note = true;
    }

    const c = {
      method: chalk.greenBright(method.toUpperCase()),
      status: status < 400 ? chalk.whiteBright(status) : chalk.redBright(status),
      key: chalk.yellowBright(key || '-'),
      path: chalk.whiteBright(path),
    };

    const badges = `${interceptor ? '&' : ' '}${hasApplyIf ? '*' : ' '}`;
    warn(`${badges} ${c.method} ${c.status} ${c.key} ${c.path}`);
  });

  note && debug(LEFT_PAD + _t('ROUTES_MARKED_WITH_ASTERISK'));
}

/**
 * Prints a formatted "SHORTCUTS" help section to the CLI.
 *
 * Given a list of shortcut definitions, this function renders each shortcut
 * as a line containing the key and its description (resolved by invoking the
 * provided text function), and writes the result to the console with emphasis
 * and colorized keys.
 * @param {Array<{ key: string, text: () => string }>} shortcutDefs
 *  List of shortcut definitions where:
 *  - key: the keyboard shortcut identifier to display.
 *  - text: a function returning the human-readable description for the shortcut.
 * @returns {void}
 */
function cliHelp(shortcutDefs) {
  emphasize(NEW_LINE + _t('SHORTCUTS'));
  notice(
    shortcutDefs.reduce(
      (acc, { key, text }) => acc + LEFT_PAD + chalk.whiteBright(key) + ': ' + text(),
      ''
    ) + NEW_LINE
  );
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
 * Logs the start of an error for a given key.
 * @param {string} key - The route definition identifier.
 * @param {string} fnName - The name of the function where the error occurred.
 */
function fnErrorStart(key, fnName) {
  error(LOG_LINE_PREFIX_CHARS + _t('FN_ERROR_START', { key, fnName }));
}

/**
 * Logs an error message indicating the end of a function execution with the specified key.
 * @param {string} key - The route definition identifier.
 * @param {string} fnName - The name of the function where the error occurred.
 */
function fnErrorEnd(key, fnName) {
  error(LOG_LINE_PREFIX_CHARS + _t('FN_ERROR_END', { key, fnName }));
}

/**
 * Determines whether a message should be suppressed based on configured prefixes.
 *
 * Evaluates if the provided message begins with any prefix listed in the
 * HPM_SUPPRESSED_MSGS collection.
 *
 * @param {string} msg - The message to check for suppression.
 * @returns {boolean} True if the message starts with a suppressed prefix; otherwise, false.
 */
function isSuppressedMsg(msg) {
  return HPM_SUPPRESSED_MSGS.some((suppressedMsg) => msg.startsWith(suppressedMsg));
}

/**
 * Creates a logging provider that suppresses certain messages and standardizes
 * others before delegating to the underlying logger functions.
 *
 * Behavior:
 * - If isSuppressedMsg(msg) is true, the message is ignored.
 * - Otherwise, the message is transformed via standardizeHPMMessage(msg) and
 *   forwarded to the corresponding logger (error, warn, info, debug).
 * - log is an alias of debug.
 *
 * @typedef {Object} LogProvider
 * @property {(msg:unknown) => unknown} error Logs an error-level message after processing.
 * @property {(msg:unknown) => unknown} warn Logs a warning-level message after processing.
 * @property {(msg:unknown) => unknown} info Logs an info-level message after processing.
 * @property {(msg:unknown) => unknown} debug Logs a debug-level message after processing.
 * @property {(msg:unknown) => unknown} log Alias of debug; logs a debug-level message after processing.
 *
 * @returns {LogProvider} A provider exposing level-specific logging methods with suppression and standardization.
 */
function provider() {
  return {
    error: (msg) => {
      if (isSuppressedMsg(msg)) return;
      return error(standardizeHPMMessage(msg));
    },
    warn: (msg) => {
      if (isSuppressedMsg(msg)) return;
      return warn(standardizeHPMMessage(msg));
    },
    info: (msg) => {
      if (isSuppressedMsg(msg)) return;
      return info(standardizeHPMMessage(msg));
    },
    debug: (msg) => {
      if (isSuppressedMsg(msg)) return;
      return debug(standardizeHPMMessage(msg));
    },
    log: (msg) => {
      if (isSuppressedMsg(msg)) return;
      return debug(standardizeHPMMessage(msg));
    },
  };
}

module.exports = {
  error,
  warn,
  notice,
  emphasize,
  info,
  debug,
  appStart,
  buildFrame,
  hrSeparator,
  serverMsg,
  serverListen,
  serverStart,
  serverRestart,
  proxyTarget,
  routeCall,
  callbackRoute,
  callbackProxy,
  routesList,
  serverConfig,
  cliHelp,
  provider,
  fnErrorStart,
  fnErrorEnd,
};
