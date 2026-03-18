const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const projectRoot = process.cwd();
const engineDir = path.join(projectRoot, 'lib', 'engine');
const TEST_EXIT_SENTINEL = '__ENGINE_TEST_EXIT__';

function registerTypeScriptHook() {
  const compile = (filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    return ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        strict: true,
        jsx: ts.JsxEmit.React,
      },
      fileName: filename,
    }).outputText;
  };

  require.extensions['.ts'] = (module, filename) => {
    const js = compile(filename);
    module._compile(js, filename);
  };

  require.extensions['.tsx'] = (module, filename) => {
    const js = compile(filename);
    module._compile(js, filename);
  };
}

function runSingleTest(fullPath) {
  const originalExit = process.exit;
  let exitCode = 0;

  process.exit = (code = 0) => {
    exitCode = Number(code) || 0;
    throw new Error(TEST_EXIT_SENTINEL);
  };

  try {
    delete require.cache[require.resolve(fullPath)];
    require(fullPath);
  } catch (error) {
    if (!(error instanceof Error && error.message === TEST_EXIT_SENTINEL)) {
      throw error;
    }
  } finally {
    process.exit = originalExit;
  }

  return exitCode;
}

function run() {
  if (!fs.existsSync(engineDir)) {
    throw new Error(`Engine directory not found: ${engineDir}`);
  }

  registerTypeScriptHook();

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
