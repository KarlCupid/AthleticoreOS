import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING } from '../theme/theme';
import { styles } from './ActivityLogScreen.styles';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { completeActivity } from '../../lib/api/scheduleService';
import type { ComponentType } from '../../lib/engine/types';

const COMPONENT_OPTIONS: { type: ComponentType; label: string; icon: string }[] = [
    { type: 'sparring', label: 'Sparring', icon: '🥊' },
    { type: 'bag_work', label: 'Bag Work', icon: '🎯' },
    { type: 'pad_work', label: 'Pad Work', icon: '🥊' },
    { type: 'shadow_boxing', label: 'Shadow Boxing', icon: '👤' },
    { type: 'speed_bag', label: 'Speed Bag', icon: '💨' },
    { type: 'double_end_bag', label: 'Double End Bag', icon: '🎯' },
    { type: 'clinch_work', label: 'Clinch Work', icon: '🤼' },
    { type: 'running', label: 'Running', icon: '🏃' },
    { type: 'conditioning', label: 'Conditioning', icon: '💪' },
    { type: 'core', label: 'Core', icon: '🔥' },
    { type: 'technique', label: 'Technique Drills', icon: '📐' },
    { type: 'other', label: 'Other', icon: '📝' },
];

interface LoggedComponent {
    component_type: ComponentType;
    duration_min: number;
    distance_miles?: number;
    pace_per_mile?: string;
    rounds?: number;
    intensity: number;
    notes?: string;
}

