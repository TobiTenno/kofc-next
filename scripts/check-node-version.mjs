import { readFileSync } from 'node:fs';

const nvmrc = readFileSync('.nvmrc', 'utf8').trim();
const expectedMajor = 24;
const major = Number(process.version.slice(1).split('.')[0]);

if (major !== expectedMajor) {
  console.error(
    `Wrong Node: ${process.version} (modules ABI ${process.versions.modules}).`,
  );
  console.error(
    `Project expects Node ${expectedMajor} (.nvmrc: ${nvmrc}). Native addons like better-sqlite3 break across versions.`,
  );
  console.error('');
  console.error('  nvm use');
  console.error('  npm run rebuild:native');
  process.exit(1);
}
