-- ============================================
-- Unified Schedule & Calendar System Migration
-- ============================================

-- 1. Weekly schedule template (recurring weekly pattern)
CREATE TABLE IF NOT EXISTS weekly_schedule_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  activity_type TEXT NOT NULL,
  custom_label TEXT,
  start_time TIME,
  estimated_duration_min INTEGER DEFAULT 60,
  expected_intensity INTEGER DEFAULT 5 CHECK (expected_intensity BETWEEN 1 AND 10),
  session_components JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Scheduled activities (concrete calendar entries)
CREATE TABLE IF NOT EXISTS scheduled_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  custom_label TEXT,
  start_time TIME,
  estimated_duration_min INTEGER DEFAULT 60,
  expected_intensity INTEGER DEFAULT 5 CHECK (expected_intensity BETWEEN 1 AND 10),
  session_components JSONB DEFAULT '[]',
  source TEXT DEFAULT 'template',
  status TEXT DEFAULT 'scheduled',
  actual_duration_min INTEGER,
  actual_rpe INTEGER,
  notes TEXT,
  engine_recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Activity log (detailed per-component tracking)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_activity_id UUID REFERENCES scheduled_activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  component_type TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  distance_miles NUMERIC,
  pace_per_mile TEXT,
  rounds INTEGER,
  intensity INTEGER DEFAULT 5 CHECK (intensity BETWEEN 1 AND 10),
  heart_rate_avg INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Weekly targets
CREATE TABLE IF NOT EXISTS weekly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  sc_sessions INTEGER DEFAULT 3,
  running_sessions INTEGER DEFAULT 2,
  road_work_sessions INTEGER DEFAULT 2,
  boxing_sessions INTEGER DEFAULT 3,
  conditioning_sessions INTEGER DEFAULT 0,
  recovery_sessions INTEGER DEFAULT 1,
  total_weekly_load_cap INTEGER DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE weekly_targets
  ADD COLUMN IF NOT EXISTS road_work_sessions INTEGER DEFAULT 2;

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE weekly_schedule_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_targets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users own weekly_schedule_template" ON weekly_schedule_template
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users own scheduled_activities" ON scheduled_activities
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users own activity_log" ON activity_log
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users own weekly_targets" ON weekly_targets
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_scheduled_activities_user_date
  ON scheduled_activities(user_id, date);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_date
  ON activity_log(user_id, date);

CREATE INDEX IF NOT EXISTS idx_weekly_template_user
  ON weekly_schedule_template(user_id, day_of_week);
