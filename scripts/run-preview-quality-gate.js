const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const includeWorkoutLive = process.argv.includes('--include-workout-live');
const defaultArtifactDir = path.join(projectRoot, 'docs', 'release', 'preview-quality-gate-output');
const artifactDir = path.resolve(process.env.PREVIEW_QUALITY_ARTIFACT_DIR || defaultArtifactDir);
const reportPath = path.resolve(
  process.env.PREVIEW_READINESS_REPORT || path.join(artifactDir, 'docs', 'release', 'preview-readiness.md')
);
const statusPath = path.join(artifactDir, 'status.json');

const baseCommands = [
  { id: 'npm-ci', command: 'npm ci' },
  { id: 'npm-run-lint', command: 'npm run lint' },
  { id: 'npm-run-typecheck', command: 'npm run typecheck' },
  { id: 'npm-run-typecheck-clean', command: 'npm run typecheck:clean' },
  { id: 'npm-run-test-engine', command: 'npm run test:engine' },
  { id: 'npm-run-quality', command: 'npm run quality' },
];

const workoutLiveCommands = [
  {
    id: 'workout-live-env',
    command: [
      'node',
      '-e',
      JSON.stringify([
        "const missing=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'].filter((key)=>!process.env[key]);",
        "if(missing.length){console.error('Missing workout-programming live DB/RLS environment: '+missing.join(', '));process.exit(1);}",
        "console.log('Workout-programming live DB/RLS environment variables are present. Script guards will reject production and unguarded remote targets.');",
      ].join('')),
    ].join(' '),
  },
  { id: 'npm-run-workout-validate-content-strict', command: 'npm run workout:validate-content -- --strict' },
  { id: 'npm-run-workout-audit-content-release', command: 'npm run workout:audit-content -- --release' },
  { id: 'npm-run-test-workout-db', command: 'npm run test:workout-db' },
  { id: 'npm-run-test-rls', command: 'npm run test:rls' },
];

const commands = includeWorkoutLive ? [...baseCommands, ...workoutLiveCommands] : baseCommands;

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  return result.status === 0 ? result.stdout.trim() : null;
}

function shellInvocation(command) {
  if (process.platform === 'win32') {
    return {
      file: 'cmd.exe',
      args: ['/d', '/s', '/c', command],
    };
  }

  return {
    file: '/bin/bash',
    args: ['-lc', command],
  };
}

function buildRunUrl() {
  const serverUrl = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;

  if (!serverUrl || !repository || !runId) {
    return null;
  }

  return `${serverUrl}/${repository}/actions/runs/${runId}`;
}

function logFileName(command) {
  return `${command.id}.log`;
}

async function runCommand(command) {
  const logPath = path.join(artifactDir, logFileName(command));
  const startedAt = new Date();
  const logStream = fs.createWriteStream(logPath, { encoding: 'utf8' });
  const env = {
    ...process.env,
    CI: process.env.CI || '1',
    FORCE_COLOR: '0',
    NO_COLOR: '1',
  };

  logStream.write(`$ ${command.command}\n`);
  logStream.write(`started_at=${startedAt.toISOString()}\n\n`);

  if (process.env.GITHUB_ACTIONS === 'true') {
    console.log(`::group::${command.command}`);
  } else {
    console.log(`\n==> ${command.command}`);
  }

  const result = await new Promise((resolve) => {
    const invocation = shellInvocation(command.command);
    const child = spawn(invocation.file, invocation.args, {
      cwd: projectRoot,
      env,
      windowsHide: true,
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      logStream.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      logStream.write(chunk);
    });

    child.on('error', (error) => {
      const message = `\nCommand failed to start: ${error.message}\n`;
      process.stderr.write(message);
      logStream.write(message);
      resolve({ exitCode: 1, signal: null, error: error.message });
    });

    child.on('close', (exitCode, signal) => {
      resolve({ exitCode, signal, error: null });
    });
  });

  const finishedAt = new Date();
  logStream.write(`\nfinished_at=${finishedAt.toISOString()}\n`);
  logStream.write(`exit_code=${result.exitCode}\n`);
  if (result.signal) {
    logStream.write(`signal=${result.signal}\n`);
  }
  await new Promise((resolve) => logStream.end(resolve));

  if (process.env.GITHUB_ACTIONS === 'true') {
    console.log('::endgroup::');
  }

  return {
    id: command.id,
    command: command.command,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationSeconds: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    exitCode: result.exitCode,
    signal: result.signal,
    error: result.error,
    result: result.exitCode === 0 ? 'pass' : 'fail',
    log: path.relative(artifactDir, logPath).replace(/\\/g, '/'),
  };
}

