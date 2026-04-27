import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';
import { IconShieldCheck } from '../components/icons';
import { AnimatedPressable } from '../components/AnimatedPressable';

export function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) Alert.alert('Error', error.message);
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) Alert.alert('Error', error.message);
        else Alert.alert('Success', 'Check your email for confirmation.');
        setLoading(false);
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="dark" />

            <View style={styles.content}>
                {/* Logo / Icon */}
                <Animated.View entering={ZoomIn.duration(ANIMATION.normal).springify()} style={styles.logoContainer}>
                    <LinearGradient
                        colors={[...GRADIENTS.prime]}
                        style={styles.logoCircle}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <IconShieldCheck size={32} color="#F5F5F0" strokeWidth={2} />
                    </LinearGradient>
                </Animated.View>

                {/* Brand */}
                <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.normal).springify()}>
                    <Text style={styles.title}>Athleticore</Text>
                    <Text style={styles.subtitle}>Track. Train. Perform.</Text>
                </Animated.View>

                {/* Form */}
                <Animated.View entering={FadeInDown.delay(200).duration(ANIMATION.normal).springify()} style={styles.form}>
                    <TextInput
                        style={[
                            styles.input,
                            emailFocused && { borderColor: COLORS.accent, ...SHADOWS.sm }
                        ]}
                        placeholder="Email"
                        placeholderTextColor={COLORS.text.tertiary}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                    />
                    <TextInput
                        style={[
                            styles.input,
                            passwordFocused && { borderColor: COLORS.accent, ...SHADOWS.sm }
                        ]}
                        placeholder="Password"
                        placeholderTextColor={COLORS.text.tertiary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                    />

                    <AnimatedPressable
                        style={[styles.primaryButtonWrapper, loading && { opacity: 0.6 }]}
                        onPress={signInWithEmail}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[...GRADIENTS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.primaryButton}
                        >
                            <Text style={styles.primaryButtonText}>
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Text>
                        </LinearGradient>
                    </AnimatedPressable>
                </Animated.View>

                {/* Secondary action */}
                <Animated.View entering={FadeInDown.delay(300).duration(ANIMATION.normal).springify()} style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <AnimatedPressable onPress={signUpWithEmail} disabled={loading}>
                        <Text style={styles.footerLink}>Create Account</Text>
                    </AnimatedPressable>
                </Animated.View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.colored.prime,
    },
    title: {
        fontSize: 32,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        textAlign: 'center',
        letterSpacing: 0,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginTop: SPACING.xs,
        marginBottom: SPACING.xxl,
    },
    form: {
        gap: SPACING.md,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md + 2,
        fontSize: 16,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
    },
    primaryButtonWrapper: {
        marginTop: SPACING.sm,
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        ...SHADOWS.colored.accent,
    },
    primaryButton: {
        padding: SPACING.md + 2,
        alignItems: 'center',
        borderRadius: RADIUS.md,
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.inverse,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.xl,
    },
    footerText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    footerLink: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.readiness.prime,
    },
});
