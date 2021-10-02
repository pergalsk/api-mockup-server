/**
 * Methods module. Available HTTP methods list with couple of functions operating on that list.
 * @module methods
 */

/**
 * Available HTTP methods list
 * @type {Array<string>}
 */
const availableMethods = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'HEAD',
  'CONNECT',
  'OPTIONS',
  'TRACE',
  'PATCH',
];

/**
 * Returns available HTTP methods list as an array.
 * @returns {Array} Available HTTP methods
 */
const get = () => [...availableMethods];

/**
 * Returns available HTTP methods list as a string concatenated with a separator.
 * @param {string} separator String separator for concatenating HTTP methods list
 * @returns {string} Available HTTP methods list as a string concatenated with separator
 */
const list = (separator) => availableMethods.join(separator || ', ');

/**
 * Checks given HTTP method if it's valid. That means if it's in available HTTP methods list.
 * @param {string} method HTTP method to check
 * @returns {boolean}
 */
const valid = (method) => availableMethods.indexOf(method.toUpperCase()) !== -1;

module.exports = {
  get,
  list,
  valid,
};
