#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  buildAuditReport,
  loadWorkoutProgramming,
  parseArgs,
  shouldFail,
  tableCounts,
} = require('./workout-programming-content-utils.js');

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildAuditReport(process.cwd());
  if (!args.allowInvalid && shouldFail(report, { ...args, strict: false, failOnWarnings: false })) {
    console.error('Workout programming content has validation or production blockers. Run npm run workout:validate-content for details.');
    process.exit(1);
  }

  const workout = loadWorkoutProgramming(process.cwd());
  const rows = workout.buildWorkoutProgrammingSeedRows(workout.workoutProgrammingCatalog);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'lib/performance-engine/workout-programming/content',
    summary: {
      tables: tableCounts(rows),
    },
    rows,
  };
  const json = `${JSON.stringify(payload, null, 2)}\n`;

  if (args.out) {
    const target = path.resolve(process.cwd(), args.out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, json, 'utf8');
    console.log(`Wrote ${target}`);
    console.log(`Exported ${Object.keys(rows).length} Supabase seed tables.`);
  } else {
    process.stdout.write(json);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
