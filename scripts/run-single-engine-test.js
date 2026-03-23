const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function registerTypeScriptHook() {
  const compile = (filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const normalizedSource = source
      .replace(/from\s+['"]\.ts['"]/g, "from './.ts'")
      .replace(/require\((['"])\.ts\1\)/g, "require('./.ts')");

    return ts.transpileModule(normalizedSource, {
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

function main() {
  const fullPath = process.argv[2];

  if (!fullPath) {
    throw new Error('Missing engine test path.');
  }

  if (!path.isAbsolute(fullPath)) {
    throw new Error(`Engine test path must be absolute. Received: ${fullPath}`);
  }

  registerTypeScriptHook();
  require(fullPath);
}

try {
  main();
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}
