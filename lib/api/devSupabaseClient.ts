import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, todayLocalDate } from '../utils/date';
import {
  clearActiveDevAuthAccount,
  getActiveDevAuthAccountSnapshot,
  getActiveDevAuthSessionSnapshot,
  type DevAuthAccount,
} from './devAuthService';

type Row = Record<string, any>;
type QueryResult<T = unknown> = {
  data: T | null;
  error: any | null;
  count?: number | null;
  status?: number;
  statusText?: string;
};
type Filter = {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'is' | 'not' | 'in' | 'ilike';
  value: unknown;
  notOperator?: string;
};
type SortRule = { column: string; ascending: boolean };
type DevTableStore = Record<string, Row[]>;

const DEV_MUTATION_TABLES_WITH_GENERATED_IDS = new Set([
  'activity_log',
  'body_mass_safety_checks',
  'daily_checkins',
  'daily_nutrition_summary',
  'favorite_foods',
  'food_items',
  'food_log',
  'gym_profiles',
  'hydration_log',
  'macro_ledger',
  'recurring_activities',
  'scheduled_activities',
  'training_sessions',
  'user_walkthrough_state',
  'weekly_plan_config',
  'weekly_plan_entries',
]);

let activeStoreKey: string | null = null;
let activeStore: DevTableStore = {};
let generatedIdCounter = 0;

