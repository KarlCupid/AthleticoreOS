import { supabase } from '../supabase';

export type FirstRunGuidanceStatus = 'pending' | 'completed';

export interface FirstRunGuidanceProgress {
  checkinDone: boolean;
  workoutDone: boolean;
  nutritionDone: boolean;
  completedCount: number;
  totalCount: number;
}

export interface FirstRunGuidanceState {
  status: FirstRunGuidanceStatus;
  introSeenAt: string | null;
  progress: FirstRunGuidanceProgress;
}

interface GuidanceProfileRow {
  first_run_guidance_status: string | null;
  first_run_guidance_intro_seen_at: string | null;
}

async function hasAnyRow(table: 'daily_checkins' | 'training_sessions' | 'food_log', userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .limit(1);

  if (error) throw error;
  return (count ?? 0) > 0;
}

function normalizeStatus(raw: string | null | undefined): FirstRunGuidanceStatus {
  return raw === 'completed' ? 'completed' : 'pending';
}

export async function getFirstRunGuidanceState(userId: string): Promise<FirstRunGuidanceState> {
  const { data: profile, error: profileError } = await supabase
    .from('athlete_profiles')
    .select('first_run_guidance_status, first_run_guidance_intro_seen_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const [checkinDone, workoutDone, nutritionDone] = await Promise.all([
    hasAnyRow('daily_checkins', userId),
    hasAnyRow('training_sessions', userId),
    hasAnyRow('food_log', userId),
  ]);

  const completedCount = [checkinDone, workoutDone, nutritionDone].filter(Boolean).length;

  return {
    status: normalizeStatus((profile as GuidanceProfileRow | null)?.first_run_guidance_status),
    introSeenAt: (profile as GuidanceProfileRow | null)?.first_run_guidance_intro_seen_at ?? null,
    progress: {
      checkinDone,
      workoutDone,
      nutritionDone,
      completedCount,
      totalCount: 3,
    },
  };
}

export async function markFirstRunGuidanceIntroSeen(userId: string): Promise<void> {
  const { error } = await supabase
    .from('athlete_profiles')
    .update({
      first_run_guidance_intro_seen_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function markFirstRunGuidanceCompleted(userId: string): Promise<void> {
  const { error } = await supabase
    .from('athlete_profiles')
    .update({
      first_run_guidance_status: 'completed',
    })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function resetFirstRunGuidance(userId: string): Promise<void> {
  const { error } = await supabase
    .from('athlete_profiles')
    .update({
      first_run_guidance_status: 'pending',
      first_run_guidance_intro_seen_at: null,
    })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getAndSyncFirstRunGuidanceState(userId: string): Promise<FirstRunGuidanceState> {
  const state = await getFirstRunGuidanceState(userId);
  const isComplete = state.progress.completedCount >= state.progress.totalCount;

  if (state.status === 'pending' && isComplete) {
    await markFirstRunGuidanceCompleted(userId);
    return { ...state, status: 'completed' };
  }

  return state;
}
