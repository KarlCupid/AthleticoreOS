import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, TYPOGRAPHY_V2, APP_CHROME } from '../../theme/theme';

export type TimelineEntryStatus = 'completed' | 'active' | 'upcoming';

interface TimelineEntryProps {
    time: string;
    label: string;
    status: TimelineEntryStatus;
    coachingNote?: string;
    onPress: () => void;
}

export function TimelineEntry({ time, label, status, coachingNote, onPress }: TimelineEntryProps) {
    const isActive = status === 'active';
    const isCompleted = status === 'completed';

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.row,
                isActive && styles.rowActive,
                pressed && styles.rowPressed,
                isCompleted && styles.rowCompleted,
            ]}
        >
            {/* Left accent bar — only on active entry */}
            {isActive && <View style={styles.accentBar} />}

            <View style={styles.content}>
                <Text style={[styles.time, isCompleted && styles.textDimmed]}>{time}</Text>
                <Text
                    style={[
                        styles.label,
                        isActive && styles.labelActive,
                        isCompleted && styles.textDimmed,
                    ]}
                    numberOfLines={1}
                >
                    {label}
                </Text>
                {coachingNote && (
                    <Text style={[styles.coachingNote, isCompleted && styles.textDimmed]} numberOfLines={2}>
                        {coachingNote}
                    </Text>
                )}
            </View>

            {isCompleted && (
                <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: SPACING.sm + 2,
        paddingHorizontal: SPACING.md,
        // No background, no card elevation — this is a list item
    },
    rowActive: {
        paddingLeft: SPACING.md - 2, // account for 2dp accent bar
    },
    rowPressed: {
        backgroundColor: COLORS.surfaceSecondary,
    },
    rowCompleted: {
        opacity: 0.6,
    },
    accentBar: {
        width: 2,
        alignSelf: 'stretch',
        borderRadius: 2,
        backgroundColor: APP_CHROME.accent,
        marginRight: SPACING.sm,
    },
    content: {
        flex: 1,
    },
    time: {
        ...TYPOGRAPHY_V2.plan.caption,
        color: COLORS.text.tertiary,
        marginBottom: 2,
    },
    label: {
        ...TYPOGRAPHY_V2.plan.body,
        color: COLORS.text.primary,
    },
    labelActive: {
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    coachingNote: {
        ...TYPOGRAPHY_V2.plan.caption,
        color: COLORS.text.secondary,
        marginTop: 3,
    },
    textDimmed: {
        // opacity handled at row level via rowCompleted
    },
    checkmark: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.readiness.primeLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.sm,
        marginTop: 2,
    },
    checkmarkText: {
        fontSize: 11,
        color: COLORS.readiness.prime,
        fontFamily: FONT_FAMILY.semiBold,
    },
});