function weekStartFor(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

function generatedId(table: string): string {
  generatedIdCounter += 1;
  return `dev-${table}-${generatedIdCounter}`;
}

function withId(table: string, row: Row): Row {
  if (row.id || !DEV_MUTATION_TABLES_WITH_GENERATED_IDS.has(table)) {
    return row;
  }

  return { id: generatedId(table), ...row };
}

function readyAthleteProfile(account: DevAuthAccount, today: string): Row {
  return {
    id: 'dev-athlete-profile-ready',
    user_id: account.userId,
    coach_id: null,
    gym_id: null,
    sport: 'boxing',
    biological_sex: 'male',
    fight_status: 'amateur',
    phase: 'off-season',
    target_weight: 152,
    base_weight: 156,
    fight_date: addDays(today, 84),
    cycle_tracking: false,
    cycle_day: null,
    fitness_level: 'intermediate',
    fitness_score: null,
    height_inches: 69,
    age: 24,
    activity_level: 'very_active',
    nutrition_goal: 'maintain',
    coach_protein_override: null,
    coach_carbs_override: null,
    coach_fat_override: null,
    coach_calories_override: null,
    athlete_goal_mode: 'build_phase',
    performance_goal_type: 'conditioning',
    planning_setup_version: 0,
    first_run_guidance_status: 'pending',
    first_run_guidance_intro_seen_at: null,
    training_age: 'intermediate',
    active_weight_class_plan_id: null,
    updated_at: nowIso(),
  };
}

function dailyCheckins(account: DevAuthAccount, today: string): Row[] {
  const weights = [156.8, 156.4, 156.1, 155.9, 155.6, 155.3, 155.1];
  return weights.map((weight, index) => ({
    id: `dev-checkin-${index}`,
    user_id: account.userId,
    date: addDays(today, index - 6),
    morning_weight: weight,
    sleep_quality: index === weights.length - 1 ? 4 : 3 + (index % 2),
    readiness: index === weights.length - 1 ? 4 : 3,
    stress_level: 2,
    soreness_level: index === weights.length - 1 ? 2 : 3,
    confidence_level: 4,
    energy_level: index === weights.length - 1 ? 4 : 3,
    pain_level: 1,
    readiness_score: index === weights.length - 1 ? 78 : null,
    checkin_version: 2,
    macro_adherence: 'Close Enough',
    coach_debrief: null,
    primary_limiter: null,
  }));
}

function trainingSessions(account: DevAuthAccount, today: string): Row[] {
  return [
    { date: addDays(today, -1), duration_minutes: 75, intensity_srpe: 7 },
    { date: addDays(today, -3), duration_minutes: 60, intensity_srpe: 6 },
    { date: addDays(today, -5), duration_minutes: 90, intensity_srpe: 7 },
    { date: addDays(today, -8), duration_minutes: 45, intensity_srpe: 5 },
  ].map((session, index) => ({
    id: `dev-training-session-${index}`,
    user_id: account.userId,
    ...session,
    total_load: session.duration_minutes * session.intensity_srpe,
  }));
}

function weeklyPlanEntries(account: DevAuthAccount, today: string): Row[] {
  const weekStart = weekStartFor(today);
  return [
    {
      id: 'dev-weekly-plan-entry-today',
      user_id: account.userId,
      week_start_date: weekStart,
      day_of_week: new Date(`${today}T00:00:00`).getDay(),
      date: today,
      slot: 'single',
      day_order: 0,
      session_type: 'sc',
      focus: 'conditioning',
      session_family: 'conditioning',
      sc_session_family: 'tempo',
      placement_source: 'generated',
      progression_intent: 'Build repeatable engine support around protected boxing.',
      carry_forward_reason: null,
      session_modules: null,
      dose_credits: null,
      dose_summary: null,
      realized_dose_buckets: null,
      estimated_duration_min: 45,
      target_intensity: 6,
      status: 'planned',
      rescheduled_to: null,
      workout_log_id: null,
      scheduled_activity_id: null,
      prescription_snapshot: null,
      engine_notes: 'Dev local plan entry.',
      is_deload: false,
      created_at: nowIso(),
    },
    {
      id: 'dev-weekly-plan-entry-boxing',
      user_id: account.userId,
      week_start_date: weekStart,
      day_of_week: new Date(`${addDays(today, 1)}T00:00:00`).getDay(),
      date: addDays(today, 1),
      slot: 'pm',
      day_order: 1,
      session_type: 'boxing_practice',
      focus: 'sport_specific',
      session_family: 'boxing_skill',
      sc_session_family: null,
      placement_source: 'locked',
      progression_intent: 'Protected coach-led boxing anchor.',
      carry_forward_reason: null,
      session_modules: null,
      dose_credits: null,
      dose_summary: null,
      realized_dose_buckets: null,
      estimated_duration_min: 90,
      target_intensity: 7,
      status: 'planned',
      rescheduled_to: null,
      workout_log_id: null,
      scheduled_activity_id: 'dev-scheduled-boxing-tomorrow',
      prescription_snapshot: null,
      engine_notes: 'Protected workout remains anchored.',
      is_deload: false,
      created_at: nowIso(),
    },
  ];
}

function scheduledActivities(account: DevAuthAccount, today: string): Row[] {
  return [
    {
      id: 'dev-scheduled-boxing-today',
      recurring_activity_id: 'dev-recurring-boxing',
      weekly_plan_entry_id: null,
      user_id: account.userId,
      date: today,
      activity_type: 'boxing_practice',
      custom_label: 'Boxing practice',
      start_time: '18:30:00',
      estimated_duration_min: 90,
      expected_intensity: 7,
      session_components: [],
      source: 'template',
      status: 'scheduled',
      actual_duration_min: null,
      actual_rpe: null,
      notes: null,
      engine_recommendation: null,
      session_kind: 'boxing_practice',
      rounds: null,
      round_duration_sec: null,
      rest_duration_sec: null,
      athlete_locked: true,
      intended_intensity: 7,
      constraint_tier: 'mandatory',
    },
    {
      id: 'dev-scheduled-boxing-tomorrow',
      recurring_activity_id: 'dev-recurring-boxing',
      weekly_plan_entry_id: 'dev-weekly-plan-entry-boxing',
      user_id: account.userId,
      date: addDays(today, 1),
      activity_type: 'boxing_practice',
      custom_label: 'Boxing practice',
      start_time: '18:30:00',
      estimated_duration_min: 90,
      expected_intensity: 7,
      session_components: [],
      source: 'template',
      status: 'scheduled',
      actual_duration_min: null,
      actual_rpe: null,
      notes: null,
      engine_recommendation: null,
      session_kind: 'boxing_practice',
      rounds: null,
      round_duration_sec: null,
      rest_duration_sec: null,
      athlete_locked: true,
      intended_intensity: 7,
      constraint_tier: 'mandatory',
    },
  ];
}

function buildDevRows(account: DevAuthAccount): DevTableStore {
  const today = todayLocalDate();
  const ready = account.entryStatus === 'ready';
  const createdAt = '2026-01-01T00:00:00.000Z';
  const foodItem = {
    id: 'dev-food-rice-bowl',
    user_id: null,
    source: 'custom',
    external_id: null,
    name: 'Chicken rice bowl',
    brand: 'Dev fixture',
    serving_size_g: 420,
    serving_label: '1 bowl',
    calories_per_serving: 610,
    protein_per_serving: 42,
    carbs_per_serving: 74,
    fat_per_serving: 16,
    is_supplement: false,
    verified: true,
    created_at: createdAt,
  };

  return {
    users: [{
      id: account.userId,
      email: account.email,
      role: 'athlete',
    }],
    athlete_profiles: ready ? [readyAthleteProfile(account, today)] : [],
    daily_checkins: ready ? dailyCheckins(account, today) : [],
    training_sessions: ready ? trainingSessions(account, today) : [],
    recurring_activities: ready ? [{
      id: 'dev-recurring-boxing',
      user_id: account.userId,
      activity_type: 'boxing_practice',
      custom_label: 'Boxing practice',
      start_time: '18:30:00',
      estimated_duration_min: 90,
      expected_intensity: 7,
      session_components: [],
      recurrence: { frequency: 'weekly', interval: 1, days_of_week: [1, 3, 5] },
      is_active: true,
      session_kind: 'boxing_practice',
      rounds: null,
      round_duration_sec: null,
      rest_duration_sec: null,
      athlete_locked: true,
      intended_intensity: 7,
      constraint_tier: 'mandatory',
      notes: null,
    }] : [],
    scheduled_activities: ready ? scheduledActivities(account, today) : [],
    weekly_targets: ready ? [{
      id: 'dev-weekly-targets',
      user_id: account.userId,
      sc_sessions: 2,
      running_sessions: 0,
      road_work_sessions: 2,
      boxing_sessions: 3,
      conditioning_sessions: 1,
      recovery_sessions: 1,
      total_weekly_load_cap: 4000,
    }] : [],
    weekly_plan_config: ready ? [{
      id: 'dev-weekly-plan-config',
      user_id: account.userId,
      available_days: [1, 3, 5],
      availability_windows: [
        { dayOfWeek: 1, startTime: '17:00', endTime: '20:00' },
        { dayOfWeek: 3, startTime: '17:00', endTime: '20:00' },
        { dayOfWeek: 5, startTime: '17:00', endTime: '20:00' },
      ],
      session_duration_min: 75,
      allow_two_a_days: false,
      two_a_day_days: [],
      am_session_type: 'sc',
      pm_session_type: 'boxing_practice',
      preferred_gym_profile_id: 'dev-gym-profile',
      auto_deload_interval_weeks: 5,
      created_at: createdAt,
      updated_at: nowIso(),
    }] : [],
    weekly_plan_entries: ready ? weeklyPlanEntries(account, today) : [],
    gym_profiles: ready ? [{
      id: 'dev-gym-profile',
      user_id: account.userId,
      name: 'Default training equipment',
      equipment: ['dumbbell', 'kettlebell', 'barbell', 'medicine_ball', 'track_or_road', 'open_space'],
      is_default: true,
      created_at: createdAt,
      updated_at: nowIso(),
    }] : [],
    build_phase_goals: ready ? [{
      id: 'dev-build-phase-goal',
      user_id: account.userId,
      goal_type: 'conditioning',
      goal_label: 'Conditioning build',
      goal_statement: 'Build repeatable round-to-round conditioning while protecting boxing practice.',
      primary_outcome: 'Improve repeat-effort capacity',
      secondary_constraint: 'protect_recovery',
      success_window: null,
      target_metric: 'training_consistency',
      target_value: null,
      target_unit: null,
      target_date: null,
      target_horizon_weeks: 8,
      status: 'active',
      created_at: createdAt,
      updated_at: nowIso(),
    }] : [],
    fight_camps: [],
    weight_class_plans: [],
    body_mass_safety_checks: [],
    weight_class_history: [],
    macro_ledger: ready ? [{
      id: 'dev-macro-ledger',
      user_id: account.userId,
      date: today,
      base_tdee: 2860,
      prescribed_calories: 2860,
      prescribed_protein: 168,
      prescribed_carbs: 356,
      prescribed_fats: 79,
      weight_correction_deficit: 0,
      target_source: 'unified_performance',
      actual_calories: 1320,
      actual_protein: 76,
      actual_carbs: 158,
      actual_fat: 36,
    }] : [],
    food_items: [foodItem],
    food_log: ready ? [{
      id: 'dev-food-log-1',
      user_id: account.userId,
      food_item_id: foodItem.id,
      food_items: foodItem,
      date: today,
      meal_type: 'lunch',
      servings: 1,
      amount_value: 1,
      amount_unit: 'serving',
      grams: 420,
      source: 'custom',
      nutrition_snapshot: null,
      logged_calories: 610,
      logged_protein: 42,
      logged_carbs: 74,
      logged_fat: 16,
      created_at: nowIso(),
    }] : [],
    hydration_log: ready ? [{
      id: 'dev-hydration-1',
      user_id: account.userId,
      date: today,
      amount_oz: 32,
      created_at: nowIso(),
    }] : [],
    daily_nutrition_summary: ready ? [{
      id: 'dev-nutrition-summary',
      user_id: account.userId,
      date: today,
      total_calories: 610,
      total_protein: 42,
      total_carbs: 74,
      total_fat: 16,
      total_water_oz: 32,
      meal_count: 1,
    }] : [],
    activity_log: [],
    workout_log: [],
    workout_set_log: [],
    workout_effort_log: [],
    exercise_library: [],
    user_walkthrough_state: [],
    generated_workouts: [],
    generated_workout_exercises: [],
    generated_workout_session_lifecycle: [],
    workout_completions: [],
    exercise_completion_results: [],
    user_programs: [],
    user_training_profiles: [],
    user_equipment: [],
    user_constraints: [],
    user_safety_flags: [],
    user_readiness_logs: [],
    recommendation_events: [],
  };
}

function getActiveStore(): DevTableStore | null {
  const account = getActiveDevAuthAccountSnapshot();
  if (!account) return null;

  if (activeStoreKey !== account.key) {
    activeStoreKey = account.key;
    activeStore = buildDevRows(account);
  }

  return activeStore;
}

function readTable(table: string): Row[] {
  return [...(getActiveStore()?.[table] ?? [])];
}

function writeTable(table: string, rows: Row[]): void {
  const store = getActiveStore();
  if (!store) return;
  store[table] = rows;
}

function valueFor(row: Row, column: string): unknown {
  return column.split('.').reduce<unknown>((current, part) => (
    current && typeof current === 'object' ? (current as Row)[part] : undefined
  ), row);
}

function compareValues(left: unknown, right: unknown): number {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  return String(left).localeCompare(String(right), undefined, { numeric: true });
}

function matchesFilter(row: Row, filter: Filter): boolean {
  const current = valueFor(row, filter.column);
  switch (filter.operator) {
    case 'eq':
      return current === filter.value;
    case 'neq':
      return current !== filter.value;
    case 'gt':
      return compareValues(current, filter.value) > 0;
    case 'gte':
      return compareValues(current, filter.value) >= 0;
    case 'lt':
      return compareValues(current, filter.value) < 0;
    case 'lte':
      return compareValues(current, filter.value) <= 0;
    case 'is':
      return filter.value === null ? current == null : current === filter.value;
    case 'not':
      if (filter.notOperator === 'is' && filter.value === null) {
        return current != null;
      }
      return current !== filter.value;
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(current);
    case 'ilike': {
      const pattern = String(filter.value ?? '').replace(/^%|%$/g, '').toLowerCase();
      return String(current ?? '').toLowerCase().includes(pattern);
    }
    default:
      return true;
  }
}

function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  return rows.filter((row) => filters.every((filter) => matchesFilter(row, filter)));
}

