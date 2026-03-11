import { supabase } from '../supabase';
import { FitnessLevel, FitnessAssessmentInput, FitnessAssessmentResult } from '../engine/types';
import { assessFitnessFromQuestionnaire } from '../engine/calculateFitness';

export interface FitnessProfileRow {
    user_id: string;
    fitness_level: FitnessLevel;
    fitness_score: number;
    updated_at: string;
}

/**
 * Fetch the user's current fitness profile.
 * Falls back to 'intermediate' if not set.
 */
export async function getFitnessProfile(userId: string): Promise<FitnessProfileRow> {
    const { data: profile, error } = await supabase
        .from('athlete_profiles')
        .select('fitness_level, fitness_score, updated_at')
        .eq('user_id', userId)
        .single();

    if (error || !profile) {
        return {
            user_id: userId,
            fitness_level: 'intermediate',
            fitness_score: 50,
            updated_at: new Date().toISOString()
        };
    }

    return {
        user_id: userId,
        fitness_level: (profile.fitness_level as FitnessLevel) || 'intermediate',
        fitness_score: profile.fitness_score || 50,
        updated_at: profile.updated_at
    };
}

/**
 * Submit a fitness questionnaire, calculate the result, and save it to the DB.
 */
export async function submitFitnessQuestionnaire(
    userId: string,
    input: FitnessAssessmentInput
): Promise<FitnessAssessmentResult> {
    // 1. Calculate fitness level using the pure engine
    const result = assessFitnessFromQuestionnaire(input);

    // 2. Save result to athlete_profiles
    const { error: profileError } = await supabase
        .from('athlete_profiles')
        .update({
            fitness_level: result.level,
            fitness_score: result.compositeScore,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

    if (profileError) {
        console.error('Failed to update fitness level:', profileError);
        throw profileError;
    }

    // 3. Optional: save raw questionnaire results to a history table if desired
    // Example: await supabase.from('fitness_assessments').insert({...})

    return result;
}

/**
 * Update the fitness level directly (e.g., from the history-based engine).
 */
export async function updateFitnessLevel(
    userId: string,
    level: FitnessLevel,
    score: number
): Promise<void> {
    const { error } = await supabase
        .from('athlete_profiles')
        .update({
            fitness_level: level,
            fitness_score: score,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

    if (error) throw error;
}
