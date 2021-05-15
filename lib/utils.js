const formatDate = require('date-fns/format');
const chalk = require('chalk');

// util methods

function calculateHRTime(endTime) {
  return parseFloat((endTime[0] * 1e9 + endTime[1]) / 1e6).toFixed(0);
}

function getBasePath(path) {
  const index = path.indexOf('?');
  return index < 0 ? path : path.substr(0, index);
}

function getRandomInt(min, max) {
  const ceilMin = Math.ceil(min);
  const floorMax = Math.floor(max);
  //The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (floorMax - ceilMin) + ceilMin);
}

function isEmptyObject(param) {
  if (!param) {
    return true;
  }
  return Object.keys(param).length === 0 && param.constructor === Object;
}

function isString(param) {
  return typeof param === 'string';
}

function logRouteCall(req, method, status, key, time, isEmptyData) {
  const c = {
    dateTime: chalk.gray('[' + formatDate(new Date(), 'HH:mm:ss.SSS') + ']'),
    method: chalk.green(method.toUpperCase()),
    status: status < 400 ? status : chalk.red(status),
    key: chalk.yellow(key || '-'),
    path: req.originalUrl,
    time: chalk.gray(time + 'ms'),
    emptyData: isEmptyData ? chalk.gray(' (empty response)') : '',
  };

  console.log(`${c.dateTime} ${c.method} ${c.status} ${c.key} ${c.path} ${c.time}` + c.emptyData);

  if (!isEmptyObject(req.body)) {
    // todo: FIX
    console.log('>>> ' + chalk.gray(JSON.stringify(req.body)));
  }
}

module.exports = {
  calculateHRTime,
  getBasePath,
  getRandomInt,
  isEmptyObject,
  isString,
  logRouteCall,
};
