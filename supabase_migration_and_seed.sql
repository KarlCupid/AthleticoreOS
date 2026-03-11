-- ============================================
-- S&C Feature Migration & Seed
-- ============================================

-- 1. Extend exercise_library with new columns
-- Drop the old type constraint since we are adding new types like 'power', 'sport_specific', etc.
ALTER TABLE exercise_library DROP CONSTRAINT IF EXISTS exercise_library_type_check;

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
  ('Barbell Back Squat', 'heavy_lift', 9, 'quads', 'barbell', 'Compound lower body lift. Bar on upper traps, squat to parallel or below.', 'Brace core, chest up, push knees out, drive through heels.', '{"boxing","general"}'),
  ('Barbell Front Squat', 'heavy_lift', 8, 'quads', 'barbell', 'Quad-dominant squat with bar in front rack position.', 'Elbows high, chest proud, sit between hips, control descent.', '{"boxing","general"}'),
  ('Conventional Deadlift', 'heavy_lift', 10, 'back', 'barbell', 'Full posterior chain compound lift from floor to lockout.', 'Hinge at hips, flat back, push floor away, squeeze glutes at top.', '{"boxing","general"}'),
  ('Trap Bar Deadlift', 'heavy_lift', 8, 'quads', 'barbell', 'Deadlift variation with neutral grip handles, lower back-friendly.', 'Stand in center, hips back, drive up, stay tall at lockout.', '{"boxing","general"}'),
  ('Romanian Deadlift', 'heavy_lift', 7, 'hamstrings', 'barbell', 'Hamstring-focused hip hinge with slight knee bend.', 'Soft knees, push hips back, feel hamstring stretch, squeeze glutes.', '{"boxing","general"}'),
  ('Barbell Bench Press', 'heavy_lift', 7, 'chest', 'barbell', 'Horizontal pressing compound for chest, shoulders, and triceps.', 'Retract shoulder blades, arch slightly, bar to mid-chest, press evenly.', '{"general"}'),
  ('Incline Dumbbell Press', 'heavy_lift', 6, 'chest', 'dumbbell', 'Upper chest pressing on a 30-45 degree incline.', 'Pinch shoulder blades, control down, press and squeeze at top.', '{"general"}'),
  ('Overhead Press', 'heavy_lift', 7, 'shoulders', 'barbell', 'Strict standing press overhead for shoulder and core strength.', 'Brace core, press straight up, head through at lockout, no lean.', '{"boxing","general"}'),
  ('Barbell Row', 'heavy_lift', 7, 'back', 'barbell', 'Bent-over row for upper back thickness and posture strength.', 'Hinge forward 45°, pull to lower chest, squeeze shoulder blades.', '{"boxing","general"}'),
  ('Weighted Pull-ups', 'heavy_lift', 8, 'back', 'bodyweight', 'Pull-up with added weight for lat and grip strength.', 'Dead hang start, pull elbows to hips, chin over bar, control down.', '{"boxing","general"}'),
  ('Bulgarian Split Squat', 'heavy_lift', 7, 'quads', 'dumbbell', 'Single-leg squat with rear foot elevated. Great for balance.', 'Upright torso, front knee over toe, drop back knee straight down.', '{"boxing","general"}'),
  ('Hip Thrust', 'heavy_lift', 6, 'glutes', 'barbell', 'Glute-focused hip extension against a bench.', 'Shoulders on bench, bar on hips, drive up, squeeze glutes hard at top.', '{"boxing","general"}'),
  ('Dumbbell Row', 'heavy_lift', 5, 'back', 'dumbbell', 'Single-arm row for unilateral back strength.', 'Hand and knee on bench, pull to hip, squeeze lat, control descent.', '{"general"}'),
  ('Rack Pull', 'heavy_lift', 8, 'back', 'barbell', 'Partial deadlift from rack for lockout strength and grip.', 'Set pins at knee height, hinge, pull and lockout, controlled return.', '{"general"}'),
  ('Landmine Press', 'heavy_lift', 5, 'shoulders', 'barbell', 'Single-arm angled press great for rotational athletes.', 'Staggered stance, press at angle, drive from hips, full extension.', '{"boxing"}'),
  ('Floor Press', 'heavy_lift', 6, 'chest', 'dumbbell', 'Bench press from the floor. Limits ROM, focuses on lockout.', 'Elbows touch floor gently, press up, don''t bounce off ground.', '{"boxing","general"}'),
  ('Goblet Squat', 'heavy_lift', 4, 'quads', 'kettlebell', 'Beginner-friendly squat holding weight at chest.', 'Hold weight close, elbows inside knees, sit deep, chest up.', '{"general"}'),
  ('Leg Press', 'heavy_lift', 6, 'quads', 'machine', 'Machine-based leg press for quad/glute volume.', 'Feet shoulder width, press through heels, don''t lock knees fully.', '{"general"}'),
  ('Lat Pulldown', 'heavy_lift', 4, 'back', 'cable', 'Cable pulldown mimicking pull-up motion.', 'Wide grip, lean slightly back, pull to upper chest, squeeze lats.', '{"general"}'),
  ('Dumbbell Shoulder Press', 'heavy_lift', 5, 'shoulders', 'dumbbell', 'Seated or standing overhead press with dumbbells.', 'Neutral spine, press overhead, full lockout, control lowering.', '{"general"}'),
  ('Power Clean', 'power', 9, 'full_body', 'barbell', 'Explosive pull from floor to front rack position.', 'Start position like deadlift, explosive hip extension, catch in front rack.', '{"boxing","general"}'),
  ('Hang Clean', 'power', 8, 'full_body', 'barbell', 'Clean from hang position (above knees) for rate of force development.', 'Hinge to hang, explode hips, pull under bar, catch in front rack.', '{"boxing","general"}'),
  ('Box Jumps', 'power', 6, 'quads', 'bodyweight', 'Explosive jump onto a box. Builds lower body power.', 'Swing arms, triple extend, land softly with knees bent, step down.', '{"boxing","general"}'),
  ('Medicine Ball Slams', 'power', 5, 'core', 'medicine_ball', 'Overhead slam for full-body power and aggression.', 'Reach overhead, slam hard, hinge at hips, catch bounce or pick up.', '{"boxing"}'),
  ('Medicine Ball Rotational Throw', 'power', 5, 'core', 'medicine_ball', 'Side throw against wall mimicking punching rotation.', 'Load back hip, rotate through core, release at wall, catch and repeat.', '{"boxing"}'),
  ('Plyometric Push-ups', 'power', 6, 'chest', 'bodyweight', 'Explosive push-up where hands leave the ground.', 'Lower controlled, explode up, hands off ground, land soft, repeat.', '{"boxing","general"}'),
  ('Kettlebell Swing', 'power', 5, 'glutes', 'kettlebell', 'Hip-driven swing for posterior chain power and conditioning.', 'Hinge don''t squat, snap hips, float the bell, tight at top.', '{"boxing","general"}'),
  ('Broad Jump', 'power', 5, 'quads', 'bodyweight', 'Horizontal explosive jump for hip extension power.', 'Countermovement, swing arms, jump forward and up, stick landing.', '{"boxing","general"}'),
  ('Clean and Press', 'power', 9, 'full_body', 'barbell', 'Full clean followed by strict or push press overhead.', 'Clean to rack, reset, drive press, full lockout, controlled return.', '{"boxing","general"}'),
  ('Dumbbell Snatch', 'power', 7, 'full_body', 'dumbbell', 'Single-arm explosive pull from floor to overhead in one motion.', 'Wide stance, hinge, explode up, punch overhead, lockout.', '{"boxing","general"}'),
  ('Landmine Rotation', 'power', 4, 'core', 'barbell', 'Rotational power movement with barbell in landmine setup.', 'Pivot feet, rotate from hips, control the arc, switch sides.', '{"boxing"}'),
  ('Depth Jump', 'power', 8, 'quads', 'bodyweight', 'Step off box, absorb landing, immediately jump. Advanced plyometric.', 'Step off don''t jump off, absorb fast, rebound immediately, full extension.', '{"boxing","general"}'),
  ('Battle Rope Slams', 'power', 4, 'full_body', 'other', 'Alternating or double rope waves for power endurance.', 'Stand athletic, slam with full arm extension, maintain rhythm.', '{"boxing"}'),
  ('Med Ball Chest Pass', 'power', 3, 'chest', 'medicine_ball', 'Explosive chest pass against wall, mimicking straight punches.', 'Hold at chest, step and push, full arm extension, catch and repeat.', '{"boxing"}'),
  ('Lateral Bound', 'power', 5, 'glutes', 'bodyweight', 'Lateral explosive jump for hip stability and lateral power.', 'Push off inside foot, jump laterally, land on opposite foot, stick.', '{"boxing","general"}'),
  ('Heavy Bag Rounds', 'sport_specific', 7, 'full_body', 'heavy_bag', 'Timed rounds on the heavy bag. Work combinations, power shots.', 'Stay in stance, rotate hips, breathe on punches, work defense between combos.', '{"boxing"}'),
  ('Shadow Boxing', 'sport_specific', 3, 'full_body', 'bodyweight', 'Boxing technique practice without equipment. Footwork, combos, defense.', 'Visualize opponent, stay in stance, full extension, move your head.', '{"boxing"}'),
  ('Speed Bag', 'sport_specific', 3, 'shoulders', 'other', 'Rhythmic speed bag work for hand speed, timing, and shoulder endurance.', 'Small circles, consistent rhythm, keep hands up, elbows in.', '{"boxing"}'),
  ('Double End Bag', 'sport_specific', 4, 'full_body', 'other', 'Accuracy and timing bag. Improves hand-eye coordination.', 'Light punches, focus on accuracy, work counter punches, move head.', '{"boxing"}'),
  ('Slip Rope Drill', 'sport_specific', 2, 'core', 'other', 'Head movement practice under a rope line. Core and defensive skill.', 'Bend at knees not waist, roll under, stay in stance, keep hands up.', '{"boxing"}'),
  ('Mitt Work', 'sport_specific', 8, 'full_body', 'other', 'Pad work with a trainer. Combination practice and reaction drills.', 'Listen to calls, snap punches, move between combos, breathe.', '{"boxing"}'),
  ('Sparring', 'sport_specific', 10, 'full_body', 'bodyweight', 'Live boxing rounds with a partner. Highest sport-specific demand.', 'Control intensity, work game plan, stay composed, protect yourself.', '{"boxing"}'),
  ('Neck Harness', 'sport_specific', 3, 'neck', 'other', 'Weighted neck curls/extensions for neck strength (injury prevention).', 'Controlled movement, full range, don''t jerk, all four directions.', '{"boxing"}'),
  ('Neck Bridge', 'sport_specific', 4, 'neck', 'bodyweight', 'Wrestler/boxer bridge for neck strength and stability.', 'Roll slowly, maintain control, build gradually, never force.', '{"boxing"}'),
  ('Footwork Ladder Drills', 'sport_specific', 3, 'calves', 'other', 'Agility ladder patterns for quick feet and coordination.', 'Light on feet, stay on balls of feet, quick ground contact.', '{"boxing"}'),
  ('Clinch Work Drills', 'sport_specific', 6, 'full_body', 'bodyweight', 'Inside fighting and clinch technique practice.', 'Underhooks, body positioning, short punches, push off clean.', '{"boxing"}'),
  ('Body Shot Bag Work', 'sport_specific', 6, 'core', 'heavy_bag', 'Dedicated round focusing on body punches. Hooks, uppercuts to body.', 'Level change, pivot, rotate fully into body shots, return to guard.', '{"boxing"}'),
  ('Defensive Drill — Rolls & Slips', 'sport_specific', 3, 'core', 'bodyweight', 'Partner or solo defensive movement drill. Slips, rolls, pulls.', 'Bend at knees, small head movements, eyes on opponent, counter after.', '{"boxing"}'),
  ('Feint and Counter Drill', 'sport_specific', 4, 'full_body', 'bodyweight', 'Working feints to draw reactions, then counter punching.', 'Sell the feint, read reaction, sharp counter, reset position.', '{"boxing"}'),
  ('Sled Push', 'conditioning', 7, 'quads', 'sled', 'Loaded sled push for leg drive and conditioning.', 'Low body angle, drive through legs, full extension each step.', '{"boxing","general"}'),
  ('Sled Pull', 'conditioning', 6, 'back', 'sled', 'Pull sled toward you for upper body conditioning.', 'Athletic stance, hand over hand, drive elbows back.', '{"boxing","general"}'),
  ('Assault Bike Intervals', 'conditioning', 6, 'full_body', 'machine', 'High-intensity intervals on the assault bike for cardio conditioning.', 'All-out effort during work, easy spin during rest, pace yourself.', '{"boxing","general"}'),
  ('Jump Rope', 'conditioning', 3, 'calves', 'other', 'Boxing staple. Builds rhythm, footwork, and cardio.', 'Light bounce, wrist rotation, stay on balls of feet, relax shoulders.', '{"boxing"}'),
  ('Burpees', 'conditioning', 6, 'full_body', 'bodyweight', 'Full body conditioning movement. Drop to floor, push up, jump.', 'Chest to ground, push up, jump feet forward, jump and clap overhead.', '{"boxing","general"}'),
  ('Rowing Machine Intervals', 'conditioning', 5, 'full_body', 'machine', 'Rowing intervals for posterior chain conditioning and cardio.', 'Drive with legs first, lean back, pull to chest, reverse sequence.', '{"general"}'),
  ('Farmer''s Walk', 'conditioning', 5, 'full_body', 'dumbbell', 'Loaded carry for grip, core, and full body stability.', 'Tall posture, tight core, short quick steps, death grip.', '{"boxing","general"}'),
  ('Stair Sprints', 'conditioning', 7, 'quads', 'bodyweight', 'Sprint up stairs for explosive leg conditioning.', 'Drive knees, pump arms, every step or every other, walk down.', '{"boxing"}'),
  ('Hill Sprints', 'conditioning', 8, 'quads', 'bodyweight', 'Uphill sprints for max effort leg power and conditioning.', 'Lean into hill, drive knees, pump arms, walk back for recovery.', '{"boxing","general"}'),
  ('Prowler Push', 'conditioning', 7, 'full_body', 'sled', 'Low-handle sled push for maximum leg drive.', 'Get low, drive from legs, full steps, don''t round back.', '{"boxing","general"}'),
  ('Battle Ropes — Alternating', 'conditioning', 5, 'shoulders', 'other', 'Alternating arm rope waves for shoulder endurance.', 'Athletic stance, big waves, maintain speed, breathe rhythmically.', '{"boxing"}'),
  ('Tire Flips', 'conditioning', 8, 'full_body', 'other', 'Full body power and conditioning. Flip a heavy tire.', 'Low start, drive with legs, chest into tire, push over.', '{"boxing","general"}'),
  ('Shuttle Runs', 'conditioning', 5, 'quads', 'bodyweight', 'Short distance sprints with direction changes.', 'Low on turns, drive out of cuts, decelerate controlled.', '{"boxing","general"}'),
  ('Swimming', 'conditioning', 3, 'full_body', 'other', 'Low-impact full-body cardio. Great for active recovery days.', 'Steady pace, rhythmic breathing, use all strokes for variety.', '{"general"}'),
  ('Road Run', 'conditioning', 4, 'quads', 'bodyweight', 'Steady state or tempo running for aerobic base.', 'Conversational pace, heel to toe, relax upper body.', '{"boxing","general"}'),
  ('Hip Circles', 'mobility', 1, 'glutes', 'bodyweight', 'Standing hip CARs for hip mobility and joint health.', 'Big slow circles, control range, both directions, brace core.', '{"boxing","general"}'),
  ('Foam Rolling — Full Body', 'mobility', 1, 'full_body', 'other', 'Self-myofascial release on major muscle groups.', 'Slow rolls, pause on tender spots 30s, breathe through it.', '{"boxing","general"}'),
  ('Band Pull-Aparts', 'mobility', 1, 'shoulders', 'band', 'Rear delt and upper back activation with resistance band.', 'Straight arms, pull to chest level, squeeze rear delts, slow return.', '{"boxing","general"}'),
  ('World''s Greatest Stretch', 'mobility', 1, 'full_body', 'bodyweight', 'Dynamic stretch complex hitting hip flexors, hamstrings, thoracic spine.', 'Lunge, rotate, reach, hamstring stretch, flow between positions.', '{"boxing","general"}'),
  ('90/90 Hip Stretch', 'mobility', 1, 'glutes', 'bodyweight', 'Seated hip internal/external rotation stretch.', 'Both legs at 90°, tall spine, lean into front hip, hold 30s each side.', '{"boxing","general"}'),
  ('Thoracic Spine Rotation', 'mobility', 1, 'back', 'bodyweight', 'Open book rotation for upper back mobility.', 'Side-lying, top knee pinned, rotate and reach, follow hand with eyes.', '{"boxing","general"}'),
  ('Cat-Cow Stretch', 'mobility', 1, 'back', 'bodyweight', 'Spinal flexion/extension flow for back mobility.', 'Hands under shoulders, breathe into arch, exhale into round.', '{"general"}'),
  ('Pigeon Stretch', 'mobility', 1, 'glutes', 'bodyweight', 'Deep glute and hip flexor stretch.', 'Front shin angled, square hips, fold forward, breathe deeply.', '{"boxing","general"}'),
  ('Couch Stretch', 'mobility', 1, 'quads', 'bodyweight', 'Intense quad and hip flexor stretch with rear foot elevated.', 'Back knee to wall, squeeze glute, upright torso, hold 60s.', '{"general"}'),
  ('Lacrosse Ball Trigger Points', 'mobility', 1, 'full_body', 'other', 'Targeted pressure point release on tight areas.', 'Find knot, apply pressure, hold 30-60s, breathe and relax.', '{"boxing","general"}'),
  ('Shoulder Dislocates', 'mobility', 1, 'shoulders', 'band', 'Wide grip band pass-overs for shoulder mobility.', 'Start wide, pass over head and behind, return. Narrow grip to progress.', '{"boxing","general"}'),
  ('Ankle Circles', 'mobility', 1, 'calves', 'bodyweight', 'Ankle CARs for foot and ankle mobility.', 'Seated or standing, big circles, both directions, full range.', '{"boxing","general"}'),
  ('Wrist Circles', 'mobility', 1, 'arms', 'bodyweight', 'Wrist CARs for wrist health. Essential for boxers.', 'Full circles, both directions, extend and flex, gentle press.', '{"boxing"}'),
  ('Dead Hang', 'mobility', 1, 'shoulders', 'bodyweight', 'Passive hang from pull-up bar for spinal decompression.', 'Relax completely, let gravity pull, breathe deeply, 30-60s.', '{"general"}'),
  ('Child''s Pose', 'mobility', 1, 'back', 'bodyweight', 'Restorative stretch for back, lats, and shoulders.', 'Knees wide, reach forward, sink hips to heels, breathe.', '{"general"}'),
  ('Light Bike Spin', 'active_recovery', 1, 'quads', 'machine', 'Easy-effort cycling for blood flow and recovery.', 'Keep heart rate low, easy pedaling, 15-20 minutes.', '{"general"}'),
  ('Walking', 'active_recovery', 1, 'full_body', 'bodyweight', 'Low-intensity walking for active recovery and mental refresh.', 'Easy pace, nasal breathing, no rush, 20-30 minutes.', '{"general"}'),
  ('Yoga Flow', 'active_recovery', 2, 'full_body', 'bodyweight', 'Gentle yoga sequence for flexibility and recovery.', 'Flow with breath, don''t force positions, hold 5 breaths each.', '{"general"}'),
  ('Light Shadow Boxing', 'active_recovery', 2, 'full_body', 'bodyweight', 'Easy shadow boxing at 30% effort. Technical focus only.', 'Slow motion, perfect form, focus on footwork, no power.', '{"boxing"}'),
  ('Band Work — Shoulders', 'active_recovery', 2, 'shoulders', 'band', 'Light band exercises for shoulder prehab and blood flow.', 'External rotations, pull-aparts, face pulls — light and controlled.', '{"boxing","general"}'),
  ('Ab Wheel Rollout', 'heavy_lift', 5, 'core', 'other', 'Anti-extension core exercise. Roll out and return.', 'Brace hard, slow rollout, don''t sag lower back, squeeze to return.', '{"boxing","general"}'),
  ('Hanging Leg Raise', 'heavy_lift', 5, 'core', 'bodyweight', 'Hanging from bar, raise legs to parallel or above.', 'No swinging, control up and down, posterior pelvic tilt at top.', '{"boxing","general"}'),
  ('Pallof Press', 'heavy_lift', 3, 'core', 'cable', 'Anti-rotation core exercise with cable or band.', 'Stand perpendicular to cable, press out, resist rotation, hold.', '{"boxing","general"}'),
  ('Russian Twist', 'heavy_lift', 3, 'core', 'medicine_ball', 'Seated rotation with weight for oblique strength.', 'Lean back 45°, feet up, rotate side to side, touch ball to ground.', '{"boxing","general"}'),
  ('Plank', 'heavy_lift', 2, 'core', 'bodyweight', 'Isometric core hold. Foundation anti-extension exercise.', 'Straight line head to heels, squeeze everything, breathe normally.', '{"general"}'),
  ('Side Plank', 'heavy_lift', 2, 'core', 'bodyweight', 'Lateral core stability hold.', 'Elbow under shoulder, hips stacked, straight line, don''t sag.', '{"general"}'),
  ('Woodchop — Cable', 'heavy_lift', 3, 'core', 'cable', 'Rotational chop pattern. High to low or low to high.', 'Rotate through hips, arms guide, resist on return, both sides.', '{"boxing","general"}'),
  ('Dead Bug', 'active_recovery', 2, 'core', 'bodyweight', 'Supine core stability. Opposite arm and leg extension.', 'Back flat to floor, exhale on extension, slow and controlled.', '{"general"}'),
  ('Sit-ups — Fighter Style', 'sport_specific', 3, 'core', 'bodyweight', 'Sit-up with punch at top. Classic boxing core drill.', 'Feet anchored, sit up, throw 1-2 at top, control descent.', '{"boxing"}'),
  ('Pull-ups', 'heavy_lift', 5, 'back', 'bodyweight', 'Overhand grip vertical pull for lat and upper back strength.', 'Dead hang, pull elbows down, chin over bar, full return.', '{"boxing","general"}'),
  ('Chin-ups', 'heavy_lift', 5, 'back', 'bodyweight', 'Underhand grip pull-up. More bicep involvement.', 'Supinated grip, pull chest to bar, full hang between reps.', '{"general"}'),
  ('Dips', 'heavy_lift', 5, 'chest', 'bodyweight', 'Parallel bar dips for chest and tricep strength.', 'Lean slightly forward, elbows back, lower to 90°, press to lockout.', '{"boxing","general"}'),
  ('Push-ups', 'heavy_lift', 2, 'chest', 'bodyweight', 'Standard push-up for upper body pressing endurance.', 'Hands under shoulders, body straight, chest to floor, full lockout.', '{"boxing","general"}'),
  ('Inverted Row', 'heavy_lift', 3, 'back', 'bodyweight', 'Horizontal body row under a bar or TRX.', 'Straight body, pull chest to bar, squeeze upper back, controlled lower.', '{"general"}'),
  ('Pistol Squat', 'heavy_lift', 6, 'quads', 'bodyweight', 'Single-leg squat to full depth. Advanced balance and strength.', 'Extend free leg, sit back and down, drive up, arms for balance.', '{"general"}'),
  ('Muscle-up', 'power', 8, 'full_body', 'bodyweight', 'Pull-up transitioning into a dip above the bar.', 'Explosive pull, lean forward at top, press to lockout.', '{"general"}'),
  ('Barbell Curl', 'heavy_lift', 2, 'arms', 'barbell', 'Bicep curl with barbell for arm strength.', 'Elbows pinned, controlled curl, squeeze at top, slow negative.', '{"general"}'),
  ('Tricep Pushdown', 'heavy_lift', 2, 'arms', 'cable', 'Cable tricep isolation for arm lockout strength.', 'Elbows at sides, extend fully, squeeze tricep, control return.', '{"general"}'),
  ('Hammer Curl', 'heavy_lift', 2, 'arms', 'dumbbell', 'Neutral grip curl for brachioradialis and bicep.', 'Thumbs up, elbows still, curl to shoulder, lower controlled.', '{"general"}'),
  ('Wrist Roller', 'sport_specific', 2, 'arms', 'other', 'Wrist roller for forearm and grip strength. Essential for boxers.', 'Roll up slowly, control descent, alternate roll directions.', '{"boxing"}'),
  ('Face Pull', 'heavy_lift', 2, 'shoulders', 'cable', 'Rear delt and rotator cuff exercise for shoulder health.', 'Pull to face, external rotate at end, squeeze rear delts.', '{"boxing","general"}'),
  ('Lateral Raise', 'heavy_lift', 2, 'shoulders', 'dumbbell', 'Side delt isolation for shoulder width and endurance.', 'Slight lean, raise to shoulder height, control descent.', '{"general"}')
ON CONFLICT DO NOTHING;
