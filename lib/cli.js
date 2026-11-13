import select from '@inquirer/select';
import readline from 'node:readline';

import { getProxyTargets, getProxyTargetText } from './proxy.js';
import { getState } from './store.js';
import * as defaultOptions from './definitions.js';
import * as log from './log.js';
import _t from './texts.js';
import { NEW_LINE, LEFT_PAD } from './constants.js';

const shortcutDefs = [
  { key: 'r', text: () => _t('LABEL_ROUTES'), exit: false, action: routesAction },
  { key: 'c', text: () => _t('LABEL_CONFIG'), exit: false, action: configAction },
  {
    key: 's',
    text: () => (getState().suspended === 'TURNING_ON' ? _t('LABEL_RESUME') : _t('LABEL_SUSPEND')),
    exit: false,
    action: suspendAction,
  },
  { key: 'q', text: () => _t('LABEL_QUIT'), exit: true, action: quitAction },
];

const EXIT_CHOICE = Symbol('exit');

/**
 * Method fetches proxy target from server options.
 * If there is multiple targets, when the server starts it runs CLI
 * for getting choice from user.
 * @async
 * @param {Object} proxy API Mockup Server proxy options
 * @param {boolean} [interactive=true] `false` = no prompt, first target is used
 * @returns {string} proxy target (proxy server URL)
 * @throws {Error} with code `PROMPT_EXIT` when user chooses Exit or presses Ctrl+C
 */
async function getProxyTarget(proxy, interactive = true) {
  const targets = getProxyTargets(proxy, true);

  if (targets.length === 0) {
    return null;
  }

  if (targets.length === 1 || !interactive) {
    return targets[0].url;
  }

  const choices = [
    {
      name: _t('WITHOUT_PROXY'),
      value: null,
    },
    ...targets.map(({ label, url }) => ({
      name: label,
      value: url,
    })),
    {
      name: _t('EXIT'),
      value: EXIT_CHOICE,
    },
  ];

  // get value from interactive CLI (prompt is cleared after the choice)
  let target;
  try {
    target = await select({ ...defaultOptions.prompt.proxy, choices }, { clearPromptOnDone: true });
  } catch (e) {
    // Ctrl+C
    if (e.name !== 'ExitPromptError') {
      throw e;
    }
    target = EXIT_CHOICE;
  }

  if (target === EXIT_CHOICE) {
    throw Object.assign(new Error(_t('EXIT')), { code: 'PROMPT_EXIT' });
  }

  return target;
}

function routesAction({ routesDisplayList }) {
  log.emphasize(NEW_LINE + _t('ROUTES_LIST'));

  const isSuspended = getState().suspended === 'TURNING_ON';

  if (routesDisplayList.length === 0) {
    log.warn(LEFT_PAD + _t('NO_ROUTES_DEFINED'));
    return;
  }

  if (isSuspended) {
    log.warn(LEFT_PAD + _t('SUSPENDED_LIST'));
  }

  log.routesList(routesDisplayList, isSuspended);
}

function suspendAction({ callbacks }) {
  if (callbacks && typeof callbacks.suspend === 'function') {
    callbacks.suspend();
  }
}

function configAction({ serverOptions }) {
  const { port, prefix } = serverOptions;
  const targetText = getProxyTargetText(serverOptions);
  log.serverConfig(prefix, targetText, port);
}

function quitAction() {
  log.info(''); // just empty line
}

/**
 * Keyboard shortcuts are used only with `interactive` option and attached TTY.
 * @param {Object} serverOptions API Mockup Server options
 * @returns {boolean}
 */
function hasShortcuts(serverOptions) {
  return serverOptions.interactive !== false && Boolean(process.stdin && process.stdin.isTTY);
}

/**
 * Initializes keyboard shortcuts for the CLI.
 * @param {Function} getParamsFn - Function to retrieve parameters for shortcut actions.
 * @param {Function} onQuit - Called on quit shortcut.
 * @returns {Function} cleanup function which removes the shortcuts
 */
function shortcuts(getParamsFn, onQuit) {
  let listening = false;
  let rawWasEnabled = false;

  function onKeypress(_, keyEvent) {
    if (!keyEvent) {
      return;
    }

    // ctrl+c in raw mode doesn't send SIGINT, so send it (default: process ends)
    if (keyEvent.ctrl && keyEvent.name === 'c') {
      cleanup();
      process.kill(process.pid, 'SIGINT');
      return;
    }

    const key = String(keyEvent.sequence || keyEvent.name || '').toLowerCase();

    if (!key) {
      return;
    }

    const { action, exit } = shortcutDefs.find((shortcutDef) => shortcutDef.key === key) || {};

    if (typeof action === 'function' && typeof getParamsFn === 'function') {
      action(getParamsFn());
      if (exit) {
        cleanup();
        onQuit();
      }
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

    readline.emitKeypressEvents(process.stdin);

    try {
      rawWasEnabled = Boolean(process.stdin.isRaw);
      if (typeof process.stdin.setRawMode === 'function') {
        process.stdin.setRawMode(true);
      }
    } catch (_) {
      // ignore
    }

    process.stdin.ref?.(); // could be unref-ed by previous server
    process.stdin.resume();
    process.stdin.on('keypress', onKeypress);
    process.once('exit', cleanup);

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

    // let the process end when nothing else runs (pause alone is not enough)
    process.stdin.pause();
    process.stdin.unref?.();
    process.off('exit', cleanup);

    listening = false;
  }

  setup();

  return cleanup;
}

/**
 * Prints the CLI help text showing available shortcuts.
 */
function printCliHelp() {
  log.cliHelp(shortcutDefs);
}

export {
  hasShortcuts,
  shortcuts,
  printCliHelp,
  getProxyTarget,
};
