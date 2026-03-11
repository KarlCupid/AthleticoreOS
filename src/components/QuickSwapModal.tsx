import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { DailyTimelineRow } from '../../lib/engine/types';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

interface QuickSwapModalProps {
    visible: boolean;
    block: DailyTimelineRow | null;
    onClose: () => void;
    onAction: (actionType: 'hard_sparring' | 'light_flow' | 'skipped') => void;
}

export function QuickSwapModal({ visible, block, onClose, onAction }: QuickSwapModalProps) {
    if (!block) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableWithoutFeedback>
                    <View style={styles.bottomSheet}>
                        <View style={styles.handle} />
                        <Text style={styles.title}>Log {block.block_type} Detail</Text>
                        <Text style={styles.subtitle}>Scheduled Intensity: {block.planned_intensity}/10</Text>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonHeavy]}
                                onPress={() => { onAction('hard_sparring'); onClose(); }}
                            >
                                <Text style={styles.buttonTextLight}>Turned into Hard Sparring</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.buttonLight]}
                                onPress={() => { onAction('light_flow'); onClose(); }}
                            >
                                <Text style={styles.buttonTextDark}>Light Flow / Drilling</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.buttonSkipped]}
                                onPress={() => { onAction('skipped'); onClose(); }}
                            >
                                <Text style={styles.buttonTextSkip}>Skipped / Moved</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: 'rgba(255, 255, 255, 0.96)', // basic glass feel
        borderTopLeftRadius: RADIUS.xxl,
        borderTopRightRadius: RADIUS.xxl,
        padding: SPACING.xl,
        paddingBottom: 40,
        ...SHADOWS.header,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: 22,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    buttonContainer: {
        gap: SPACING.md,
    },
    button: {
        paddingVertical: 18,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.card,
    },
    buttonHeavy: {
        backgroundColor: COLORS.readiness.depleted,
    },
    buttonLight: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    buttonSkipped: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 0,
        shadowOpacity: 0,
    },
    buttonTextLight: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.surface,
    },
    buttonTextDark: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    buttonTextSkip: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    }
});
