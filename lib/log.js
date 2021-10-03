const formatDate = require('date-fns/format');
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

const error = coloredLog('red');
const warn = coloredLog('yellow');
const info = coloredLog('white');
const debug = coloredLog('gray');

function prefix(chalkColor = LOG_LINE_PREFIX_COLOR) {
  return chalk[chalkColor](LOG_LINE_PREFIX_CHARS);
}

function hrSeparator(separatorLength) {
  const length = separatorLength || _t('STARTING_SM_SERVER').length + LOG_LINE_PREFIX_CHARS.length;
  info(chalk[LOG_LINE_PREFIX_COLOR](LOG_LINE_MARK_CHAR.repeat(length)));
}

function serverMsg(text, chalkColor = LOG_LINE_PREFIX_COLOR) {
  info(prefix(chalkColor) + text);
}

function serverStart() {
  hrSeparator();
  serverMsg(chalk.whiteBright.bold(_t('STARTING_SM_SERVER')));
  hrSeparator();
}

function serverListen(serverOptions, routesList) {
  const { port, proxy } = serverOptions;

  hrSeparator();
  info(prefix() + _t('SERVER_LISTENING_AT') + chalk.greenBright(port));
  serverMsg(_t('HANDLED_ROUTES'));

  // if (Array.isArray(routesList) && routesList.length === 0) {
  // debug(_t('NO_ROUTES_DEFINED'));
  // }
}

function proxyTarget(target) {
  serverMsg(chalk.whiteBright.bold(_t('PROXY_TARGET')) + ' ' + chalk.cyan(target));
}

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

function standardizeHPMMessage(msg) {
  return LOG_LINE_PREFIX_CHARS + _t('PROXY_LABEL') + msg.replace(HPM_PREFIX, '');
}

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
  routesList,
  provider,
};
