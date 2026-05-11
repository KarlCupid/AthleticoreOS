#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const scanTargets = [
  path.join(repoRoot, 'src'),
  path.join(repoRoot, 'lib', 'performance-engine', 'presentation'),
  path.join(repoRoot, 'lib', 'engine', 'presentation'),
  path.join(repoRoot, 'lib', 'api', 'authUx.ts'),
  path.join(repoRoot, 'lib', 'engine', 'calculateNutrition.ts'),
  path.join(repoRoot, 'lib', 'performance-engine', 'workout-programming', 'workoutSafetyCopy.ts'),
  path.join(repoRoot, 'lib', 'performance-engine', 'workout-programming', 'decisionTraceSummaries.ts'),
  path.join(repoRoot, 'lib', 'performance-engine', 'workout-programming', 'workoutDescriptionService.ts'),
  path.join(repoRoot, 'lib', 'performance-engine', 'workout-programming', 'workoutDescriptionFacade.ts'),
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
  ['failed', 'could not complete'],
  ['engine', 'Athleticore'],
  ['model', 'plan or estimate'],
  ['generated', 'built or planned'],
  ['confidence', 'context'],
  ['insufficient data', 'needs more context'],
  ['mission unavailable', 'mission needs context'],
  ['block', 'pause or stop'],
  ['blocker', 'issue to resolve'],
  ['unavailable', 'needs a refresh, not ready, or try again'],
  ['projection violation', 'review needed'],
  ['data quality', 'context'],
];

const fileExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const strict = process.argv.includes('--strict');
const showAllowed = process.argv.includes('--all');

