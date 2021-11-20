/**
 * Utils module. Various useful functions.
 * @module utils
 */

/**
 * Formats HRTime end time in milliseconds.
 * @param {array} endTime Nodejs HRTime end time
 * @returns {string}
 */
function calculateHRTime(endTime) {
  return parseFloat((endTime[0] * 1e9 + endTime[1]) / 1e6).toFixed(0);
}

/**
 * Removes query string and hash part from path string and returns only pathname.
 * @param {string} path Path with query string and hash part.
 * @returns {string} Pathname without query string and hash part.
 */
function getPathname(path) {
  const index = path.indexOf('?');
  return index < 0 ? path : path.substr(0, index);
}

/**
 * Generates random number from interval.
 * Note: The maximum is exclusive and the minimum is inclusive.
 * @param {number} min Bottom value of interval
 * @param {number} max Top value of interval
 * @returns {number} Random number value form interval.
 */
function getRandomInt(min, max) {
  const ceilMin = Math.ceil(min);
  const floorMax = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (floorMax - ceilMin) + ceilMin);
}

/**
 * Checks if param is empty object.
 * @param {*} param
 * @returns {boolean} `true` if param is empty object
 */
function isEmptyObject(param) {
  if (!param) {
    return true;
  }
  return Object.keys(param).length === 0 && param.constructor === Object;
}

/**
 * Checks if param type is a string.
 * @param {*} param Param to check
 * @returns {boolean} `true` if param type is a string.
 */
function isString(param) {
  return typeof param === 'string';
}

/**
 * Checks if param type is a function.
 * @param {*} param Param to check
 * @returns {boolean} `true` if param type is a function.
 */
function isFunction(param) {
  return typeof param === 'function';
}

module.exports = {
  calculateHRTime,
  getPathname,
  getRandomInt,
  isEmptyObject,
  isString,
  isFunction,
};
