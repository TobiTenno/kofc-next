#!/usr/bin/env node
/**
 * E2E pipeline: example council fixtures → build → seed test member → Cypress.
 * Defaults match CI; override via env (BETTER_AUTH_SECRET, etc.).
 *
 * Usage:
 *   node scripts/run-e2e.mjs              # full CI-style run
 *   node scripts/run-e2e.mjs --open         # interactive Cypress (skips CI=true)
 *   node scripts/run-e2e.mjs --build-only   # fixtures + production build only
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const openMode = args.has('--open');
const buildOnly = args.has('--build-only');

const fixtureCopies = [
  ['src/data/council.json.example', 'src/data/council.json'],
  ['src/data/council.csv.example', 'src/data/council.csv'],
];

const TEST_MEMBER_NUMBER = '0000000';
const TEST_MEMBER_PASSWORD = 'cypress-ci-password';

const e2eEnv = {
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    'ci-build-secret-minimum-32-characters-long',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://127.0.0.1:3000',
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000',
  DATABASE_PATH: process.env.DATABASE_PATH ?? './data/app.db',
  ...(openMode ? {} : { CI: process.env.CI ?? 'true' }),
};

const run = (command, commandArgs, label) => {
  console.log(`\n> ${label ?? [command, ...commandArgs].join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...e2eEnv },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const prepareFixtures = () => {
  for (const [from, to] of fixtureCopies) {
    fs.copyFileSync(path.join(root, from), path.join(root, to));
  }
  console.log('E2E fixtures: council.json + council.csv from *.example');
};

prepareFixtures();

run('node', ['scripts/check-node-version.mjs'], 'check Node version');
run('npm', ['run', 'build'], 'production build');

if (buildOnly) {
  process.exit(0);
}

run(
  'npx',
  [
    'tsx',
    'scripts/seed-member-password.ts',
    TEST_MEMBER_NUMBER,
    TEST_MEMBER_PASSWORD,
    '--reset',
  ],
  `seed member ${TEST_MEMBER_NUMBER}`,
);

if (openMode) {
  run('npx', ['cypress', 'open'], 'Cypress open');
} else {
  run('npx', ['cypress', 'run'], 'Cypress run');
}
