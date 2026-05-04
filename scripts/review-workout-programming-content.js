#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  buildAuditReport,
  formatAuditReport,
  loadWorkoutProgramming,
  parseArgs,
  readJsonFile,
  writeJsonOrHuman,
} = require('./workout-programming-content-utils.js');

function usage() {
  return [
    'Workout programming content review workflow',
    '',
    'Commands:',
    '  report                         Print the normal audit report, optionally with --review-decisions <file>.',
    '  export-queue --out <file>      Export records needing coach/safety review as JSON.',
    '  validate-decisions --in <file> Validate a review decision JSON file.',
    '  apply-decisions --in <file>    Apply review decisions in memory and print an audit report.',
    '  export-sql --in <file>         Generate Supabase review-metadata UPDATE SQL.',
    '',
    'Options:',
    '  --json                         Print JSON instead of human output where supported.',
    '  --out <file>                   Write output to file.',
    '  --review-decisions <file>      Apply decision overlay before audit/release checks.',
    '  --limit <n>                    Limit human report entries.',
  ].join('\n');
}

function writeOutput(output, args) {
  if (args.out) {
    const target = path.resolve(process.cwd(), args.out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, output, 'utf8');
    console.log(`Wrote ${target}`);
  } else {
    process.stdout.write(output);
  }
}

function loadBaseContent() {
  const workout = loadWorkoutProgramming(process.cwd());
  return {
    workout,
    catalog: workout.workoutProgrammingCatalog,
    intelligence: workout.workoutIntelligenceCatalog,
  };
}

function validateDecisions(workout, catalog, intelligence, decisionFile) {
  const result = workout.applyContentReviewDecisions(catalog, intelligence, decisionFile);
  return {
    valid: result.errors.length === 0,
    appliedCount: result.applied.length,
    errors: result.errors,
    warnings: result.warnings,
    applied: result.applied,
  };
}

function main() {
  const [command = 'report', ...rest] = process.argv.slice(2);
  if (command === '--help' || command === '-h' || command === 'help') {
    console.log(usage());
    return;
  }

  const args = parseArgs(rest);
  const { workout, catalog, intelligence } = loadBaseContent();

  if (command === 'report') {
    const report = buildAuditReport(process.cwd(), { reviewDecisionsPath: args.reviewDecisions });
    writeJsonOrHuman(report, args, formatAuditReport);
    return;
  }

  if (command === 'export-queue') {
    const queue = workout.createContentReviewQueue(catalog, intelligence);
    writeOutput(`${JSON.stringify(queue, null, 2)}\n`, args);
    return;
  }

  if (command === 'validate-decisions') {
    if (!args.in) throw new Error('validate-decisions requires --in <review-decisions.json>.');
    const decisionFile = readJsonFile(args.in);
    const validation = validateDecisions(workout, catalog, intelligence, decisionFile);
    writeOutput(`${JSON.stringify(validation, null, 2)}\n`, args);
    process.exitCode = validation.valid ? 0 : 1;
    return;
  }

  if (command === 'apply-decisions') {
    if (!args.in) throw new Error('apply-decisions requires --in <review-decisions.json>.');
    const decisionFile = readJsonFile(args.in);
    const validation = validateDecisions(workout, catalog, intelligence, decisionFile);
    if (!validation.valid) {
      console.error([
        'Review decision file is invalid.',
        ...validation.errors.map((error) => `- ${error}`),
      ].join('\n'));
      process.exit(1);
    }
    const report = buildAuditReport(process.cwd(), { reviewDecisionFile: decisionFile });
    writeJsonOrHuman(report, args, formatAuditReport);
    return;
  }

  if (command === 'export-sql') {
    if (!args.in) throw new Error('export-sql requires --in <review-decisions.json>.');
    const decisionFile = readJsonFile(args.in);
    const validation = validateDecisions(workout, catalog, intelligence, decisionFile);
    if (!validation.valid) {
      console.error([
        'Review decision file is invalid; SQL was not generated.',
        ...validation.errors.map((error) => `- ${error}`),
      ].join('\n'));
      process.exit(1);
    }
    writeOutput(workout.generateContentReviewDecisionSql(decisionFile), args);
    return;
  }

  throw new Error(`Unknown command ${command}.\n\n${usage()}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
