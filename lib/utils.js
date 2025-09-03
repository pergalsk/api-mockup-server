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

/**
 * Formats a Date object according to a simple format string.
 * Supported tokens: HH, mm, ss, SSS
 * @param {Date} date Date object to format
 * @param {string} format Format string (e.g. 'HH:mm:ss.SSS')
 * @returns {string} Formatted date string
 */
function formatDate(date, format) {
  return format
    .replace('HH', pad(date.getHours(), 2))
    .replace('mm', pad(date.getMinutes(), 2))
    .replace('ss', pad(date.getSeconds(), 2))
    .replace('SSS', pad(date.getMilliseconds(), 3));
}

/**
 * Pads a number with leading zeros until it reaches the specified size.
 * @param {number|string} num - The number or string to pad.
 * @param {number} size - The desired length of the output string.
 * @returns {string} The padded string.
 */
function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

module.exports = {
  calculateHRTime,
  getPathname,
  getRandomInt,
  isEmptyObject,
  isString,
  isFunction,
  formatDate,
  pad,
};
