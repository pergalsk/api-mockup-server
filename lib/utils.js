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

module.exports = {
  calculateHRTime,
  getBasePath,
  getRandomInt,
  isEmptyObject,
  isString,
};
