#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const expoCli = path.join(repoRoot, 'node_modules', 'expo', 'bin', 'cli');
const stateDir = path.join(repoRoot, '.e2e');
const statePath = path.join(stateDir, 'expo-web-server.json');
const shutdownPath = path.join(stateDir, 'expo-web-server.shutdown');
const serverToken = process.env.E2E_WEBSERVER_TOKEN ?? null;

function readPort() {
  const args = process.argv.slice(2);
  const portFlagIndex = args.indexOf('--port');
  if (portFlagIndex >= 0 && args[portFlagIndex + 1]) {
    return args[portFlagIndex + 1];
  }
  return process.env.E2E_WEB_PORT || '8081';
}

const port = readPort();
const child = spawn(
  process.execPath,
  [expoCli, 'start', '--web', '--offline', '--port', port],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      BROWSER: 'none',
      CI: '1',
      EXPO_NO_TELEMETRY: '1',
    },
  },
);

let shuttingDown = false;

function writeState() {
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      statePath,
      JSON.stringify(
        {
          token: process.env.E2E_WEBSERVER_TOKEN ?? null,
          wrapperPid: process.pid,
          expoPid: child.pid ?? null,
          port,
          startedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } catch {
    // The server can still run without the pid file; teardown will fall back to Playwright.
  }
}

writeState();

function removeStateFiles() {
  for (const file of [statePath, shutdownPath]) {
    try {
      fs.unlinkSync(file);
    } catch {
      // The file may already be gone.
    }
  }
}

const shutdownPoll = setInterval(() => {
  if (!serverToken) {
    return;
  }

  try {
    const requestedToken = fs.readFileSync(shutdownPath, 'utf8').trim();
    if (requestedToken === serverToken) {
      stopChildTree();
    }
  } catch {
    // No shutdown requested yet.
  }
}, 250);

shutdownPoll.unref();

function exitAfterChildCleanup() {
  const timer = setTimeout(() => {
    process.exit(0);
  }, 2_000);
  timer.unref();
}

function stopChildTree() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  clearInterval(shutdownPoll);
  removeStateFiles();

  if (!child.pid) {
    process.exit(0);
    return;
  }

  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
    });
    killer.on('exit', () => process.exit(0));
    exitAfterChildCleanup();
    return;
  }

  child.kill('SIGTERM');
  exitAfterChildCleanup();
}

process.on('SIGINT', stopChildTree);
process.on('SIGTERM', stopChildTree);
process.on('SIGHUP', stopChildTree);

child.on('exit', (code, signal) => {
  if (shuttingDown) {
    return;
  }
  clearInterval(shutdownPoll);
  removeStateFiles();
  if (signal) {
    process.exit(1);
    return;
  }
  process.exit(code ?? 0);
});
