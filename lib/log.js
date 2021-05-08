const chalk = require('chalk');

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

module.exports = {
  error,
  warning,
  log,
  info,
};
