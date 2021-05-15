const chalk = require('chalk');
const _t = require('./texts');

const error = coloredLog('red');
const warning = coloredLog('yellow');
const log = coloredLog('white');
const info = coloredLog('gray');

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

function serverListen(port, routesList) {
  console.log(
    chalk.green('*** ') + _t('SERVER_LISTENING_AT') + chalk.green(`http://localhost:${port}`)
  );
  log(chalk.green('*** ') + _t('HANDLED_ROUTES'));

  if (Array.isArray(routesList) && routesList.length === 0) {
    info(_t('NO_ROUTES_DEFINED'));
  }
}

module.exports = {
  error,
  warning,
  log,
  info,
  serverListen,
};
