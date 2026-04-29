import { supabase } from '../supabase';
import { GymProfileRow, EquipmentItem } from '../engine/types';
import { withEngineInvalidation } from './engineInvalidation';

// ─── Gym Profile CRUD ────────────────────────────────────────

/**
 * Get all gym profiles for a user.
 */
export async function getGymProfiles(userId: string): Promise<GymProfileRow[]> {
    const { data, error } = await supabase
        .from('gym_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

    if (error) throw error;
    return (data ?? []) as GymProfileRow[];
}

/**
 * Get the user's default gym profile, or null if none set.
 */
export async function getDefaultGymProfile(userId: string): Promise<GymProfileRow | null> {
    const { data, error } = await supabase
        .from('gym_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data as GymProfileRow | null;
}

/**
 * Create a new gym profile.
 */
export async function createGymProfile(
    userId: string,
    profile: { name: string; equipment: EquipmentItem[]; is_default?: boolean },
): Promise<GymProfileRow> {
    return withEngineInvalidation({ userId, reason: 'gym_profile_create' }, async () => {
        // If setting as default, unset other defaults first
        if (profile.is_default) {
            await supabase
                .from('gym_profiles')
                .update({ is_default: false })
                .eq('user_id', userId)
                .eq('is_default', true);
        }

        const { data, error } = await supabase
            .from('gym_profiles')
            .insert({
                user_id: userId,
                name: profile.name,
                equipment: profile.equipment,
                is_default: profile.is_default ?? false,
            })
            .select()
            .single();

        if (error) throw error;
        return data as GymProfileRow;
    });
}

async function getGymProfileUserId(profileId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('gym_profiles')
        .select('user_id')
        .eq('id', profileId)
        .maybeSingle();

    if (error) throw error;
    return data?.user_id ?? null;
}

/**
 * Update an existing gym profile.
 */
export async function updateGymProfile(
    profileId: string,
    updates: Partial<Pick<GymProfileRow, 'name' | 'equipment' | 'is_default'>>,
): Promise<GymProfileRow> {
    const userId = await getGymProfileUserId(profileId);
    const mutation = async () => {
        const { data, error } = await supabase
            .from('gym_profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', profileId)
            .select()
            .single();

        if (error) throw error;
        return data as GymProfileRow;
    };

    return userId
        ? withEngineInvalidation({ userId, reason: 'gym_profile_update' }, mutation)
        : mutation();
}

/**
 * Delete a gym profile.
 */
export async function deleteGymProfile(profileId: string): Promise<void> {
    const userId = await getGymProfileUserId(profileId);
    const mutation = async () => {
        const { error } = await supabase
            .from('gym_profiles')
            .delete()
            .eq('id', profileId);

        if (error) throw error;
    };

    if (!userId) {
        await mutation();
        return;
    }

    return withEngineInvalidation({ userId, reason: 'gym_profile_delete' }, mutation);
}

/**
 * Set a gym profile as the default (unsets all others for the user).
 */
export async function setDefaultGymProfile(
    userId: string,
    profileId: string,
): Promise<void> {
    return withEngineInvalidation({ userId, reason: 'gym_profile_default_update' }, async () => {
        // Unset current defaults
        await supabase
            .from('gym_profiles')
            .update({ is_default: false })
            .eq('user_id', userId)
            .eq('is_default', true);

        // Set new default
        const { error } = await supabase
            .from('gym_profiles')
            .update({ is_default: true, updated_at: new Date().toISOString() })
            .eq('id', profileId);

        if (error) throw error;
    });
}
