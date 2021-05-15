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

const get = () => [...availableMethods];

const list = (separator) => availableMethods.join(separator || ', ');

const valid = (method) => availableMethods.indexOf(method.toUpperCase()) !== -1;

module.exports = {
  get,
  list,
  valid,
};
