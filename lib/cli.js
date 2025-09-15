const inquirer = require('inquirer');
const readline = require('readline');

const defaultOptions = require('./definitions');
const log = require('./log');
const _t = require('./texts');

const shortcutDefs = [
  { key: 'q', text: _t('LABEL_QUIT'), exit: true, action: quitAction },
  { key: 'r', text: _t('LABEL_ROUTES'), exit: false, action: routesAction },
  { key: 't', text: _t('LABEL_TARGET'), exit: false, action: targetAction },
  { key: 'p', text: _t('LABEL_PORT'), exit: false, action: portAction },
  { key: 'f', text: _t('LABEL_PREFIX'), exit: false, action: prefixAction },
];

/**
 * Method fetches proxy target from server options.
 * If there is multiple targets, when the server starts it runs CLI
 * for getting choice from user.
 * @async
 * @param {string|Array<string>} proxy API Mockup Server proxy options
 * @returns {string} proxy target (proxy server URL)
 */
async function getProxyTarget(proxy) {
  if (!proxy || !proxy.server) {
    return null;
  }

  if (typeof proxy.server === 'string') {
    return proxy.server;
  }

  if (!Array.isArray(proxy.server)) {
    return null;
  }

  if (proxy.server.length === 0) {
    return null;
  }

  if (proxy.server.length === 1) {
    return proxy.server[0];
  }

  const choices = [
    {
      name: _t('WITHOUT_PROXY'),
      value: null,
    },
    ...proxy.server.map((item) => ({
      name: item,
      value: item,
    })),
    // todo: exit choice
    // {
    //   name: _t('EXIT'),
    //   value: -1,
    // },
  ];

  // get value from interactive CLI
  const prompt = await inquirer.prompt([{ ...defaultOptions.prompt.proxy, choices }]);

  return prompt.target;
}

function quitAction() {
  log.info(''); // just empty line
}

function routesAction({ routesDisplayList }) {
  log.info(_t('ROUTES_LIST'));
  log.routesList(routesDisplayList);
}

function portAction({ serverOptions }) {
  log.info(_t('SERVER_PORT'));
  log.notice(`   ${serverOptions.port}`);
}

function prefixAction({ serverOptions }) {
  log.info(_t('GLOBAL_PREFIX'));
  log.notice(`   ${serverOptions.prefix}`);
}

function targetAction({ target, serverOptions }) {
  log.info(_t('PROXY_TARGET'));
  if (target) {
    log.notice(`   ${target}`);
    return;
  }
  const { proxy } = serverOptions;
  if (
    proxy &&
    ((Array.isArray(proxy.server) && proxy.server.length) || typeof proxy.server === 'string')
  ) {
    log.notice(`   ${_t('WITHOUT_PROXY')}`);
  } else {
    log.notice(`   ${_t('PROXY_NOT_CONFIGURED')}`);
  }
}

/**
 * Initializes keyboard shortcuts for the CLI.
 * @param {Function} getParamsFn - Function to retrieve parameters for shortcut actions.
 */
function shortcuts(getParamsFn) {
  const isTty = Boolean(process.stdin && process.stdin.isTTY);

  let listening = false;
  let rawWasEnabled = false;

  function onKeypress(_, keyEvent) {
    if (!keyEvent) {
      return;
    }

    // ctrl+c exits
    if (keyEvent.ctrl && keyEvent.name === 'c') {
      cleanupAndExit();
      return;
    }

    const key = String(keyEvent.sequence || keyEvent.name || '').toLowerCase();

    if (!key) {
      return;
    }

    const { action, exit } = shortcutDefs.find((shortcutDef) => shortcutDef.key === key) || {};

    if (typeof action === 'function' && typeof getParamsFn === 'function') {
      action(getParamsFn());
      exit && cleanupAndExit();
      return;
    }

    // for other keys show help
    printCliHelp();
  }

  /**
   * Sets up keypress listener and configures stdin for raw mode.
   */
  function setup() {
    if (listening) {
      return;
    }

    if (!isTty) {
      console.log('[info] TTY not attached — keyboard shortcuts disabled.');
      return;
    }

    readline.emitKeypressEvents(process.stdin);

    try {
      rawWasEnabled = Boolean(process.stdin.isRaw);
      if (typeof process.stdin.setRawMode === 'function') {
        process.stdin.setRawMode(true);
      }
    } catch (_) {
      // ignore
    }

    process.stdin.resume();
    process.stdin.on('keypress', onKeypress);
    process.on('beforeExit', cleanup);
    process.once('exit', cleanup);
    process.once('SIGTERM', cleanupAndExit);
    process.once('SIGHUP', cleanupAndExit);
    process.once('SIGINT', cleanupAndExit);

    listening = true;
  }

  /**
   * Cleans up keypress listener and restores stdin state.
   */
  function cleanup() {
    if (!listening) {
      return;
    }

    try {
      process.stdin.off('keypress', onKeypress);
    } catch (_) {
      try {
        process.stdin.removeListener('keypress', onKeypress);
      } catch (_) {
        // ignore
      }
    }

    try {
      if (typeof process.stdin.setRawMode === 'function') {
        process.stdin.setRawMode(rawWasEnabled);
      }
    } catch (_) {
      // ignore
    }

    listening = false;
  }

  function cleanupAndExit() {
    cleanup();
    process.exit(0);
  }

  setup();
}

/**
 * Prints the CLI help text showing available shortcuts.
 */
function printCliHelp() {
  console.log('\nShortcuts:');
  console.log(shortcutDefs.reduce((acc, { key, text }) => acc + `   ${key}: ${text}`, '') + '\n');
}

module.exports = {
  shortcuts,
  printCliHelp,
  getProxyTarget,
};