function applyOrder(rows: Row[], orders: SortRule[]): Row[] {
  if (orders.length === 0) return rows;

  return [...rows].sort((left, right) => {
    for (const order of orders) {
      const delta = compareValues(valueFor(left, order.column), valueFor(right, order.column));
      if (delta !== 0) {
        return order.ascending ? delta : -delta;
      }
    }
    return 0;
  });
}

function normalizePayload(payload: Row | Row[]): Row[] {
  return Array.isArray(payload) ? payload : [payload];
}

function conflictColumns(onConflict: unknown): string[] {
  return typeof onConflict === 'string'
    ? onConflict.split(',').map((column) => column.trim()).filter(Boolean)
    : ['id'];
}

class DevPostgrestBuilder implements PromiseLike<QueryResult<any>> {
  private action: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;
  private selectedHead = false;
  private selectedCount: 'exact' | null = null;
  private filters: Filter[] = [];
  private orders: SortRule[] = [];
  private limitCount: number | null = null;
  private upsertConflictColumns: string[] = ['id'];

  constructor(private readonly table: string) {}

  select(_columns?: string, options?: { count?: 'exact'; head?: boolean }): this {
    this.selectedHead = options?.head === true;
    this.selectedCount = options?.count === 'exact' ? 'exact' : null;
    return this;
  }