function markdownTableRow(cells) {
  return `| ${cells.map((cell) => String(cell).replace(/\|/g, '\\|')).join(' | ')} |`;
}

function writeReport(context, results) {
  const failed = results.filter((result) => result.result !== 'pass');
  const overall = failed.length === 0 ? 'PASS' : 'FAIL';
  const exceptions = includeWorkoutLive
    ? []
    : [
        {
          item: 'Workout-programming live DB/RLS smoke',
          classification: 'Preview limitation',
          detail: [
            'Intentionally deferred for the default preview gate because it requires a protected',
            'non-production Supabase target and service-role secret. The manual GitHub workflow job',
            '`Workout programming live DB/RLS smoke` remains wired through `workflow_dispatch` with',
            '`run_live_workout_db_checks=true`.',
          ].join(' '),
        },
      ];

  const lines = [
    '# Preview Readiness',
    '',
    '## Last Verified',
    '',
    `- Commit SHA: \`${context.commitSha || 'unknown'}\``,
    `- Ref: \`${context.refName || 'unknown'}\``,
    `- Date: \`${context.verifiedAt}\``,
    `- Runner: \`${context.runner}\``,
    context.runUrl ? `- GitHub run: ${context.runUrl}` : null,
    `- Result: \`${overall}\``,
    '',
    '## Commands',
    '',
    markdownTableRow(['Command', 'Result', 'Exit code', 'Duration', 'Output log']),
    markdownTableRow(['---', '---', '---', '---', '---']),
    ...results.map((result) =>
      markdownTableRow([
        `\`${result.command}\``,
        result.result.toUpperCase(),
        result.exitCode,
        `${result.durationSeconds}s`,
        `\`${result.log}\``,
      ])
    ),
    '',
    '## Known Exceptions',
    '',
  ].filter((line) => line !== null);

  if (exceptions.length === 0) {
    lines.push('- None.');
  } else {
    for (const exception of exceptions) {
      lines.push(`- ${exception.classification}: ${exception.item} - ${exception.detail}`);
    }
  }

  lines.push(
    '',
    '## Failed Or Deferred Items',
    '',
  );

  if (failed.length === 0 && exceptions.length === 0) {
    lines.push('- None.');
  } else {
    for (const result of failed) {
      lines.push(`- Launch blocker: \`${result.command}\` exited ${result.exitCode}. See \`${result.log}\`.`);
    }
    for (const exception of exceptions) {
      lines.push(`- ${exception.classification}: ${exception.item}.`);
    }
  }

  lines.push(
    '',
    '## Output Capture',
    '',
    'Full stdout and stderr for every command is stored beside this report in the same release artifact.',
    'This report is generated by `scripts/run-preview-quality-gate.js` so local and GitHub Actions runs use the same command list.',
    '',
  );

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

  fs.writeFileSync(
    statusPath,
    `${JSON.stringify(
      {
        ...context,
        result: overall.toLowerCase(),
        includeWorkoutLive,
        commands: results,
        knownExceptions: exceptions,
        failedOrDeferred: [
          ...failed.map((result) => ({
            classification: 'launch_blocker',
            command: result.command,
            exitCode: result.exitCode,
            log: result.log,
          })),
          ...exceptions.map((exception) => ({
            classification: exception.classification.toLowerCase().replace(/\s+/g, '_'),
            item: exception.item,
            detail: exception.detail,
          })),
        ],
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });

  const context = {
    commitSha: process.env.GITHUB_SHA || runGit(['rev-parse', 'HEAD']),
    refName: process.env.GITHUB_REF_NAME || runGit(['rev-parse', '--abbrev-ref', 'HEAD']),
    verifiedAt: new Date().toISOString(),
    runner: process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
    runUrl: buildRunUrl(),
    artifactDir,
    reportPath,
  };

  const results = [];
  for (const command of commands) {
    results.push(await runCommand(command));
  }

  writeReport(context, results);

  const failed = results.filter((result) => result.result !== 'pass');
  if (failed.length > 0) {
    console.error(`Preview quality gate failed: ${failed.map((result) => result.command).join(', ')}`);
    process.exit(1);
  }

  console.log(`Preview quality gate passed. Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
