import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { suggestAlternative } from '../../lib/engine/calculateSchedule';
import type { ScheduledActivityRow, ReadinessState } from '../../lib/engine/types';

interface ReadinessGateProps {
    activity: ScheduledActivityRow;
    readinessState: ReadinessState;
    onProceed: () => void;
    onSwitch: () => void;
    onDismiss: () => void;
}

export function ReadinessGate({ activity, readinessState, onProceed, onSwitch, onDismiss }: ReadinessGateProps) {
    const suggestion = suggestAlternative(activity, readinessState);

    return (
        <View style={styles.overlay}>
            <View style={styles.card}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <Text style={styles.title}>Readiness Check</Text>
                <Text style={styles.message}>{suggestion.message}</Text>

                <View style={styles.actions}>
                    {suggestion.shouldSwap && (
                        <TouchableOpacity
                            style={[styles.button, styles.switchButton]}
                            onPress={onSwitch}
                        >
                            <Text style={styles.switchText}>
                                Switch to {suggestion.alternative.replace(/_/g, ' ')}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.button, styles.proceedButton]}
                        onPress={onProceed}
                    >
                        <Text style={styles.proceedText}>Proceed Anyway</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={onDismiss} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
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
        padding: SPACING.lg, alignItems: 'center',
    },
    warningIcon: { fontSize: 40, marginBottom: SPACING.sm },
    title: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, marginBottom: SPACING.sm },
    message: {
        fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary,
        textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg,
    },
    actions: { width: '100%', gap: SPACING.sm },
    button: { width: '100%', paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
    switchButton: { backgroundColor: COLORS.readiness.prime },
    switchText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: '#F5F5F0' },
    proceedButton: { backgroundColor: COLORS.borderLight },
    proceedText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    cancelButton: { marginTop: SPACING.md },
    cancelText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary },
});
