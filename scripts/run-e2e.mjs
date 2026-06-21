#!/usr/bin/env node
/**
 * E2E pipeline: build → migrate → seed → start server → Cypress.
 *
 * Reads council fixtures from *.example via COUNCIL_JSON_PATH / COUNCIL_CSV_PATH
 * (never copies over src/data/council.json or council.csv).
 *
 * Usage:
 *   node scripts/run-e2e.mjs              # Cypress headless
 *   node scripts/run-e2e.mjs --open       # interactive Cypress
 *   node scripts/run-e2e.mjs --build-only # production build only
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const openMode = args.has('--open');
const buildOnly = args.has('--build-only');
const baseUrl = 'http://127.0.0.1:3000';
const standaloneDir = path.join(root, '.next/standalone');

const defaultCouncilJson = path.join(root, 'src/data/council.json.example');
const defaultCouncilCsv = path.join(root, 'src/data/council.csv.example');

const TEST_MEMBER_NUMBER = '0000000';
const TEST_MEMBER_PASSWORD = 'cypress-ci-password';

const resolveDataPath = (envValue, fallback) => {
  const value = envValue?.trim() || fallback;
  return path.isAbsolute(value) ? value : path.join(root, value);
};

const councilJsonPath = resolveDataPath(
  process.env.COUNCIL_JSON_PATH,
  defaultCouncilJson,
);
const councilCsvPath = resolveDataPath(
  process.env.COUNCIL_CSV_PATH,
  defaultCouncilCsv,
);

const e2eEnv = {
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    'ci-build-secret-minimum-32-characters-long',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? baseUrl,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? baseUrl,
  DATABASE_PATH: process.env.DATABASE_PATH ?? './data/app.db',
  COUNCIL_JSON_PATH: councilJsonPath,
  COUNCIL_CSV_PATH: councilCsvPath,
  NODE_ENV: 'production',
};

/** @type {import('node:child_process').ChildProcess | null} */
let serverProcess = null;

const resolveDatabasePath = () =>
  path.resolve(
    root,
    e2eEnv.DATABASE_PATH.replace(/^\.\//, '') || 'data/app.db',
  );

const runEnv = () => ({
  ...process.env,
  ...e2eEnv,
  DATABASE_PATH: resolveDatabasePath(),
});

const run = (command, commandArgs, label) => {
  console.log(`\n> ${label ?? [command, ...commandArgs].join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    env: runEnv(),
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${label ?? command}`);
  }
};

const assertFixturePaths = () => {
  for (const [label, filePath] of [
    ['COUNCIL_JSON_PATH', councilJsonPath],
    ['COUNCIL_CSV_PATH', councilCsvPath],
  ]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`E2E ${label} not found: ${filePath}`);
    }
  }
  console.log(`E2E council JSON: ${councilJsonPath}`);
  console.log(`E2E council CSV: ${councilCsvPath}`);
};

const copyRecursive = (from, to) => {
  fs.cpSync(from, to, { recursive: true, force: true });
};

const prepareStandalone = () => {
  const serverJs = path.join(standaloneDir, 'server.js');
  if (!fs.existsSync(serverJs)) {
    throw new Error(
      'Missing .next/standalone/server.js — run production build first',
    );
  }

  copyRecursive(
    path.join(root, '.next/static'),
    path.join(standaloneDir, '.next/static'),
  );
  copyRecursive(path.join(root, 'public'), path.join(standaloneDir, 'public'));

  fs.mkdirSync(path.dirname(resolveDatabasePath()), { recursive: true });
  fs.mkdirSync(path.join(standaloneDir, 'data/cache/calendar'), {
    recursive: true,
  });
};

const ensureCypressBinary = () => {
  const check = spawnSync('npx', ['cypress', 'verify'], {
    cwd: root,
    env: runEnv(),
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (check.status === 0) {
    return;
  }

  run('npx', ['cypress', 'install'], 'install Cypress binary');

  const verify = spawnSync('npx', ['cypress', 'verify'], {
    cwd: root,
    env: runEnv(),
    stdio: 'inherit',
    encoding: 'utf8',
  });

  if (verify.status !== 0) {
    throw new Error(
      'Cypress binary missing after install — run: npx cypress install',
    );
  }
};

const pipeServerLogs = (stream) => {
  stream.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
};

const startServer = () => {
  prepareStandalone();
  console.log('\n> start production server (standalone)');

  serverProcess = spawn('node', ['server.js'], {
    cwd: standaloneDir,
    env: {
      ...runEnv(),
      PORT: '3000',
      HOSTNAME: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pipeServerLogs(serverProcess.stdout);
  pipeServerLogs(serverProcess.stderr);

  serverProcess.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`\nServer exited early (code=${code}, signal=${signal})`);
    }
  });
};

const stopServer = () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill('SIGTERM');
  }
};

const waitForServer = async (url, timeoutMs = 120_000) => {
  console.log(`> wait for ${url}`);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null) {
      throw new Error('Server process exited before becoming ready');
    }

    try {
      const response = await fetch(url);
      if (response.status < 500) {
        console.log('> server ready');
        return;
      }
    } catch {
      // retry until timeout
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  throw new Error(`Timed out waiting for ${url}`);
};

let exitCode = 0;

process.on('SIGINT', () => {
  stopServer();
  process.exit(130);
});
process.on('SIGTERM', () => {
  stopServer();
  process.exit(143);
});

try {
  assertFixturePaths();

  run('node', ['scripts/check-node-version.mjs'], 'check Node version');

  if (!buildOnly) {
    ensureCypressBinary();
  }

  run('npm', ['run', 'build'], 'production build');

  if (!buildOnly) {
    run('npm', ['run', 'db:migrate'], 'database migrate');

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

    startServer();
    await waitForServer(baseUrl);

    const cypressArgs = openMode ? ['cypress', 'open'] : ['cypress', 'run'];
    console.log(`\n> ${openMode ? 'Cypress open' : 'Cypress run'}`);

    const cypressResult = spawnSync('npx', cypressArgs, {
      cwd: root,
      stdio: 'inherit',
      env: runEnv(),
    });

    exitCode = cypressResult.status ?? 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  exitCode = 1;
} finally {
  stopServer();
}

process.exit(exitCode);
