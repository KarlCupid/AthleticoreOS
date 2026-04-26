import {
  REQUIRED_SC_SESSION_FAMILIES,
  EXERCISE_LIBRARY_RESOURCES,
  SCIENCE_NOTES,
  SESSION_TEMPLATES,
  TRACKING_SCHEMAS,
  buildSessionPrescriptionForWorkout,
  buildSessionPrescriptionFromTemplate,
  mapConditioningTypeToSessionFamily,
  validateSCProgrammingResources,
} from './scProgrammingResources.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  PASS ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

console.log('\n-- scProgrammingResources --');

const validation = validateSCProgrammingResources();
assert(
  validation.errors.length ? validation.errors.join('\n') : 'resource catalog validates',
  validation.valid,
);

const templateIds = new Set(SESSION_TEMPLATES.map((template) => template.id));
assert(
  'every required S&C family has a template',
  REQUIRED_SC_SESSION_FAMILIES.every((family) => templateIds.has(family)),
);

const schemaIds = new Set(TRACKING_SCHEMAS.map((schema) => schema.id));
const scienceIds = new Set(SCIENCE_NOTES.map((note) => note.id));
const resourceModalities = new Set(EXERCISE_LIBRARY_RESOURCES.map((exercise) => exercise.modality));

for (const modality of ['strength', 'power', 'plyometric', 'sprint', 'conditioning', 'circuit', 'agility', 'mobility', 'recovery']) {
  assert(`exercise catalog covers ${modality}`, resourceModalities.has(modality as any));
}

for (const exercise of EXERCISE_LIBRARY_RESOURCES) {
  assert(`${exercise.id} has tracking schema`, Boolean(exercise.tracking_schema_id && schemaIds.has(exercise.tracking_schema_id)));
  assert(`${exercise.id} has progression family`, Boolean(exercise.progression_family));
  assert(`${exercise.id} has energy systems`, Boolean(exercise.energy_systems?.length));
  assert(`${exercise.id} has youth policy`, Boolean(exercise.youth_suitability));
}

for (const template of SESSION_TEMPLATES) {
  assert(`${template.id} has tracking schema`, schemaIds.has(template.trackingSchemaId));
  assert(`${template.id} has dose fields`, Object.keys(template.dose).length > 0);
  assert(`${template.id} has progression model`, template.progressionModelId.length > 0);
  assert(`${template.id} has section dose`, template.sections.every((section) => Object.keys(section.dose).length > 0));
  assert(`${template.id} has science notes`, template.scienceNoteIds.every((id) => scienceIds.has(id)));
}

const plyo = buildSessionPrescriptionFromTemplate('low_contact_plyometrics');
assert('plyometric templates route to plyo wizard', plyo.wizardKind === 'plyometric');
assert('plyometric templates summarize contacts', (plyo.dose.plyoContacts ?? 0) > 0);

const sprint = buildSessionPrescriptionFromTemplate('acceleration');
assert('speed templates route to sprint wizard', sprint.wizardKind === 'sprint');
assert('speed templates summarize meters', (sprint.dose.sprintMeters ?? 0) > 0);

const hiit = buildSessionPrescriptionFromTemplate(mapConditioningTypeToSessionFamily('assault_bike'));
assert('HIIT conditioning maps to HIIT wizard', hiit.wizardKind === 'hiit');
assert('HIIT templates summarize work minutes', (hiit.dose.hiitMinutes ?? 0) > 0);

const recovery = buildSessionPrescriptionForWorkout({
  focus: 'recovery',
  primaryAdaptation: 'recovery',
  engineSessionFamily: 'recovery',
});
assert('engine recovery resolves to recovery wizard', recovery.wizardKind === 'recovery');
assert('engine recovery includes safety flags array', Array.isArray(recovery.safetyFlags));

if (failed > 0) {
  throw new Error(`scProgrammingResources tests failed: ${failed}`);
}

console.log(`scProgrammingResources tests passed: ${passed}`);
