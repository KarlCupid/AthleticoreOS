import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';

interface SessionLoggerProps {
    intensity: number;
    setIntensity: (val: number) => void;
    minutes: string;
    setMinutes: (val: string) => void;
}

export function SessionLogger({ intensity, setIntensity, minutes, setMinutes }: SessionLoggerProps) {
    const { themeColor } = useReadinessTheme();

    const handleSliderChange = (val: number) => {
        setIntensity(val);
        Haptics.selectionAsync();
    };

    const getIntensityLabel = (val: number) => {
        switch (val) {
            case 1:
                return 'Very easy - movement and mobility only';
            case 2:
                return 'Easy - technique pace, no strain';
            case 3:
                return 'Light - crisp reps, full control';
            case 4:
                return 'Moderate light - working but comfortable';
            case 5:
                return 'Moderate - steady training effort';
            case 6:
                return 'Moderate hard - breathing up, still repeatable';
            case 7:
                return 'Hard - high focus and strong pace';
            case 8:
                return 'Very hard - near limit, brief bursts';
            case 9:
                return 'Maximal - only a little left in reserve';
            case 10:
                return 'All out - nothing left';
            default:
                return 'Moderate - steady training effort';
        }
    };

    return (
        <View>
            <View style={styles.inputGroup}>
                <View style={styles.sliderHeader}>
                    <Text style={styles.label}>Intensity (RPE)</Text>
                    <Text style={styles.valueDisplay}>{intensity} / 10</Text>
                </View>
                <Text style={styles.hint}>{getIntensityLabel(intensity)}</Text>
                <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={10}
                    step={1}
                    value={intensity}
                    onValueChange={handleSliderChange}
                    minimumTrackTintColor={themeColor}
                    maximumTrackTintColor={COLORS.border}
                    thumbTintColor={themeColor}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Duration (Minutes)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={minutes}
                    onChangeText={setMinutes}
                    placeholder="60"
                    placeholderTextColor={COLORS.text.tertiary}
                    selectionColor={themeColor}
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
        height: 44,
    },
    hint: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.xs,
    },
});