  insert(payload: Row | Row[]): this {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  upsert(payload: Row | Row[], options?: { onConflict?: string }): this {
    this.action = 'upsert';
    this.payload = payload;
    this.upsertConflictColumns = conflictColumns(options?.onConflict);
    return this;
  }

  update(payload: Row): this {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'gt', value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lt(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'lt', value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'is', value });
    return this;
  }

  not(column: string, operator: string, value: unknown): this {
    this.filters.push({ column, operator: 'not', value, notOperator: operator });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  ilike(column: string, value: string): this {
    this.filters.push({ column, operator: 'ilike', value });
    return this;
  }

  or(_query: string): this {
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): this {
    this.limitCount = Math.max(0, to - from + 1);
    return this;
  }

  abortSignal(_signal: AbortSignal): this {
    return this;
  }

  single(): Promise<QueryResult<Row | null>> {
    return this.executeSingle(false);
  }

  maybeSingle(): Promise<QueryResult<Row | null>> {
    return this.executeSingle(true);
  }

  throwOnError(): this {
    return this;
  }

  returns(): this {
    return this;
  }

  then<TResult1 = QueryResult<any>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async executeSingle(allowEmpty: boolean): Promise<QueryResult<Row | null>> {
    const result = await this.execute();
    if (result.error) return result as QueryResult<Row | null>;

    const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
    if (rows.length === 0) {
      return allowEmpty
        ? { data: null, error: null, count: result.count ?? null, status: 200, statusText: 'OK' }
        : {
          data: null,
          error: { message: 'No rows returned in developer fixture store.', code: 'PGRST116' },
          count: result.count ?? null,
          status: 406,
          statusText: 'Not Acceptable',
        };
    }

    return {
      data: rows[0] ?? null,
      error: null,
      count: result.count ?? null,
      status: 200,
      statusText: 'OK',
    };
  }

  private async execute(): Promise<QueryResult<any>> {
    const rows = readTable(this.table);

    if (this.action === 'insert') {
      const inserted = normalizePayload(this.payload ?? {}).map((row) => withId(this.table, { ...row }));
      writeTable(this.table, [...rows, ...inserted]);
      return this.result(inserted);
    }

    if (this.action === 'upsert') {
      const upserts = normalizePayload(this.payload ?? {}).map((row) => withId(this.table, { ...row }));
      const nextRows = [...rows];
      for (const upsert of upserts) {
        const index = nextRows.findIndex((row) => this.upsertConflictColumns.every((column) => (
          valueFor(row, column) === valueFor(upsert, column)
        )));
        if (index >= 0) {
          nextRows[index] = { ...nextRows[index], ...upsert };
        } else {
          nextRows.push(upsert);
        }
      }
      writeTable(this.table, nextRows);
      return this.result(upserts);
    }

    if (this.action === 'update') {
      const updated: Row[] = [];
      const nextRows = rows.map((row) => {
        if (!matchesFilterList(row, this.filters)) return row;
        const next = { ...row, ...(this.payload ?? {}) };
        updated.push(next);
        return next;
      });
      writeTable(this.table, nextRows);
      return this.result(updated);
    }

    if (this.action === 'delete') {
      const deleted = applyFilters(rows, this.filters);
      writeTable(this.table, rows.filter((row) => !matchesFilterList(row, this.filters)));
      return this.result(deleted);
    }

    let selectedRows = applyFilters(rows, this.filters);
    selectedRows = applyOrder(selectedRows, this.orders);
    if (this.limitCount != null) {
      selectedRows = selectedRows.slice(0, this.limitCount);
    }
    return this.result(selectedRows);
  }

  private result(rows: Row[]): QueryResult<any> {
    const count = this.selectedCount === 'exact' ? rows.length : null;
    return {
      data: this.selectedHead ? null : rows,
      error: null,
      count,
      status: 200,
      statusText: 'OK',
    };
  }
}

function matchesFilterList(row: Row, filters: Filter[]): boolean {
  return filters.every((filter) => matchesFilter(row, filter));
}

export function installDevSupabaseClientOverrides(supabase: SupabaseClient): void {
  const client = supabase as unknown as {
    from: (table: string) => unknown;
    rpc: (fn: string, args?: unknown) => Promise<QueryResult>;
    auth: {
      getSession: (...args: unknown[]) => Promise<QueryResult<{ session: unknown | null }>>;
      getUser: (...args: unknown[]) => Promise<QueryResult<{ user: unknown | null }>>;
      signOut: (...args: unknown[]) => Promise<QueryResult<null>>;
      updateUser: (...args: unknown[]) => Promise<QueryResult<{ user: unknown | null }>>;
    };
  };

  const realFrom = client.from.bind(supabase);
  const realRpc = client.rpc.bind(supabase);
  const realGetSession = client.auth.getSession.bind(supabase.auth);
  const realGetUser = client.auth.getUser.bind(supabase.auth);
  const realSignOut = client.auth.signOut.bind(supabase.auth);
  const realUpdateUser = client.auth.updateUser.bind(supabase.auth);

  client.from = (table: string) => (
    getActiveDevAuthAccountSnapshot() ? new DevPostgrestBuilder(table) : realFrom(table)
  );

  client.rpc = async (fn: string, args?: unknown) => {
    if (!getActiveDevAuthAccountSnapshot()) {
      return realRpc(fn, args);
    }

    if (fn === 'delete_my_account') {
      await clearActiveDevAuthAccount();
    }

    return { data: null, error: null, status: 200, statusText: 'OK' };
  };

  client.auth.getSession = async (...args: unknown[]) => {
    const session = getActiveDevAuthSessionSnapshot();
    if (session) {
      return { data: { session }, error: null, status: 200, statusText: 'OK' };
    }
    return realGetSession(...args);
  };

  client.auth.getUser = async (...args: unknown[]) => {
    const session = getActiveDevAuthSessionSnapshot();
    if (session) {
      return { data: { user: session.user }, error: null, status: 200, statusText: 'OK' };
    }
    return realGetUser(...args);
  };

  client.auth.signOut = async (...args: unknown[]) => {
    if (getActiveDevAuthAccountSnapshot()) {
      await clearActiveDevAuthAccount();
      return { data: null, error: null, status: 200, statusText: 'OK' };
    }
    return realSignOut(...args);
  };

  client.auth.updateUser = async (...args: unknown[]) => {
    const session = getActiveDevAuthSessionSnapshot();
    if (session) {
      return { data: { user: session.user }, error: null, status: 200, statusText: 'OK' };
    }
    return realUpdateUser(...args);
  };
}
