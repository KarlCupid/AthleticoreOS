import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { IconCheckCircle, IconChevronRight } from './icons';
import { COLORS, FONT_FAMILY, RADIUS, SPACING, SHADOWS } from '../theme/theme';

export interface ActionGridItemProps {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    sub: string;
    done?: boolean;
    onPress: () => void;
}

export function ActionGridItem({ icon, iconBg, label, sub, done, onPress }: ActionGridItemProps) {
    return (
        <AnimatedPressable onPress={onPress} style={styles.actionGridItem}>
            <View style={styles.actionGridCard}>
                <View style={[styles.actionGridIcon, { backgroundColor: iconBg }]}>
                    {done ? <IconCheckCircle size={20} color={COLORS.success} /> : icon}
                </View>
                <Text style={[styles.actionGridLabel, done && styles.actionGridDone]}>{label}</Text>
                <Text style={styles.actionGridSub}>{sub}</Text>
                <View style={styles.actionGridArrow}>
                    <IconChevronRight size={14} color={COLORS.text.tertiary} />
                </View>
            </View>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    actionGridItem: {
        width: '47%',
    },
    actionGridCard: {
        backgroundColor: 'rgba(10, 10, 10, 0.58)',
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(245, 245, 240, 0.14)',
        ...SHADOWS.card,
        minHeight: 120,
    },
    actionGridIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    actionGridLabel: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    actionGridSub: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
    actionGridDone: {
        color: COLORS.text.tertiary,
        textDecorationLine: 'line-through',
    },
    actionGridArrow: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
    },
});
