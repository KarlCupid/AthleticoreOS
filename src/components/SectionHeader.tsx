import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';

interface SectionHeaderProps {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
    badge?: number;
    showDivider?: boolean;
    dividerColor?: string;
}

export function SectionHeader({
    title,
    actionLabel,
    onAction,
    badge,
    showDivider = false,
    dividerColor = COLORS.accent,
}: SectionHeaderProps) {
    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{title}</Text>
                    {badge !== undefined && badge > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                    )}
                </View>
                {actionLabel && onAction && (
                    <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.action}>{actionLabel}</Text>
                    </TouchableOpacity>
                )}
            </View>
            {showDivider && (
                <View style={[styles.divider, { backgroundColor: dividerColor }]} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: SPACING.sm,
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.xs,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    title: {
        fontSize: 22,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
        textTransform: 'uppercase',
    },
    badge: {
        backgroundColor: COLORS.accentLight,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 22,
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },
    action: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },
    divider: {
        height: 2,
        borderRadius: 1,
        marginTop: SPACING.sm,
        marginHorizontal: SPACING.xs,
        width: 32,
    },
});
