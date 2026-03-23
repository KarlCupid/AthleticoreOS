const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = process.cwd();
const engineDir = path.join(projectRoot, 'lib', 'engine');
const singleTestRunner = path.join(projectRoot, 'scripts', 'run-single-engine-test.js');

function runSingleTest(fullPath) {
  const result = spawnSync(process.execPath, [singleTestRunner, fullPath], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function run() {
  if (!fs.existsSync(engineDir)) {
    throw new Error(`Engine directory not found: ${engineDir}`);
  }

  const collectTestFiles = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectTestFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
        results.push(fullPath);
      }
    }

    return results;
  };

  const testFiles = collectTestFiles(engineDir).sort();

  if (testFiles.length === 0) {
    throw new Error('No engine test files found.');
  }

  for (const fullPath of testFiles) {
    const testFile = path.relative(engineDir, fullPath);
    console.log(`\nRunning ${testFile}`);
    const exitCode = runSingleTest(fullPath);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
      break;
    }
  }
}

try {
  run();
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}
