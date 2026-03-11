const fs = require('fs');

const seedContent = fs.readFileSync('lib/data/exerciseSeed.ts', 'utf-8');

// Match everything from the array start to the end. The regex must account for multiline
let arrayText = seedContent.substring(seedContent.indexOf('export const EXERCISE_SEED'));
arrayText = arrayText.substring(arrayText.indexOf('= [') + 2);
// Find the last closing bracket and semicolon
arrayText = arrayText.substring(0, arrayText.lastIndexOf('];') + 1);

let exercises = [];
try {
    exercises = eval(`(${arrayText})`);
} catch (e) {
    console.log("Failed to parse array: " + e.message);
    process.exit(1);
}

let sql = `-- ============================================
-- S&C Feature Migration & Seed
-- ============================================

-- 1. Extend exercise_library with new columns
ALTER TABLE exercise_library
  ADD COLUMN IF NOT EXISTS muscle_group TEXT DEFAULT 'full_body',
  ADD COLUMN IF NOT EXISTS equipment TEXT DEFAULT 'bodyweight',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cues TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sport_tags TEXT[] DEFAULT '{}';

-- 2. Workout log (one row per session)
CREATE TABLE IF NOT EXISTS workout_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  timeline_block_id UUID REFERENCES daily_timeline(id),
  workout_type TEXT NOT NULL DEFAULT 'strength',
  focus TEXT,
  total_volume NUMERIC DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  session_rpe INTEGER,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Set-level log (many rows per workout)
CREATE TABLE IF NOT EXISTS workout_set_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID REFERENCES workout_log(id) ON DELETE CASCADE NOT NULL,
  exercise_library_id UUID REFERENCES exercise_library(id) NOT NULL,
  superset_group INTEGER,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_lbs NUMERIC DEFAULT 0,
  rpe INTEGER,
  tempo TEXT,
  rest_seconds INTEGER,
  is_warmup BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS policies
ALTER TABLE workout_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_set_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users own workout_log" ON workout_log
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users own workout_set_log" ON workout_set_log
    FOR ALL USING (
      workout_log_id IN (SELECT id FROM workout_log WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 5. Seed Pre-Built Exercises
-- ============================================
INSERT INTO public.exercise_library (name, type, cns_load, muscle_group, equipment, description, cues, sport_tags)
VALUES
`;

const values = exercises.map(ex => {
    const name = ex.name.replace(/'/g, "''");
    const type = ex.type;
    const cns = ex.cns_load;
    const muscle = ex.muscle_group;
    const equipment = ex.equipment;
    const desc = (ex.description || '').replace(/'/g, "''");
    const cues = (ex.cues || '').replace(/'/g, "''");

    const tagsLength = ex.sport_tags ? ex.sport_tags.length : 0;
    let tagsStr = "'{}'";
    if (tagsLength > 0) {
        tagsStr = `'{${ex.sport_tags.map(t => `"${t}"`).join(',')}}'`;
    }

    return `  ('${name}', '${type}', ${cns}, '${muscle}', '${equipment}', '${desc}', '${cues}', ${tagsStr})`;
});

sql += values.join(',\n') + '\nON CONFLICT DO NOTHING;\n'; // NOTE: Add unique index constraint or ON CONFLICT resolution if exercise_library has unique names.

fs.writeFileSync('supabase_migration_and_seed.sql', sql);
console.log("Successfully generated supabase_migration_and_seed.sql");
