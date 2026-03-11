import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { submitFitnessQuestionnaire } from '../../lib/api/fitnessService';
import { FitnessAssessmentInput } from '../../lib/engine/types';

const COLORS = {
    background: '#09090B',
    card: '#18181B',
    cardLight: '#27272A',
    text: '#FAFAFA',
    textMuted: '#A1A1AA',
    primary: '#EAB308',
    danger: '#EF4444',
};

export function FitnessQuestionnaireScreen() {
    const navigation = useNavigation<any>();
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState<FitnessAssessmentInput>({
        trainingYears: 2,
        weeklySessionCount: 3,
        maxPushUpsIn2Min: 30,
        mile5RunTimeSeconds: 720, // 12 minutes default
        sportExperienceYears: 1,
        hasSignificantInjuries: false,
        trainingBackground: 'recreational',
    });

    const [runTimeUnknown, setRunTimeUnknown] = useState(false);

    const handleSave = async () => {
        try {
            setSubmitting(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error("Not authenticated");

            const input: FitnessAssessmentInput = {
                ...form,
                mile5RunTimeSeconds: runTimeUnknown ? null : form.mile5RunTimeSeconds,
            };

            const result = await submitFitnessQuestionnaire(session.user.id, input);

            Alert.alert(
                "Assessment Complete",
                `Level: ${result.level.toUpperCase()} (Score: ${Math.round(result.compositeScore)})\n\n${result.summary}`,
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const renderOption = <T extends string>(
        label: string,
        value: T,
        selectedValue: T,
        onSelect: (val: T) => void
    ) => (
        <TouchableOpacity
            style={[styles.optionRow, selectedValue === value && styles.optionSelected]}
            onPress={() => onSelect(value)}
        >
            <Text style={[styles.optionText, selectedValue === value && styles.optionTextSelected]}>{label}</Text>
            {selectedValue === value && <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: 'bold' }}>{"\u2713"}</Text>}
        </TouchableOpacity>
    );

    const renderNumberControl = (
        label: string,
        value: number,
        min: number,
        max: number,
        step: number,
        onChange: (v: number) => void
    ) => (
        <View style={styles.numberControlContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.numberControl}>
                <TouchableOpacity onPress={() => onChange(Math.max(min, value - step))} style={styles.numberBtn}>
                    <Text style={styles.numberBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.numberValue}>{value}</Text>
                <TouchableOpacity onPress={() => onChange(Math.min(max, value + step))} style={styles.numberBtn}>
                    <Text style={styles.numberBtnText}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Fitness Assessment</Text>
                <Text style={styles.subtitle}>Set your baseline parameters for the Athleticore OS engine.</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

                {/* EXPERIENCE */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Experience</Text>
                    <View style={styles.grid}>
                        {renderNumberControl('Training Years', form.trainingYears, 0, 20, 1, val => setForm({ ...form, trainingYears: val }))}
                        <View style={{ width: 16 }} />
                        {renderNumberControl('Combat Sport Years', form.sportExperienceYears, 0, 20, 1, val => setForm({ ...form, sportExperienceYears: val }))}
                    </View>
                    <View style={styles.grid}>
                        {renderNumberControl('Current Weekly Sessions', form.weeklySessionCount, 1, 14, 1, val => setForm({ ...form, weeklySessionCount: val }))}
                    </View>
                </View>

                {/* BACKGROUND */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Training Background</Text>
                    {renderOption('None / Absolute Beginner', 'none', form.trainingBackground, val => setForm({ ...form, trainingBackground: val }))}
                    {renderOption('Recreational / Fitness', 'recreational', form.trainingBackground, val => setForm({ ...form, trainingBackground: val }))}
                    {renderOption('Competitive Amateur', 'competitive', form.trainingBackground, val => setForm({ ...form, trainingBackground: val }))}
                    {renderOption('Professional Athlete', 'professional', form.trainingBackground, val => setForm({ ...form, trainingBackground: val }))}
                </View>

                {/* MULTIPLIERS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Physical Benchmarks</Text>
                    {renderNumberControl('Max Push-Ups (in 2 min)', form.maxPushUpsIn2Min, 0, 150, 5, val => setForm({ ...form, maxPushUpsIn2Min: val }))}

                    <View style={[styles.numberControlContainer, { marginTop: 16 }]}>
                        <Text style={styles.label}>1.5 Mile Run Time (Seconds)</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={[styles.numberControl, { flex: 1, marginRight: 16 }, runTimeUnknown && { opacity: 0.5 }]}>
                                <TouchableOpacity
                                    onPress={() => !runTimeUnknown && setForm({ ...form, mile5RunTimeSeconds: Math.max(300, (form.mile5RunTimeSeconds || 720) - 15) })}
                                    style={styles.numberBtn}
                                    disabled={runTimeUnknown}
                                >
                                    <Text style={styles.numberBtnText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.numberValue}>{form.mile5RunTimeSeconds}s</Text>
                                <TouchableOpacity
                                    onPress={() => !runTimeUnknown && setForm({ ...form, mile5RunTimeSeconds: Math.min(2400, (form.mile5RunTimeSeconds || 720) + 15) })}
                                    style={styles.numberBtn}
                                    disabled={runTimeUnknown}
                                >
                                    <Text style={styles.numberBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={[styles.unknownBtn, runTimeUnknown && styles.unknownBtnActive]}
                                onPress={() => setRunTimeUnknown(!runTimeUnknown)}
                            >
                                <Text style={[styles.unknownBtnText, runTimeUnknown && { color: COLORS.background }]}>I don't run</Text>
                            </TouchableOpacity>
                        </View>
                        {!runTimeUnknown && (
                            <Text style={styles.helperText}>
                                {Math.floor((form.mile5RunTimeSeconds || 720) / 60)} min {((form.mile5RunTimeSeconds || 720) % 60).toString().padStart(2, '0')} sec
                            </Text>
                        )}
                    </View>
                </View>

                {/* INJURY STATUS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Medical</Text>
                    <TouchableOpacity
                        style={[styles.optionRow, form.hasSignificantInjuries && { borderColor: COLORS.danger, backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                        onPress={() => setForm(f => ({ ...f, hasSignificantInjuries: !f.hasSignificantInjuries }))}
                    >
                        <Text style={[styles.optionText, form.hasSignificantInjuries && { color: COLORS.danger }]}>
                            I have significant current injuries
                        </Text>
                        {form.hasSignificantInjuries && <Text style={{ color: COLORS.danger, fontSize: 18, fontWeight: 'bold' }}>{"\u2713"}</Text>}
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={submitting}
                >
                    <Text style={styles.saveBtnText}>{submitting ? 'Calculating...' : 'Calculate Baseline'}</Text>
                    <Text style={{ color: '#000', fontSize: 20, fontWeight: 'bold' }}>{"\u203A"}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { padding: 24, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.textMuted },
    scroll: { flex: 1 },
    scrollContent: { padding: 24, paddingTop: 0, paddingBottom: 100 },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase' },
    optionRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.card, padding: 16, borderRadius: 12, marginBottom: 8,
        borderWidth: 1, borderColor: COLORS.cardLight,
    },
    optionSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(234, 179, 8, 0.1)' },
    optionText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '500' },
    optionTextSelected: { color: COLORS.text, fontWeight: '700' },
    grid: { flexDirection: 'row', flex: 1, marginBottom: 16 },
    numberControlContainer: { flex: 1 },
    numberControl: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.card, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardLight,
    },
    numberBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.cardLight, alignItems: 'center', justifyContent: 'center' },
    numberBtnText: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
    numberValue: { fontSize: 18, color: COLORS.text, fontWeight: '700' },
    unknownBtn: {
        paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12,
        backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardLight
    },
    unknownBtnActive: { backgroundColor: COLORS.textMuted, borderColor: COLORS.textMuted },
    unknownBtnText: { color: COLORS.textMuted, fontWeight: '600' },
    helperText: { color: COLORS.primary, fontSize: 14, marginTop: 8, fontWeight: '600' },
    footer: {
        padding: 24, borderTopWidth: 1, borderTopColor: COLORS.cardLight,
        backgroundColor: COLORS.background,
    },
    saveBtn: {
        backgroundColor: COLORS.primary, padding: 18, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '800', marginRight: 8 },
});
