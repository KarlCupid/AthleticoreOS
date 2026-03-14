import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import type { OvertrainingWarning } from '../../lib/engine/types';

const SEVERITY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
    info: { bg: '#1E3A5F20', text: '#4A90D9', icon: 'ℹ️' },
    caution: { bg: COLORS.readiness.cautionLight, text: COLORS.readiness.caution, icon: '⚠️' },
    danger: { bg: COLORS.readiness.depletedLight, text: COLORS.readiness.depleted, icon: '🚨' },
};

interface OvertrainingAlertProps {
    warning: OvertrainingWarning;
    onDismiss: () => void;
}

export function OvertrainingAlert({ warning, onDismiss }: OvertrainingAlertProps) {
    const [expanded, setExpanded] = useState(false);
    const colors = SEVERITY_COLORS[warning.severity] ?? SEVERITY_COLORS.caution;

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <View style={styles.header}>
                <Text style={styles.icon}>{colors.icon}</Text>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: colors.text }]}>{warning.title}</Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
                    <Text style={styles.dismissText}>✕</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.message}>{warning.message}</Text>
            <TouchableOpacity onPress={toggleExpand}>
                <Text style={[styles.learnMore, { color: colors.text }]}>
                    {expanded ? 'Less ▲' : 'What should I do? ▼'}
                </Text>
            </TouchableOpacity>
            {expanded && (
                <Text style={styles.recommendation}>{warning.recommendation}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
        borderRadius: RADIUS.lg, padding: SPACING.md,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    icon: { fontSize: 18 },
    headerText: { flex: 1 },
    title: { fontSize: 15, fontFamily: FONT_FAMILY.black },
    dismissBtn: { padding: 4 },
    dismissText: { fontSize: 16, color: COLORS.text.tertiary, fontWeight: 'bold' },
    message: {
        fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary,
        marginTop: SPACING.xs, lineHeight: 18,
    },
    learnMore: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, marginTop: SPACING.sm },
    recommendation: {
        fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary,
        marginTop: SPACING.xs, lineHeight: 18, fontStyle: 'italic',
    },
});
