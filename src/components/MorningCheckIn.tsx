import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';

interface MorningCheckInProps {
    weight: string;
    setWeight: (val: string) => void;
    sleep: number;
    setSleep: (val: number) => void;
    readiness: number;
    setReadiness: (val: number) => void;
}

export function MorningCheckIn({ weight, setWeight, sleep, setSleep, readiness, setReadiness }: MorningCheckInProps) {
    const { themeColor } = useReadinessTheme();

    const handleSliderChange = (setter: (val: number) => void) => (val: number) => {
        setter(val);
        Haptics.selectionAsync();
    };

    const getReadinessLabel = (val: number) => {
        if (val <= 2) return 'Running on empty';
        if (val <= 3) return 'Normal soreness';
        return 'Fresh and ready';
    };

    return (
        <View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Morning Weight (lbs)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="155.0"
                    placeholderTextColor={COLORS.text.tertiary}
                    selectionColor={themeColor}
                />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.sliderHeader}>
                    <Text style={styles.label}>Sleep Quality</Text>
                    <Text style={styles.valueDisplay}>{sleep} / 5</Text>
                </View>
                <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={5}
                    step={1}
                    value={sleep}
                    onValueChange={handleSliderChange(setSleep)}
                    minimumTrackTintColor={themeColor}
                    maximumTrackTintColor={COLORS.border}
                    thumbTintColor={themeColor}
                />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.sliderHeader}>
                    <Text style={styles.label}>Readiness</Text>
                    <Text style={styles.valueDisplay}>{readiness} / 5</Text>
                </View>
                <Text style={styles.hint}>{getReadinessLabel(readiness)}</Text>
                <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={5}
                    step={1}
                    value={readiness}
                    onValueChange={handleSliderChange(setReadiness)}
                    minimumTrackTintColor={themeColor}
                    maximumTrackTintColor={COLORS.border}
                    thumbTintColor={themeColor}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: 18,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    valueDisplay: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    hint: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.xs,
    },
});
