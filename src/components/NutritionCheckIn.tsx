import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

export type NutritionStatus = 'Target Met' | 'Close Enough' | 'Missed It' | null;

interface NutritionCheckInProps {
    status: NutritionStatus;
    setStatus: (val: NutritionStatus) => void;
}

const OPTIONS: { value: NutritionStatus; label: string; color: string }[] = [
    { value: 'Target Met', label: 'Hit Target', color: COLORS.readiness.prime },
    { value: 'Close Enough', label: 'Close', color: COLORS.readiness.caution },
    { value: 'Missed It', label: 'Missed', color: COLORS.readiness.depleted },
];

export function NutritionCheckIn({ status, setStatus }: NutritionCheckInProps) {
    const handlePress = (newStatus: NutritionStatus) => {
        setStatus(newStatus);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    return (
        <View style={styles.pillRow}>
            {OPTIONS.map(opt => {
                const isSelected = status === opt.value;
                return (
                    <TouchableOpacity
                        key={opt.value}
                        style={[
                            styles.pill,
                            isSelected && { backgroundColor: opt.color, borderColor: opt.color },
                        ]}
                        onPress={() => handlePress(opt.value)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    pillRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    pill: {
        flex: 1,
        paddingVertical: SPACING.sm + 4,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    pillText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    pillTextActive: {
        color: COLORS.text.inverse,
    },
});
