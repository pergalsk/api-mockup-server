let state = {
  target: null,
  suspended: null,
  isRestart: false,
};

function setState(partial) {
  Object.assign(state, partial);
}

function getState() {
  return state;
}

module.exports = {
  setState,
  getState,
};
