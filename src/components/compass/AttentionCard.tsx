import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY_V2, SEMANTIC_PALETTE } from '../../theme/theme';

export type AttentionCardType = 'nutrition' | 'recovery' | 'weight' | 'positive' | 'info';

interface AttentionCardAction {
    label: string;
    onPress: () => void;
}

interface AttentionCardProps {
    type: AttentionCardType;
    headline: string;
    explanation: string;
    action?: AttentionCardAction;
}

const TYPE_STYLES: Record<AttentionCardType, { edge: string; tint: string }> = {
    nutrition: SEMANTIC_PALETTE.caution,
    recovery:  SEMANTIC_PALETTE.alert,
    weight:    SEMANTIC_PALETTE.caution,
    positive:  SEMANTIC_PALETTE.positive,
    info:      SEMANTIC_PALETTE.info,
};

export function AttentionCard({ type, headline, explanation, action }: AttentionCardProps) {
    const { edge, tint } = TYPE_STYLES[type];

    return (
        <View style={[styles.card, { backgroundColor: tint }]}>
            {/* 4dp left edge bar */}
            <View style={[styles.edgeBar, { backgroundColor: edge }]} />

            <View style={styles.body}>
                <Text style={styles.headline}>{headline}</Text>
                <Text style={styles.explanation} numberOfLines={2}>{explanation}</Text>

                {action && (
                    <Pressable
                        onPress={action.onPress}
                        style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}
                    >
                        <Text style={[styles.actionLabel, { color: edge }]}>{action.label}</Text>
                        <Text style={[styles.actionChevron, { color: edge }]}>›</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        borderRadius: RADIUS.md,
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.xs,
        overflow: 'hidden',
    },
    edgeBar: {
        width: 4,
    },
    body: {
        flex: 1,
        paddingVertical: SPACING.md + 4, // 20dp as specified
        paddingHorizontal: SPACING.md,
    },
    headline: {
        ...TYPOGRAPHY_V2.plan.headline,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    explanation: {
        ...TYPOGRAPHY_V2.plan.body,
        color: COLORS.text.secondary,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.sm,
        gap: 2,
    },
    actionPressed: {
        opacity: 0.7,
    },
    actionLabel: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
    },
    actionChevron: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.semiBold,
        marginTop: -1,
    },
});
