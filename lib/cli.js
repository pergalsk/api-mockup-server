const readline = require('readline');

const log = require('./log');
const _t = require('./texts');

const shortcutDefs = [
  { key: 'q', text: _t('LABEL_QUIT'), exit: true, action: quitAction },
  { key: 'r', text: _t('LABEL_ROUTES'), exit: false, action: routesAction },
  { key: 't', text: _t('LABEL_TARGET'), exit: false, action: targetAction },
  { key: 'p', text: _t('LABEL_PORT'), exit: false, action: portAction },
  { key: 'f', text: _t('LABEL_PREFIX'), exit: false, action: prefixAction },
];

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
    printHelp();
  }

  function printHelp() {
    console.log('\nShortcuts:');
    console.log(shortcutDefs.reduce((acc, { key, text }) => acc + `   ${key}: ${text}`, '') + '\n');
  }

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

    printHelp();
  }

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

module.exports = { shortcuts };
