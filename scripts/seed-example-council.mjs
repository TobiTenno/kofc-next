#!/usr/bin/env node
/**
 * Copy example council fixtures (if missing) and seed the demo member login.
 *
 * Demo member: 1001001 / password (webmaster + all permissions in council.json.example).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, 'src/data');

const EXAMPLE_MEMBER_NUMBER = '1001001';
const EXAMPLE_MEMBER_PASSWORD = 'password';

const copyIfMissing = (exampleName, targetName) => {
  const examplePath = path.join(dataDir, exampleName);
  const targetPath = path.join(dataDir, targetName);

  if (!fs.existsSync(examplePath)) {
    throw new Error(`Missing ${examplePath}`);
  }

  if (fs.existsSync(targetPath)) {
    console.log(`> keep existing ${targetName}`);
    return;
  }

  fs.copyFileSync(examplePath, targetPath);
  console.log(`> copied ${exampleName} → ${targetName}`);
};

const run = (command, commandArgs, label) => {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

copyIfMissing('council.json.example', 'council.json');
copyIfMissing('council.csv.example', 'council.csv');

run('node', ['scripts/check-node-version.mjs'], 'check Node version');
run(
  'npx',
  [
    'tsx',
    'scripts/seed-member-password.ts',
    EXAMPLE_MEMBER_NUMBER,
    EXAMPLE_MEMBER_PASSWORD,
    '--reset',
  ],
  `seed member ${EXAMPLE_MEMBER_NUMBER}`,
);

console.log(
  `\nExample council ready. Sign in at /members/login with ${EXAMPLE_MEMBER_NUMBER} / ${EXAMPLE_MEMBER_PASSWORD}`,
);
