import { supabase } from '../supabase';
import { WeightDataPoint } from '../engine/types';
import { formatLocalDate, todayLocalDate } from '../utils/date';
import { logError } from '../utils/logger';

/**
 * Fetch weight history from daily_checkins (non-null morning_weight entries).
 * Returns sorted ascending by date.
 */
export async function getWeightHistory(
    userId: string,
    days: number = 90
): Promise<WeightDataPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = formatLocalDate(startDate);

    const { data, error } = await supabase
        .from('daily_checkins')
        .select('date, morning_weight')
        .eq('user_id', userId)
        .gte('date', startStr)
        .not('morning_weight', 'is', null)
        .order('date', { ascending: true });

    if (error) {
        logError('weightService.getWeightHistory', error);
        return [];
    }

    return (data ?? []).map(row => ({
        date: row.date,
        weight: Number(row.morning_weight),
    }));
}

/**
 * Get the most recent morning weight entry.
 */
export async function getLatestWeight(
    userId: string
): Promise<{ weight: number; date: string } | null> {
    const { data, error } = await supabase
        .from('daily_checkins')
        .select('date, morning_weight')
        .eq('user_id', userId)
        .not('morning_weight', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;

    return {
        weight: Number(data.morning_weight),
        date: data.date,
    };
}

/**
 * Get the "effective" weight — the best available weight for today.
 * Priority: today's morning_weight > latest morning_weight > fallback base_weight.
 */
export async function getEffectiveWeight(
    userId: string,
    fallbackBaseWeight: number
): Promise<number> {
    const todayStr = todayLocalDate();

    // Try today's check-in first
    const { data: todayCheckin } = await supabase
        .from('daily_checkins')
        .select('morning_weight')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .not('morning_weight', 'is', null)
        .maybeSingle();

    if (todayCheckin?.morning_weight) {
        return Number(todayCheckin.morning_weight);
    }

    // Fall back to most recent weight
    const latest = await getLatestWeight(userId);
    if (latest) return latest.weight;

    // Ultimate fallback: onboarding base weight
    return fallbackBaseWeight;
}

