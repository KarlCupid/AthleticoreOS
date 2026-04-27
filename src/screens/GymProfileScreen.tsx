import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { Card } from '../components/Card';
import EquipmentSelector from '../components/EquipmentSelector';
import {
    getGymProfiles,
    createGymProfile,
    updateGymProfile,
    deleteGymProfile,
    setDefaultGymProfile,
} from '../../lib/api/gymProfileService';
import { supabase } from '../../lib/supabase';
import { GymProfileRow, EquipmentItem } from '../../lib/engine/types';
import { logError } from '../../lib/utils/logger';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type FormMode = 'idle' | 'adding' | 'editing';

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function GymProfileScreen() {
    const insets = useSafeAreaInsets();

    const [userId, setUserId] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<GymProfileRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formMode, setFormMode] = useState<FormMode>('idle');
    const [editingProfile, setEditingProfile] = useState<GymProfileRow | null>(null);
    const [newName, setNewName] = useState('');
    const [newEquipment, setNewEquipment] = useState<string[]>([]);

    // â”€â”€â”€ Load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                await loadProfiles(session.user.id);
            }
            setLoading(false);
        })();
    }, []);

    const loadProfiles = useCallback(async (uid: string) => {
        try {
            const data = await getGymProfiles(uid);
            setProfiles(data);
        } catch (err) {
            logError('GymProfileScreen.loadProfiles', err, { userId: uid });
        }
    }, []);

    // â”€â”€â”€ Form helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function openAddForm() {
        setEditingProfile(null);
        setNewName('');
        setNewEquipment([]);
        setFormMode('adding');
    }

    function openEditForm(profile: GymProfileRow) {
        setEditingProfile(profile);
        setNewName(profile.name);
        setNewEquipment(profile.equipment as string[]);
        setFormMode('editing');
    }

    function closeForm() {
        setFormMode('idle');
        setEditingProfile(null);
        setNewName('');
        setNewEquipment([]);
    }

    // â”€â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    async function handleSave() {
        if (!userId) return;
        const trimmed = newName.trim();
        if (!trimmed) {
            Alert.alert('Name required', 'Please enter a name for this profile.');
            return;
        }

        setSaving(true);
        try {
            if (formMode === 'editing' && editingProfile) {
                await updateGymProfile(editingProfile.id, {
                    name: trimmed,
                    equipment: newEquipment as EquipmentItem[],
                });
            } else {
                await createGymProfile(userId, {
                    name: trimmed,
                    equipment: newEquipment as EquipmentItem[],
                    is_default: profiles.length === 0,
                });
            }
            await loadProfiles(userId);
            closeForm();
        } catch (err) {
            logError('GymProfileScreen.saveProfile', err, { mode: formMode });
            Alert.alert('Save failed', 'Could not save the profile. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    async function handleSetDefault(profile: GymProfileRow) {
        if (!userId) return;
        try {
            await setDefaultGymProfile(userId, profile.id);
            await loadProfiles(userId);
        } catch (err) {
            logError('GymProfileScreen.setDefaultProfile', err, { profileId: profile.id });
            Alert.alert('Error', 'Could not set default profile.');
        }
    }

    function handleDelete(profile: GymProfileRow) {
        Alert.alert(
            'Delete Profile',
            `Delete "${profile.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteGymProfile(profile.id);
                            if (userId) await loadProfiles(userId);
                        } catch (err) {
                            logError('GymProfileScreen.deleteProfile', err, { profileId: profile.id });
                            Alert.alert('Error', 'Could not delete the profile.');
                        }
                    },
                },
            ],
        );
    }

    // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    const isFormOpen = formMode !== 'idle';

    return (
        <SafeAreaView style={[styles.root, { paddingTop: insets.top }]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* â”€â”€ Header â”€â”€ */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Gym Profiles</Text>
                    {!isFormOpen && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={openAddForm}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.addButtonText}>+ Add New</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + SPACING.xl },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* â”€â”€ Profile list â”€â”€ */}
                    {!isFormOpen && (
                        <>
                            {profiles.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyIcon}>ðŸ‹ï¸</Text>
                                    <Text style={styles.emptyTitle}>No gym profiles yet</Text>
                                    <Text style={styles.emptySubtitle}>
                                        Add one to get equipment-aware workouts.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.emptyAddButton}
                                        onPress={openAddForm}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={styles.emptyAddButtonText}>Create First Profile</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                profiles.map((profile) => (
                                    <ProfileCard
                                        key={profile.id}
                                        profile={profile}
                                        onSetDefault={() => handleSetDefault(profile)}
                                        onEdit={() => openEditForm(profile)}
                                        onDelete={() => handleDelete(profile)}
                                    />
                                ))
                            )}
                        </>
                    )}

                    {/* â”€â”€ Add / Edit form â”€â”€ */}
                    {isFormOpen && (
                        <ProfileForm
                            mode={formMode}
                            name={newName}
                            equipment={newEquipment}
                            saving={saving}
                            onNameChange={setNewName}
                            onEquipmentChange={setNewEquipment}
                            onSave={handleSave}
                            onCancel={closeForm}
                        />
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// â”€â”€â”€ ProfileCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ProfileCardProps {
    profile: GymProfileRow;
    onSetDefault: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function ProfileCard({ profile, onSetDefault, onEdit, onDelete }: ProfileCardProps) {
    return (
        <Card style={styles.profileCard}>
            {/* Top row */}
            <View style={styles.profileCardHeader}>
                <View style={styles.profileCardLeft}>
                    <Text style={styles.profileName}>{profile.name}</Text>
                    <Text style={styles.profileEquipmentCount}>
                        {profile.equipment.length} item{profile.equipment.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                {profile.is_default && (
                    <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                )}
            </View>

            {/* Action row */}
            <View style={styles.profileCardActions}>
                {!profile.is_default && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonOutline]}
                        onPress={onSetDefault}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.actionButtonOutlineText}>Set Default</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonOutline]}
                    onPress={onEdit}
                    activeOpacity={0.7}
                >
                    <Text style={styles.actionButtonOutlineText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDestructive]}
                    onPress={onDelete}
                    activeOpacity={0.7}
                >
                    <Text style={styles.actionButtonDestructiveText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </Card>
    );
}

// â”€â”€â”€ ProfileForm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ProfileFormProps {
    mode: FormMode;
    name: string;
    equipment: string[];
    saving: boolean;
    onNameChange: (val: string) => void;
    onEquipmentChange: (items: string[]) => void;
    onSave: () => void;
    onCancel: () => void;
}

function ProfileForm({
    mode,
    name,
    equipment,
    saving,
    onNameChange,
    onEquipmentChange,
    onSave,
    onCancel,
}: ProfileFormProps) {
    return (
        <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
                {mode === 'editing' ? 'Edit Profile' : 'New Gym Profile'}
            </Text>

            {/* Name input */}
            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Profile Name</Text>
                <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={onNameChange}
                    placeholder="e.g. Home Gym, Main Gym, Hotel"
                    placeholderTextColor={COLORS.text.tertiary}
                    autoFocus={mode === 'adding'}
                    maxLength={60}
                />
            </View>

            {/* Equipment selector */}
            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Equipment Available</Text>
                <Text style={styles.fieldHint}>
                    Workouts will be filtered to what you have access to.
                </Text>
                <View style={styles.equipmentSelectorWrapper}>
                    <EquipmentSelector
                        selected={equipment}
                        onChange={onEquipmentChange}
                    />
                </View>
            </View>

            {/* Buttons */}
            <View style={styles.formButtons}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onCancel}
                    activeOpacity={0.7}
                    disabled={saving}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={onSave}
                    activeOpacity={0.75}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#F5F5F0" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Profile</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    flex: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.sm,
        backgroundColor: COLORS.background,
    },
    headerTitle: {
        fontSize: 26,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        letterSpacing: 0,
    },
    addButton: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm - 2,
        borderRadius: RADIUS.full,
    },
    addButtonText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: '#F5F5F0',
    },

    // Scroll
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        gap: SPACING.md,
    },

    // Profile card
    profileCard: {
        marginBottom: 0,
    },
    profileCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    profileCardLeft: {
        flex: 1,
    },
    profileName: {
        fontSize: 17,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    profileEquipmentCount: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    defaultBadge: {
        backgroundColor: COLORS.accentLight,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 3,
        marginLeft: SPACING.sm,
    },
    defaultBadgeText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },
    profileCardActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
        flexWrap: 'wrap',
    },
    actionButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm - 2,
        borderRadius: RADIUS.full,
    },
    actionButtonOutline: {
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    actionButtonOutlineText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    actionButtonDestructive: {
        borderWidth: 1.5,
        borderColor: `${COLORS.error}44`,
        backgroundColor: `${COLORS.error}18`,
    },
    actionButtonDestructiveText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.error,
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xl * 2,
        paddingHorizontal: SPACING.lg,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: SPACING.md,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SPACING.xl,
    },
    emptyAddButton: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md - 2,
        borderRadius: RADIUS.full,
    },
    emptyAddButtonText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#F5F5F0',
    },

    // Form
    formContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.card,
    },
    formTitle: {
        fontSize: 20,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        marginBottom: SPACING.lg,
        letterSpacing: 0,
    },
    fieldGroup: {
        marginBottom: SPACING.lg,
    },
    fieldLabel: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm - 2,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    fieldHint: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
        lineHeight: 18,
    },
    textInput: {
        height: 48,
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
    },
    equipmentSelectorWrapper: {
        minHeight: 200,
    },
    formButtons: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cancelButtonText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    saveButton: {
        flex: 2,
        height: 48,
        backgroundColor: COLORS.accent,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#F5F5F0',
    },
});
