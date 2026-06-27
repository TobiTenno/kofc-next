#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { port } = JSON.parse(
  readFileSync(path.join(root, 'config/dev-server.json'), 'utf8'),
);

const defaultOrigin = `http://localhost:${port}`;
const headerSizeFlag = '--max-http-header-size=32768';
const nodeOptions = [process.env.NODE_OPTIONS, headerSizeFlag]
  .filter(Boolean)
  .join(' ');

const env = {
  ...process.env,
  NODE_OPTIONS: nodeOptions,
  PORT: String(port),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? defaultOrigin,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? defaultOrigin,
};

console.log(`Dev server: ${defaultOrigin} (port ${port}, isolated cookie jar)`);
console.log(
  'LAN: set ALLOWED_DEV_ORIGINS and BETTER_AUTH_URL / NEXT_PUBLIC_APP_URL to http://<ip>:' +
    port,
);

const child = spawn(
  'vinext',
  ['dev', '--hostname', '0.0.0.0', '--port', String(port)],
  {
    cwd: root,
    stdio: 'inherit',
    env,
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