export function ActivityLogScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { themeColor } = useReadinessTheme();

    const activityId = route.params?.activityId;
    const [components, setComponents] = useState<LoggedComponent[]>([]);
    const [sessionRPE, setSessionRPE] = useState(5);
    const [sessionDuration, setSessionDuration] = useState('60');
    const [sessionNotes, setSessionNotes] = useState('');
    const [showComponentPicker, setShowComponentPicker] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!activityId) return;

        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data } = await supabase
                .from('scheduled_activities')
                .select('estimated_duration_min, expected_intensity, notes')
                .eq('user_id', session.user.id)
                .eq('id', activityId)
                .maybeSingle();

            if (!data) return;

            setSessionDuration(String(data.estimated_duration_min ?? 60));
            setSessionRPE(data.expected_intensity ?? 5);
            setSessionNotes(data.notes ?? '');
        })();
    }, [activityId]);

    const addComponent = (type: ComponentType) => {
        setComponents(prev => [...prev, {
            component_type: type,
            duration_min: 15,
            intensity: 5,
        }]);
        setShowComponentPicker(false);
    };

    const updateComponent = (index: number, updates: Partial<LoggedComponent>) => {
        setComponents(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
    };

    const removeComponent = (index: number) => {
        setComponents(prev => prev.filter((_, i) => i !== index));
    };

    const handleComplete = async () => {
        if (!activityId) { Alert.alert('Error', 'No activity selected'); return; }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        setSaving(true);
        try {
            await completeActivity(session.user.id, activityId, {
                actual_duration_min: parseInt(sessionDuration) || 60,
                actual_rpe: sessionRPE,
                notes: sessionNotes || undefined,
                components,
            });
            navigation.goBack();
        } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed to save');
        }
        setSaving(false);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Log Activity</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Session Overview */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Session Overview</Text>

                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>Duration (min)</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={sessionDuration}
                            onChangeText={setSessionDuration}
                            keyboardType="numeric"
                            placeholderTextColor={COLORS.text.tertiary}
                        />
                    </View>

                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>Session RPE</Text>
                        <View style={styles.rpeRow}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <TouchableOpacity
                                    key={n}
                                    style={[styles.rpeBubble, n === sessionRPE && { backgroundColor: themeColor }]}
                                    onPress={() => setSessionRPE(n)}
                                >
                                    <Text style={[styles.rpeBubbleText, n === sessionRPE && { color: '#FFF' }]}>{n}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TextInput
                        style={styles.notesInput}
                        placeholder="Session notes (optional)"
                        value={sessionNotes}
                        onChangeText={setSessionNotes}
                        multiline
                        placeholderTextColor={COLORS.text.tertiary}
                    />
                </View>

                {/* Components */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Components</Text>
                        <TouchableOpacity onPress={() => setShowComponentPicker(true)}>
                            <Text style={[styles.addText, { color: themeColor }]}>+ Add</Text>
                        </TouchableOpacity>
                    </View>

                    {components.length === 0 ? (
                        <Text style={styles.emptyText}>Add components to detail your session</Text>
                    ) : (
                        components.map((comp, i) => {
                            const option = COMPONENT_OPTIONS.find(o => o.type === comp.component_type);
                            return (
                                <View key={i} style={styles.componentCard}>
                                    <View style={styles.componentHeader}>
                                        <Text style={styles.componentIcon}>{option?.icon ?? '📝'}</Text>
                                        <Text style={styles.componentLabel}>{option?.label ?? comp.component_type}</Text>
                                        <TouchableOpacity onPress={() => removeComponent(i)}>
                                            <Text style={styles.removeText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.componentFields}>
                                        <View style={styles.miniField}>
                                            <Text style={styles.miniLabel}>Duration</Text>
                                            <TextInput
                                                style={styles.miniInput}
                                                value={String(comp.duration_min)}
                                                onChangeText={v => updateComponent(i, { duration_min: parseInt(v) || 0 })}
                                                keyboardType="numeric"
                                                placeholderTextColor={COLORS.text.tertiary}
                                            />
                                        </View>

                                        <View style={styles.miniField}>
                                            <Text style={styles.miniLabel}>Intensity</Text>
                                            <TextInput
                                                style={styles.miniInput}
                                                value={String(comp.intensity)}
                                                onChangeText={v => updateComponent(i, { intensity: Math.min(10, parseInt(v) || 0) })}
                                                keyboardType="numeric"
                                                placeholderTextColor={COLORS.text.tertiary}
                                            />
                                        </View>

                                        {comp.component_type === 'running' && (
                                            <View style={styles.miniField}>
                                                <Text style={styles.miniLabel}>Miles</Text>
                                                <TextInput
                                                    style={styles.miniInput}
                                                    value={comp.distance_miles ? String(comp.distance_miles) : ''}
                                                    onChangeText={v => updateComponent(i, { distance_miles: parseFloat(v) || undefined })}
                                                    keyboardType="decimal-pad"
                                                    placeholder="0.0"
                                                    placeholderTextColor={COLORS.text.tertiary}
                                                />
                                            </View>
                                        )}

                                        {(comp.component_type === 'sparring' || comp.component_type === 'bag_work' || comp.component_type === 'pad_work') && (
                                            <View style={styles.miniField}>
                                                <Text style={styles.miniLabel}>Rounds</Text>
                                                <TextInput
                                                    style={styles.miniInput}
                                                    value={comp.rounds ? String(comp.rounds) : ''}
                                                    onChangeText={v => updateComponent(i, { rounds: parseInt(v) || undefined })}
                                                    keyboardType="numeric"
                                                    placeholder="0"
                                                    placeholderTextColor={COLORS.text.tertiary}
                                                />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Complete Button */}
                <TouchableOpacity
                    style={[styles.completeButton, { backgroundColor: themeColor, opacity: saving ? 0.5 : 1 }]}
                    onPress={handleComplete}
                    disabled={saving}
                >
                    <Text style={styles.completeButtonText}>{saving ? 'Saving...' : 'Complete Session'}</Text>
                </TouchableOpacity>

                <View style={{ height: SPACING.xxl * 2 }} />
            </ScrollView>

            {/* Component Picker */}
            {showComponentPicker && (
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>Add Component</Text>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {COMPONENT_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.type}
                                    style={styles.pickerOption}
                                    onPress={() => addComponent(opt.type)}
                                >
                                    <Text style={styles.pickerOptionIcon}>{opt.icon}</Text>
                                    <Text style={styles.pickerOptionLabel}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowComponentPicker(false)}>
                            <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}




