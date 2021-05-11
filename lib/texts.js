const texts = require('../txt/texts.json');

function _t(key, replacements) {
  if (typeof key !== 'string' || !texts[key]) {
    return '';
  }

  if (typeof texts[key] === 'string') {
    return replaceAll(texts[key], replacements);
  }

  if (Array.isArray(texts[key])) {
    let result = [];
    texts[key].forEach((item) => {
      result = [...result, replaceAll(item, replacements)];
    });
    return result.length === 0 ? '' : result;
  }

  return '';
}

function replaceAll(str, replacements) {
  let replKeys = null;
  let result = str;

  if (typeof replacements === 'object') {
    replKeys = Object.keys(replacements);
  }

  replKeys &&
    replKeys.forEach((replKey) => {
      const replacer = new RegExp(`%${replKey}%`, 'g');
      result = result.replace(replacer, replacements[replKey]);
    });

  return result;
}

module.exports = _t;
