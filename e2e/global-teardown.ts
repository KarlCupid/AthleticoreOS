import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

type ExpoWebServerState = {
  token?: string | null;
  wrapperPid?: number | null;
  expoPid?: number | null;
};

const statePath = path.resolve(__dirname, '..', '.e2e', 'expo-web-server.json');
const shutdownPath = path.resolve(__dirname, '..', '.e2e', 'expo-web-server.shutdown');

function readState(): ExpoWebServerState | null {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as ExpoWebServerState;
  } catch {
    return null;
  }
}

function removeStateFile() {
  for (const file of [statePath, shutdownPath]) {
    try {
      fs.unlinkSync(file);
    } catch {
      // Nothing to clean up.
    }
  }
}

function isProcessRunning(pid: number | null | undefined) {
  if (!Number.isInteger(pid) || !pid || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForWrapperExit(pid: number | null | undefined) {
  const deadline = Date.now() + 8_000;
  while (isProcessRunning(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return !isProcessRunning(pid);
}

function killProcessTree(pid: number | null | undefined) {
  if (!Number.isInteger(pid) || !pid || pid <= 0 || pid === process.pid) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      return;
    }
  }
}

export default async function globalTeardown() {
  const state = readState();
  const expectedToken = process.env.E2E_WEBSERVER_TOKEN;

  if (!state || !expectedToken || state.token !== expectedToken) {
    return;
  }

  try {
    fs.writeFileSync(shutdownPath, expectedToken);
  } catch {
    // Fall back to forceful cleanup below.
  }

  const wrapperExited = await waitForWrapperExit(state.wrapperPid);

  if (!wrapperExited) {
    killProcessTree(state.expoPid);
    killProcessTree(state.wrapperPid);
  }

  removeStateFile();
}
