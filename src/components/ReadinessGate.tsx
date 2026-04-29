import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { suggestAlternative } from '../../lib/engine/calculateSchedule';
import type { ActivityType, ScheduledActivityRow, ReadinessState } from '../../lib/engine/types';

interface ReadinessGateProps {
    activity: ScheduledActivityRow;
    readinessState: ReadinessState;
    onProceed: () => void;
    onSwitch: (alternative: ActivityType) => void;
    onDismiss: () => void;
}

export function ReadinessGate({ activity, readinessState, onProceed, onSwitch, onDismiss }: ReadinessGateProps) {
    const suggestion = suggestAlternative(activity, readinessState);

    return (
        <View style={styles.overlay}>
            <View style={styles.card}>
                <ScrollView
                    style={styles.cardScroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.cardContent}
                >
                <Text style={styles.warningIcon}>⚠️</Text>
                <Text style={styles.title}>Readiness Check</Text>
                <Text style={styles.message}>{suggestion.message}</Text>

                <View style={styles.actions}>
                    {suggestion.shouldSwap && (
                        <TouchableOpacity
                            style={[styles.button, styles.switchButton]}
                            onPress={() => onSwitch(suggestion.alternative)}
                            testID="readiness-gate-adjust"
                        >
                            <Text style={styles.switchText}>
                                Adjust to lighter work
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.button, styles.proceedButton]}
                        onPress={onProceed}
                        testID="readiness-gate-log-planned"
                    >
                        <Text style={styles.proceedText}>Log planned session</Text>
                    </TouchableOpacity>
                </View>

                    <TouchableOpacity onPress={onDismiss} style={styles.cancelButton} testID="readiness-gate-cancel">
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
    },
    card: {
        backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
        width: '100%',
        maxHeight: '82%',
        overflow: 'hidden',
    },
    cardScroll: {
        width: '100%',
    },
    cardContent: {
        padding: SPACING.lg,
        alignItems: 'center',
        width: '100%',
    },
    warningIcon: { fontSize: 40, marginBottom: SPACING.sm },
    title: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, marginBottom: SPACING.sm },
    message: {
        fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary,
        textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg,
        width: '100%',
    },
    actions: { width: '100%', gap: SPACING.sm },
    button: { width: '100%', minHeight: 48, paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    switchButton: { backgroundColor: COLORS.readiness.prime },
    switchText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: '#F5F5F0' },
    proceedButton: { backgroundColor: COLORS.borderLight },
    proceedText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    cancelButton: { marginTop: SPACING.md, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md },
    cancelText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary },
});
