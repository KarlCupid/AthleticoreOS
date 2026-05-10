#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const scanRoots = [
  path.join(repoRoot, 'src'),
  path.join(repoRoot, 'lib', 'performance-engine', 'presentation'),
];

const riskyPhrases = [
  ['GeneratedWorkout', 'support session'],
  ['snapshot', 'saved context'],
  ['payload', 'how to do it'],
  ['validation', 'review notes'],
  ['compatibility view', 'older session'],
  ['legacy', 'older'],
  ['beta', 'preview or omit from athlete-facing copy'],
  ['dev preview', 'internal diagnostics'],
  ['protocol', 'plan'],
  ['compliance', 'consistency'],
  ['adherence', 'logged or consistency'],
  ['classification', 'call'],
  ['intervention', 'adjustment'],
  ['directive', 'guidance'],
  ['redline', 'overreach'],
  ['invalid', 'needs review'],
  ['failure', 'could not complete'],
];

const fileExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const devOnlyPathPattern = /(?:^|[\\/])(?:__tests__|test|tests|dev|diagnostics|replay-lab)(?:[\\/]|$)|devpreview|dev-preview|diagnostic|\.test\.|\.spec\./i;
const internalLinePattern = /^\s*(?:import|export|type|interface|enum|const|let|var|function|class)\b/;
const diagnosticLinePattern = /\b(?:testID|logError|logWarn|console\.|debugLines|internalDevSurfacesEnabled)\b/;
const internalStringPattern = /\b(?:from|require)\s*\(|\bfrom\s+['"`]|\b(?:key|value|source|screen|reason|status|type|id|code|routeName|name)\s*:|(?:===|!==|==|!=)\s*['"`]|case\s+['"`]|\?:\s*['"`]|message\.includes|this\.name\s*=|classifyPlanEntryRuntimeSurface|acwr\.status|beta-/i;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === 'dist') continue;
      walk(fullPath, files);
      continue;
    }
    if (fileExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function phraseAppearsInsideString(line, phrase) {
  const phrasePattern = new RegExp(escapeRegExp(phrase), 'i');
  const stringPattern = /(['"`])(?:\\.|(?!\1).)*\1/g;
  let match;
  while ((match = stringPattern.exec(line)) !== null) {
    const literal = match[0].replace(/\$\{[^}]*\}/g, '');
    if (phrasePattern.test(literal)) return true;
  }
  return false;
}

function allowReason(relativePath, line, phrase) {
  if (devOnlyPathPattern.test(relativePath)) return 'dev/test/diagnostic path';
  if (diagnosticLinePattern.test(line)) return 'diagnostic or test hook';
  if (internalStringPattern.test(line)) return 'internal key, enum, import, or comparison';
  if (internalLinePattern.test(line)) return 'component, type, import, or identifier';
  if (!phraseAppearsInsideString(line, phrase)) return 'internal identifier or field access';
  return null;
}

const findings = [];

for (const file of scanRoots.flatMap((root) => walk(root))) {
  const relativePath = path.relative(repoRoot, file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    riskyPhrases.forEach(([phrase, suggestion]) => {
      const pattern = new RegExp(escapeRegExp(phrase), 'i');
      if (!pattern.test(line)) return;
      const reason = allowReason(relativePath, line, phrase);
      findings.push({
        file: relativePath,
        line: index + 1,
        phrase,
        suggestion,
        allowed: Boolean(reason),
        reason: reason ?? 'review athlete-facing copy',
      });
    });
  });
}

const allowed = findings.filter((finding) => finding.allowed);
const needsReview = findings.filter((finding) => !finding.allowed);

console.log('UI copy audit');
console.log(`Scanned: ${scanRoots.map((root) => path.relative(repoRoot, root)).join(', ')}`);
console.log(`Findings: ${findings.length} (${needsReview.length} review, ${allowed.length} allowed/internal)`);

if (needsReview.length > 0) {
  console.log('');
  console.log('Needs review:');
  needsReview.forEach((finding) => {
    console.log(`${finding.file}:${finding.line} | phrase="${finding.phrase}" | suggestion="${finding.suggestion}" | allowed=${finding.allowed} | ${finding.reason}`);
  });
} else {
  console.log('No risky athlete-facing copy found outside allowed/internal contexts.');
}

if (process.argv.includes('--all') && allowed.length > 0) {
  console.log('');
  console.log('Allowed/internal:');
  allowed.forEach((finding) => {
    console.log(`${finding.file}:${finding.line} | phrase="${finding.phrase}" | suggestion="${finding.suggestion}" | allowed=${finding.allowed} | ${finding.reason}`);
  });
}
