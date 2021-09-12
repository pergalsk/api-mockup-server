const formatDate = require('date-fns/format');
const chalk = require('chalk');
const utils = require('./utils');
const _t = require('./texts');

const { LOG_LINE_PREFIX_CHARS, LOG_LINE_PREFIX_COLOR } = require('./constants');

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

function prefix(chalkColor = LOG_LINE_PREFIX_COLOR) {
  return chalk[chalkColor](LOG_LINE_PREFIX_CHARS);
}

function serverMsg(text, chalkColor = LOG_LINE_PREFIX_COLOR) {
  log(prefix(chalkColor) + text);
}

function serverStart() {
  serverMsg(_t('STARTING_SM_SERVER'));
}

function serverListen(port, routesList) {
  log(
    prefix() + _t('SERVER_LISTENING_AT') + chalk[LOG_LINE_PREFIX_COLOR](`http://localhost:${port}`) // TODO: real server
  );

  serverMsg(_t('HANDLED_ROUTES'));

  // if (Array.isArray(routesList) && routesList.length === 0) {
  // info(_t('NO_ROUTES_DEFINED'));
  // }
}

function routeCall(req, method, status, key, time, isEmptyData) {
  const c = {
    dateTime: chalk.gray('[' + formatDate(new Date(), 'HH:mm:ss.SSS') + ']'),
    method: chalk.green(method.toUpperCase()),
    status: status < 400 ? status : chalk.red(status),
    key: chalk.yellow(key || '-'),
    path: req.originalUrl,
    time: chalk.gray(time + 'ms'),
    emptyData: isEmptyData ? chalk.gray(' (empty response)') : '',
  };

  log(`${c.dateTime} ${c.method} ${c.status} ${c.key} ${c.path} ${c.time}` + c.emptyData);

  if (!utils.isEmptyObject(req.body)) {
    // todo: FIX
    info('>>> ' + JSON.stringify(req.body));
  }
}

const error = coloredLog('red');
const warning = coloredLog('yellow');
const log = coloredLog('white');
const info = coloredLog('gray');

module.exports = {
  error,
  warning,
  log,
  info,
  serverMsg,
  serverListen,
  serverStart,
  routeCall,
};
