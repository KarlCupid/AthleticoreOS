import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { Card } from '../components/Card';
import { IconChevronLeft } from '../components/icons';
import { createCustomExercise } from '../../lib/api/scService';
import { supabase } from '../../lib/supabase';
import { ExerciseType, MuscleGroup, Equipment } from '../../lib/engine/types';

const TYPES: { value: ExerciseType; label: string }[] = [
    { value: 'heavy_lift', label: 'Heavy Lift' },
    { value: 'power', label: 'Power / Explosive' },
    { value: 'sport_specific', label: 'Sport Specific' },
    { value: 'conditioning', label: 'Conditioning' },
    { value: 'mobility', label: 'Mobility' },
    { value: 'active_recovery', label: 'Active Recovery' },
];

const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'quads', label: 'Quads' },
    { value: 'hamstrings', label: 'Hamstrings' },
    { value: 'glutes', label: 'Glutes' },
    { value: 'arms', label: 'Arms' },
    { value: 'core', label: 'Core' },
    { value: 'full_body', label: 'Full Body' },
    { value: 'neck', label: 'Neck' },
    { value: 'calves', label: 'Calves' },
];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
    { value: 'barbell', label: 'Barbell' },
    { value: 'dumbbell', label: 'Dumbbell' },
    { value: 'kettlebell', label: 'Kettlebell' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'cable', label: 'Cable' },
    { value: 'machine', label: 'Machine' },
    { value: 'band', label: 'Band' },
    { value: 'medicine_ball', label: 'Med Ball' },
    { value: 'sled', label: 'Sled' },
    { value: 'heavy_bag', label: 'Heavy Bag' },
    { value: 'other', label: 'Other' },
];

export function CustomExerciseScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { themeColor } = useReadinessTheme();

    const [name, setName] = useState('');
    const [type, setType] = useState<ExerciseType>('heavy_lift');
    const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('full_body');
    const [equipment, setEquipment] = useState<Equipment>('bodyweight');
    const [cnsLoad, setCnsLoad] = useState('5');
    const [description, setDescription] = useState('');
    const [cues, setCues] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Exercise name is required');
            return;
        }
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                Alert.alert('Error', 'Not signed in');
                return;
            }
            await createCustomExercise(session.user.id, {
                name: name.trim(),
                type,
                cns_load: Math.min(10, Math.max(1, parseInt(cnsLoad) || 5)),
                muscle_group: muscleGroup,
                equipment,
                description: description.trim(),
                cues: cues.trim(),
            });
            Alert.alert('Success', 'Exercise created!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Failed to create exercise');
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <IconChevronLeft size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Custom Exercise</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: insets.bottom + SPACING.xxxl + 72 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Card>
                    <Field label="Exercise Name" value={name} onChangeText={setName} placeholder="e.g. Band Face Pull" />
                    <Field label="Description" value={description} onChangeText={setDescription} placeholder="What is this exercise?" />
                    <Field label="Coaching Cues" value={cues} onChangeText={setCues} placeholder="Key form cues..." />
                    <Field label="CNS Load (1-10)" value={cnsLoad} onChangeText={setCnsLoad} keyboardType="decimal-pad" />

                    <Text style={styles.pickerLabel}>Type</Text>
                    <View style={styles.chipRow}>
                        {TYPES.map(t => (
                            <TouchableOpacity
                                key={t.value}
                                style={[styles.chip, type === t.value && { backgroundColor: themeColor, borderColor: themeColor }]}
                                onPress={() => setType(t.value)}
                            >
                                <Text style={[styles.chipText, type === t.value && { color: '#F5F5F0' }]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.pickerLabel}>Muscle Group</Text>
                    <View style={styles.chipRow}>
                        {MUSCLE_GROUPS.map(m => (
                            <TouchableOpacity
                                key={m.value}
                                style={[styles.chip, muscleGroup === m.value && { backgroundColor: themeColor, borderColor: themeColor }]}
                                onPress={() => setMuscleGroup(m.value)}
                            >
                                <Text style={[styles.chipText, muscleGroup === m.value && { color: '#F5F5F0' }]}>{m.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.pickerLabel}>Equipment</Text>
                    <View style={styles.chipRow}>
                        {EQUIPMENT_OPTIONS.map(e => (
                            <TouchableOpacity
                                key={e.value}
                                style={[styles.chip, equipment === e.value && { backgroundColor: themeColor, borderColor: themeColor }]}
                                onPress={() => setEquipment(e.value)}
                            >
                                <Text style={[styles.chipText, equipment === e.value && { color: '#F5F5F0' }]}>{e.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Card>
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: themeColor }, saving && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Create Exercise'}</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: {
    label: string; value: string; onChangeText: (t: string) => void;
    placeholder?: string; keyboardType?: 'default' | 'decimal-pad';
}) {
    return (
        <View style={fieldStyles.container}>
            <Text style={fieldStyles.label}>{label}</Text>
            <TextInput
                style={fieldStyles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.text.tertiary}
                keyboardType={keyboardType ?? 'default'}
            />
        </View>
    );
}

const fieldStyles = StyleSheet.create({
    container: { marginBottom: SPACING.md },
    label: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xs + 2,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm + 2,
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
    },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    scroll: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    backButton: { padding: SPACING.sm, marginRight: SPACING.sm },
    title: {
        fontSize: 20,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    content: { padding: SPACING.lg },
    pickerLabel: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xs + 2,
        marginTop: SPACING.xs,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginBottom: SPACING.md,
    },
    chip: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    bottomBar: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        backgroundColor: COLORS.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border,
    },
    saveButton: {
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.md + 2,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#F5F5F0',
    },
});
