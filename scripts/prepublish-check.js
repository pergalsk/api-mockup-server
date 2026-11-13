// Checks before `npm publish`: clean git, `main` branch, version not published yet.
import { execSync } from 'node:child_process';

import pkg from '../package.json' with { type: 'json' };

const run = (command) => execSync(command, { encoding: 'utf8' }).trim();

const errors = [];

if (run('git status --porcelain')) {
  errors.push('Git working tree is not clean.');
}

const branch = run('git branch --show-current');
if (branch !== 'main') {
  errors.push(`Current branch is "${branch}", not "main".`);
}

// npm returns a string (not an array) when there is only one version
const versions = [].concat(JSON.parse(run(`npm view ${pkg.name} versions --json`)));
if (versions.includes(pkg.version)) {
  errors.push(`Version ${pkg.version} is already published on npm.`);
}

if (errors.length) {
  console.error(`Publish stopped:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