const allowedPathPattern = /(?:^|[\\/])(?:__tests__|test|tests|docs|scripts|dev|diagnostics|replay-lab|release)(?:[\\/]|$)|devpreview|dev-preview|diagnostic|\.test\.|\.spec\./i;
const commentLinePattern = /^\s*(?:\/\/|\/\*|\*|\{\/\*)/;
const importExportPattern = /^\s*(?:import|export)\b/;
const declarationPattern = /^\s*(?:type|interface|enum|class|function)\b/;
const typeOnlyPattern = /\b(?:type|interface)\s+[A-Z]|\bas\s+const\b|:\s*(?:Array<|Record<|Readonly|Pick<|Omit<|Partial<|Promise<|[A-Z][A-Za-z0-9_]*)(?:[;,\s=)>]|$)/;
const diagnosticLinePattern = /\b(?:testID|logError|logWarn|console\.|debugLines|internalDevSurfacesEnabled|EngineReplayLab|GeneratedWorkoutDevPreview|useGeneratedWorkoutDevPreview)\b/;
const enumLikeStringPattern = /(?:===|!==|==|!=)\s*['"`][a-z0-9_-]+['"`]|case\s+['"`][a-z0-9_-]+['"`]|\b(?:source|status|type|id|code|kind|role|mode|route|routeName|key|field|recordType|severity|level|operation|schemaVersion|engineVersion|workoutTypeId|goalId|templateId|phase|family|domain|sourceLabel|completionStatus|toneVariant|descriptionTemplateId)\s*:\s*['"`][a-z0-9_.:-]+['"`]/i;
const internalStringUnionPattern = /^\s*(?:type\s+\w+\s*=\s*)?\w+\??:\s*(?:['"`][a-z0-9_.:-]+['"`]\s*\|\s*)+['"`][a-z0-9_.:-]+['"`]\s*;?$/i;
const inlineOptionalStringUnionPattern = /\b\w+\?:\s*(?:['"`][a-z0-9_.:-]+['"`]\s*\|\s*)+['"`][a-z0-9_.:-]+['"`]/i;
const internalFieldDefaultPattern = /^\s*(?:source|status|type|id|code|kind|role|mode|route|routeName|key|field|recordType|severity|level|operation|schemaVersion|engineVersion|workoutTypeId|goalId|templateId|phase|family|domain|sourceLabel|completionStatus|toneVariant|descriptionTemplateId)\s*:\s*.*['"`][a-z0-9_.:-]+['"`]\s*,?$/i;
const internalIdentifierPattern = /\b(?:from|require)\s*\(|\bfrom\s+['"`]|message\.includes|this\.name\s*=|classifyPlanEntryRuntimeSurface|acwr\.status|process\.env|EXPO_PUBLIC_|resolveGeneratedWorkoutContentReviewOptions/i;
const userFacingKeyPattern = /\b(?:title|subtitle|body|copy|label|headline|summary|message|text|detail|note|reason|explanation|placeholder|accessibilityLabel|accessibilityHint|primaryAction|secondaryAction|Alert\.alert|setFormMessage|return)\b/i;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function phrasePatternFor(phrase) {
  const escaped = escapeRegExp(phrase);
  if (/^[a-z0-9 ]+$/i.test(phrase)) {
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }
  return new RegExp(escaped, 'i');
}

function walk(target, files = []) {
  if (!fs.existsSync(target)) return files;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (fileExtensions.has(path.extname(target))) files.push(target);
    return files;
  }

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === 'dist' || entry.name === 'build') continue;
      walk(fullPath, files);
      continue;
    }
    if (fileExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function phraseAppearsInsideString(line, phrase) {
  const pattern = phrasePatternFor(phrase);
  const stringPattern = /(['"`])(?:\\.|(?!\1).)*\1/g;
  let match;
  while ((match = stringPattern.exec(line)) !== null) {
    const literal = match[0].replace(/\$\{[^}]*\}/g, '');
    if (pattern.test(literal)) return true;
  }
  return false;
}

function phraseAppearsInsideJsxText(line, phrase) {
  const pattern = phrasePatternFor(phrase);
  const jsxTextPattern = />[^<>{}]*</g;
  let match;
  while ((match = jsxTextPattern.exec(line)) !== null) {
    const text = match[0].slice(1, -1);
    if (pattern.test(text)) return true;
  }
  return false;
}

function phraseAppearsInCopy(line, phrase) {
  return phraseAppearsInsideString(line, phrase) || phraseAppearsInsideJsxText(line, phrase);
}

function allowReason(relativePath, line, phrase) {
  const trimmed = line.trim();
  const appearsInCopy = phraseAppearsInCopy(line, phrase);
  if (allowedPathPattern.test(relativePath)) return 'allowed path: tests, docs, scripts, diagnostics, or replay lab';
  if (commentLinePattern.test(trimmed)) return 'source comment';
  if (diagnosticLinePattern.test(line)) return 'diagnostic, test hook, or internal preview surface';
  if (importExportPattern.test(line)) return 'import or export';
  if (declarationPattern.test(line) && !appearsInCopy) return 'type, class, or function name';
  if (internalStringUnionPattern.test(trimmed)) return 'string union type';
  if (inlineOptionalStringUnionPattern.test(line)) return 'string union type';
  if (typeOnlyPattern.test(line) && !userFacingKeyPattern.test(line)) return 'type name or type annotation';
  if (internalFieldDefaultPattern.test(line)) return 'internal field default or enum value';
  if (enumLikeStringPattern.test(line)) return 'internal key, enum, or status value';
  if (internalIdentifierPattern.test(line)) return 'internal identifier, comparison, or environment key';
  if (!appearsInCopy) return 'identifier or field access, not string copy';
  return null;
}

function likelyHighSeverity(relativePath, line) {
  if (/\.(tsx|jsx)$/.test(relativePath)) return true;
  if (/\b(?:presentation|authUx|calculateNutrition|workoutSafetyCopy|decisionTraceSummaries|workoutDescription)/.test(relativePath) && userFacingKeyPattern.test(line)) return true;
  if (/\b(?:Alert\.alert|accessibilityLabel|placeholder|setFormMessage)\b/.test(line)) return true;
  return false;
}

const files = Array.from(new Set(scanTargets.flatMap((target) => walk(target)))).sort();
const findings = [];

for (const file of files) {
  const relativePath = path.relative(repoRoot, file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    riskyPhrases.forEach(([phrase, suggestion]) => {
      const pattern = phrasePatternFor(phrase);
      if (!pattern.test(line)) return;
      const reason = allowReason(relativePath, line, phrase);
      const allowed = Boolean(reason);
      const severity = allowed ? 'allowed' : likelyHighSeverity(relativePath, line) ? 'high' : 'medium';
      findings.push({
        file: relativePath,
        line: index + 1,
        phrase,
        suggestion,
        severity,
        reason: reason ?? (severity === 'high' ? 'definitely athlete-facing copy' : 'likely athlete-facing copy'),
      });
    });
  });
}

const high = findings.filter((finding) => finding.severity === 'high');
const medium = findings.filter((finding) => finding.severity === 'medium');
const allowed = findings.filter((finding) => finding.severity === 'allowed');
const review = [...high, ...medium];

console.log('UI copy audit');
console.log(`Scanned: ${scanTargets.map((target) => path.relative(repoRoot, target)).join(', ')}`);
console.log(`Findings: ${findings.length} (${high.length} high, ${medium.length} medium, ${allowed.length} allowed/internal)`);

if (review.length > 0) {
  console.log('');
  console.log('Needs review:');
  review.forEach((finding) => {
    console.log(`${finding.file}:${finding.line} | severity=${finding.severity} | phrase="${finding.phrase}" | suggestion="${finding.suggestion}" | ${finding.reason}`);
  });
} else {
  console.log('No risky athlete-facing copy found outside allowed/internal contexts.');
}

if (showAllowed && allowed.length > 0) {
  console.log('');
  console.log('Allowed/internal:');
  allowed.forEach((finding) => {
    console.log(`${finding.file}:${finding.line} | severity=${finding.severity} | phrase="${finding.phrase}" | suggestion="${finding.suggestion}" | ${finding.reason}`);
  });
}

if (strict && review.length > 0) {
  process.exitCode = 1;
}
