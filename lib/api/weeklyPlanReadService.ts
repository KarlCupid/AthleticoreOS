import { supabase } from '../supabase';
import type { WeeklyPlanEntryRow } from '../engine/types';

export async function getWeeklyPlanEntriesForWeek(
  userId: string,
  weekStart: string,
): Promise<WeeklyPlanEntryRow[]> {
  const { data, error } = await supabase
    .from('weekly_plan_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStart)
    .order('date')
    .order('slot');

  if (error) throw error;
  return (data ?? []) as WeeklyPlanEntryRow[];
}

export async function getWeeklyPlanEntriesForRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<WeeklyPlanEntryRow[]> {
  const { data, error } = await supabase
    .from('weekly_plan_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
    .order('slot');

  if (error) throw error;
  return (data ?? []) as WeeklyPlanEntryRow[];
}
