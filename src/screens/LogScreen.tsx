import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MorningCheckIn } from '../components/MorningCheckIn';
import { SessionLogger } from '../components/SessionLogger';
import { Card } from '../components/Card';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';
import { supabase } from '../../lib/supabase';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { todayLocalDate } from '../../lib/utils/date';

export function LogScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { themeColor } = useReadinessTheme();

    // Morning Check-In State
    const [weight, setWeight] = useState('');
    const [sleep, setSleep] = useState(3);
    const [readiness, setReadiness] = useState(3);

    // Session Logger State
    const [intensity, setIntensity] = useState(5);
    const [minutes, setMinutes] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    const logDate = todayLocalDate();
    const todayFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    const handleSaveLog = async () => {
        setIsSaving(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) {
                console.warn('No authenticated user found for logging.');
            }
            const userId = userData?.user?.id;

            const dailyCheckinData = {
                user_id: userId,
                morning_weight: weight ? parseFloat(weight) : null,
                sleep_quality: sleep,
                readiness: readiness,
                macro_adherence: null,
                date: logDate,
            };

            const { error: dailyError } = await supabase
                .from('daily_checkins')
                .upsert(dailyCheckinData, { onConflict: 'user_id,date' });

            if (dailyError) {
                console.error("Error saving daily checkin:", dailyError);
            }

            let hasSaveError = Boolean(dailyError);

            if (minutes && parseInt(minutes) > 0) {
                const trainingData = {
                    user_id: userId,
                    duration_minutes: parseInt(minutes),
                    intensity_srpe: intensity,
                    date: logDate,
                };

                const { error: trainingError } = await supabase
                    .from('training_sessions')
                    .upsert(trainingData, { onConflict: 'user_id,date' });

                if (trainingError) {
                    console.error("Error saving training session:", trainingError);
                    hasSaveError = true;
                }
            }

            if (hasSaveError) {
                Alert.alert("Error", "Could not save log.");
                return;
            }

            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                navigation.navigate('HomeMain');
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Could not save log.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
                <Text style={styles.headerTitle}>Log Entry</Text>
                <Text style={styles.headerDate}>{todayFormatted}</Text>
            </View>
            <View style={styles.dateNotice}>
                <Text style={styles.dateNoticeText}>Saving entries for {todayFormatted} ({logDate})</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Morning Check-In */}
                <Animated.View entering={FadeInDown.delay(50).duration(ANIMATION.normal).springify()}>
                    <Card title="Morning Check-In">
                        <MorningCheckIn
                            weight={weight}
                            setWeight={setWeight}
                            sleep={sleep}
                            setSleep={setSleep}
                            readiness={readiness}
                            setReadiness={setReadiness}
                        />
                    </Card>
                </Animated.View>

                {/* Training Session */}
                <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
                    <Card title="Training Session">
                        <SessionLogger
                            intensity={intensity}
                            setIntensity={setIntensity}
                            minutes={minutes}
                            setMinutes={setMinutes}
                        />
                    </Card>
                </Animated.View>

                {/* Save Button */}
                <Animated.View entering={FadeInDown.delay(150).duration(ANIMATION.normal).springify()}>
                    <AnimatedPressable
                        style={[styles.saveButtonWrapper, isSaving && styles.saveButtonDisabled]}
                        onPress={handleSaveLog}
                        disabled={isSaving}
                    >
                        <LinearGradient
                            colors={[...GRADIENTS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.saveButton}
                        >
                            <Text style={styles.saveButtonText}>
                                {isSaving ? 'Saving...' : 'Save Entry'}
                            </Text>
                        </LinearGradient>
                    </AnimatedPressable>
                </Animated.View>

                <View style={{ height: SPACING.xxl }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
    },
    headerDate: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    dateNotice: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.accentLight,
    },
    dateNoticeText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        textAlign: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    saveButtonWrapper: {
        marginTop: SPACING.lg,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.colored.accent,
    },
    saveButton: {
        paddingVertical: SPACING.md + 2,
        alignItems: 'center',
        borderRadius: RADIUS.lg,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        color: '#FFF',
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 16,
    },
});

