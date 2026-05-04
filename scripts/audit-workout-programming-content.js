#!/usr/bin/env node
const {
  buildAuditReport,
  formatAuditReport,
  parseArgs,
  shouldFail,
  writeJsonOrHuman,
} = require('./workout-programming-content-utils.js');

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildAuditReport(process.cwd(), { reviewDecisionsPath: args.reviewDecisions });
  writeJsonOrHuman(report, args, formatAuditReport);
  process.exitCode = shouldFail(report, args) ? 1 : 0;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
