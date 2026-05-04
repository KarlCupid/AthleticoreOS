import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import {
    PASSWORD_RECOVERY_REDIRECT_URL,
    PASSWORD_REQUIREMENT_COPY,
    getSupabaseAuthErrorCopy,
    normalizeEmail,
    validateEmailAndPassword,
    validateNewPassword,
    validatePasswordResetEmail,
    type AuthFieldErrors,
} from '../../lib/api/authUx';
import { addMonitoringBreadcrumb } from '../../lib/observability/breadcrumbs';
import { logError } from '../../lib/utils/logger';
import {
    APP_PRIVACY_POLICY_URL,
    APP_SUPPORT_EMAIL,
    APP_SUPPORT_MAILTO,
    PRIVACY_POLICY_SECTIONS,
} from '../config/appReview';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';
import { IconShieldCheck } from '../components/icons';
import { AnimatedPressable } from '../components/AnimatedPressable';

type AuthMode = 'signIn' | 'resetRequest';
type SubmitAction = 'signIn' | 'signUp' | 'resetRequest' | 'passwordUpdate';
type FormMessage = { tone: 'error' | 'success'; text: string };

interface AuthScreenProps {
    passwordRecovery?: boolean;
    notice?: string | null;
    onPasswordRecoveryCompleted?: () => void;
}

export function AuthScreen({
    passwordRecovery = false,
    notice = null,
    onPasswordRecoveryCompleted,
}: AuthScreenProps) {
    const [mode, setMode] = useState<AuthMode>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [activeSubmit, setActiveSubmit] = useState<SubmitAction | null>(null);
    const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
    const [formMessage, setFormMessage] = useState<FormMessage | null>(
        notice ? { tone: 'error', text: notice } : null,
    );

    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [newPasswordFocused, setNewPasswordFocused] = useState(false);
    const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
    const submitInFlightRef = useRef(false);

    const busy = activeSubmit !== null;

    useEffect(() => {
        if (notice) {
            setFormMessage({ tone: 'error', text: notice });
        }
    }, [notice]);

    useEffect(() => {
        if (passwordRecovery) {
            setMode('signIn');
            setPassword('');
            setFieldErrors({});
        }
    }, [passwordRecovery]);

    function setEmailInput(value: string) {
        setEmail(value);
        setFieldErrors((current) => ({ ...current, email: undefined }));
    }

    function setPasswordInput(value: string) {
        setPassword(value);
        setFieldErrors((current) => ({ ...current, password: undefined }));
    }

    function setNewPasswordInput(value: string) {
        setNewPassword(value);
        setFieldErrors((current) => ({ ...current, password: undefined }));
    }

    function setConfirmPasswordInput(value: string) {
        setConfirmPassword(value);
        setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
    }

    function beginSubmit(action: SubmitAction) {
        if (submitInFlightRef.current) {
            return false;
        }

        submitInFlightRef.current = true;
        setActiveSubmit(action);
        setFormMessage(null);
        return true;
    }

    function endSubmit() {
        submitInFlightRef.current = false;
        setActiveSubmit(null);
    }

    async function signInWithEmail() {
        if (submitInFlightRef.current) return;

        const validation = validateEmailAndPassword(email, password);
        setEmail(validation.normalizedEmail);
        setFieldErrors(validation.errors);
        if (!validation.valid || !beginSubmit('signIn')) return;

        addMonitoringBreadcrumb('auth', 'sign_in_started');
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: validation.normalizedEmail,
                password,
            });
            if (error) {
                logError('AuthScreen.signIn', error, { authOperation: 'signInWithPassword' });
                setFormMessage({ tone: 'error', text: getSupabaseAuthErrorCopy(error, 'signIn') });
            } else {
                addMonitoringBreadcrumb('auth', 'sign_in_succeeded');
            }
        } catch (error) {
            logError('AuthScreen.signIn.unhandled', error, { authOperation: 'signInWithPassword' });
            setFormMessage({ tone: 'error', text: getSupabaseAuthErrorCopy(error, 'signIn') });
        } finally {
            endSubmit();
        }
    }

    async function signUpWithEmail() {
        if (submitInFlightRef.current) return;

        const validation = validateEmailAndPassword(email, password);
        setEmail(validation.normalizedEmail);
        setFieldErrors(validation.errors);
        if (!validation.valid || !beginSubmit('signUp')) return;

        addMonitoringBreadcrumb('auth', 'sign_up_started');
        try {
            const { error } = await supabase.auth.signUp({
                email: validation.normalizedEmail,
                password,
            });
            if (error) {
                logError('AuthScreen.signUp', error, { authOperation: 'signUp' });
                setFormMessage({ tone: 'error', text: getSupabaseAuthErrorCopy(error, 'signUp') });
            } else {
                const successCopy = 'Check your email for the confirmation link, then return here to sign in.';
                addMonitoringBreadcrumb('auth', 'sign_up_succeeded');
                setFormMessage({ tone: 'success', text: successCopy });
                Alert.alert('Confirm your email', successCopy);
            }
        } catch (error) {
            logError('AuthScreen.signUp.unhandled', error, { authOperation: 'signUp' });
            setFormMessage({ tone: 'error', text: getSupabaseAuthErrorCopy(error, 'signUp') });
        } finally {
            endSubmit();
        }
    }

    async function sendPasswordReset() {
        if (submitInFlightRef.current) return;

        const validation = validatePasswordResetEmail(email);
        setEmail(validation.normalizedEmail);
        setFieldErrors(validation.errors);
        if (!validation.valid || !beginSubmit('resetRequest')) return;

        addMonitoringBreadcrumb('auth', 'password_reset_requested');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(validation.normalizedEmail, {
                redirectTo: PASSWORD_RECOVERY_REDIRECT_URL,
            });
            if (error) {
                logError('AuthScreen.passwordReset', error, { authOperation: 'resetPasswordForEmail' });
                setFormMessage({ tone: 'error', text: getSupabaseAuthErrorCopy(error, 'passwordResetRequest') });
            } else {
                const successCopy = 'If an account exists for that email, a reset link is on the way.';
                addMonitoringBreadcrumb('auth', 'password_reset_email_sent');
                setFormMessage({ tone: 'success', text: successCopy });
                Alert.alert('Reset link sent', successCopy);
            }
        } catch (error) {
            logError('AuthScreen.passwordReset.unhandled', error, { authOperation: 'resetPasswordForEmail' });
            setFormMessage({ tone: 'error', text: getSupabaseAuthErrorCopy(error, 'passwordResetRequest') });
        } finally {
            endSubmit();
        }
    }

    async function updateRecoveredPassword() {
        if (submitInFlightRef.current) return;

        const errors = validateNewPassword(newPassword, confirmPassword);
        setFieldErrors(errors);
        if (errors.password || errors.confirmPassword || !beginSubmit('passwordUpdate')) return;

        addMonitoringBreadcrumb('auth', 'password_update_started');
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                logError('AuthScreen.passwordUpdate', error, { authOperation: 'updateUserPassword' });
                setFormMessage({ tone: 'error', text: getSupabaseAuthErrorCopy(error, 'passwordUpdate') });
            } else {
                addMonitoringBreadcrumb('auth', 'password_update_succeeded');
                setNewPassword('');
                setConfirmPassword('');
                setFormMessage({ tone: 'success', text: 'Your password is updated.' });
                Alert.alert('Password updated', 'Your new password is saved.', [
                    { text: 'Continue', onPress: onPasswordRecoveryCompleted },
                ]);
            }
        } catch (error) {
            logError('AuthScreen.passwordUpdate.unhandled', error, { authOperation: 'updateUserPassword' });
            setFormMessage({ tone: 'error', text: getSupabaseAuthErrorCopy(error, 'passwordUpdate') });
        } finally {
            endSubmit();
        }
    }

    async function openExternalUrl(url: string, fallbackTitle: string, fallbackBody: string) {
        try {
            const supported = await Linking.canOpenURL(url);
            if (!supported) {
                Alert.alert(fallbackTitle, fallbackBody);
                return;
            }

            await Linking.openURL(url);
        } catch (error) {
            logError('AuthScreen.openExternalUrl', error);
            Alert.alert(fallbackTitle, fallbackBody);
        }
    }

    function openPrivacy() {
        if (APP_PRIVACY_POLICY_URL) {
            void openExternalUrl(APP_PRIVACY_POLICY_URL, 'Privacy policy', APP_PRIVACY_POLICY_URL);
            return;
        }

        Alert.alert(
            'Privacy policy',
            PRIVACY_POLICY_SECTIONS.map((section) => `${section.title}: ${section.body}`).join('\n\n'),
        );
    }

    function openSupport() {
        void openExternalUrl(APP_SUPPORT_MAILTO, 'Support email', APP_SUPPORT_EMAIL);
    }

    function switchToResetRequest() {
        setMode('resetRequest');
        setPassword('');
        setFieldErrors({});
        setFormMessage(null);
        setEmail(normalizeEmail(email));
    }

    function switchToSignIn() {
        setMode('signIn');
        setFieldErrors({});
        setFormMessage(null);
    }

    const isResetRequest = mode === 'resetRequest';
    const title = passwordRecovery ? 'Set a new password' : isResetRequest ? 'Reset password' : 'AthletiCore';
    const subtitle = passwordRecovery
        ? 'Choose a new password to finish recovery.'
        : isResetRequest
            ? 'Enter your email and we will send a reset link.'
            : 'Track. Train. Perform.';

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="dark" />

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
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

                <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.normal).springify()}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).duration(ANIMATION.normal).springify()} style={styles.form}>
                    {formMessage ? (
                        <Text
                            style={[
                                styles.formMessage,
                                formMessage.tone === 'success' ? styles.formMessageSuccess : styles.formMessageError,
                            ]}
                            accessibilityLiveRegion="polite"
                        >
                            {formMessage.text}
                        </Text>
                    ) : null}

                    {passwordRecovery ? (
                        <>
                            <TextInput
                                style={[
                                    styles.input,
                                    newPasswordFocused && styles.inputFocused,
                                    fieldErrors.password && styles.inputInvalid,
                                ]}
                                placeholder="New password"
                                placeholderTextColor={COLORS.text.tertiary}
                                value={newPassword}
                                onChangeText={setNewPasswordInput}
                                secureTextEntry
                                editable={!busy}
                                textContentType="newPassword"
                                accessibilityLabel="New password"
                                onFocus={() => setNewPasswordFocused(true)}
                                onBlur={() => setNewPasswordFocused(false)}
                            />
                            <Text style={[styles.requirementText, fieldErrors.password && styles.fieldError]} accessibilityLiveRegion="polite">
                                {fieldErrors.password ?? PASSWORD_REQUIREMENT_COPY}
                            </Text>

                            <TextInput
                                style={[
                                    styles.input,
                                    confirmPasswordFocused && styles.inputFocused,
                                    fieldErrors.confirmPassword && styles.inputInvalid,
                                ]}
                                placeholder="Confirm new password"
                                placeholderTextColor={COLORS.text.tertiary}
                                value={confirmPassword}
                                onChangeText={setConfirmPasswordInput}
                                secureTextEntry
                                editable={!busy}
                                textContentType="newPassword"
                                accessibilityLabel="Confirm new password"
                                onFocus={() => setConfirmPasswordFocused(true)}
                                onBlur={() => setConfirmPasswordFocused(false)}
                            />
                            {fieldErrors.confirmPassword ? (
                                <Text style={styles.fieldError} accessibilityLiveRegion="polite">{fieldErrors.confirmPassword}</Text>
                            ) : null}

                            <AnimatedPressable
                                accessibilityRole="button"
                                accessibilityLabel="Update password"
                                accessibilityState={{ disabled: busy, busy: activeSubmit === 'passwordUpdate' }}
                                style={[styles.primaryButtonWrapper, busy && styles.buttonDisabled]}
                                onPress={updateRecoveredPassword}
                                disabled={busy}
                            >
                                <LinearGradient
                                    colors={[...GRADIENTS.accent]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.primaryButton}
                                >
                                    <View style={styles.buttonContent}>
                                        {activeSubmit === 'passwordUpdate' ? <ActivityIndicator size="small" color={COLORS.text.inverse} /> : null}
                                        <Text style={styles.primaryButtonText}>
                                            {activeSubmit === 'passwordUpdate' ? 'Updating password...' : 'Update password'}
                                        </Text>
                                    </View>
                                </LinearGradient>
                            </AnimatedPressable>
                        </>
                    ) : isResetRequest ? (
                        <>
                            <TextInput
                                style={[
                                    styles.input,
                                    emailFocused && styles.inputFocused,
                                    fieldErrors.email && styles.inputInvalid,
                                ]}
                                placeholder="Email"
                                placeholderTextColor={COLORS.text.tertiary}
                                value={email}
                                onChangeText={setEmailInput}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                editable={!busy}
                                textContentType="emailAddress"
                                autoComplete="email"
                                accessibilityLabel="Email"
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => {
                                    setEmailFocused(false);
                                    setEmail((current) => normalizeEmail(current));
                                }}
                            />
                            {fieldErrors.email ? <Text style={styles.fieldError} accessibilityLiveRegion="polite">{fieldErrors.email}</Text> : null}

                            <AnimatedPressable
                                accessibilityRole="button"
                                accessibilityLabel="Send password reset link"
                                accessibilityState={{ disabled: busy, busy: activeSubmit === 'resetRequest' }}
                                style={[styles.primaryButtonWrapper, busy && styles.buttonDisabled]}
                                onPress={sendPasswordReset}
                                disabled={busy}
                            >
                                <LinearGradient
                                    colors={[...GRADIENTS.accent]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.primaryButton}
                                >
                                    <View style={styles.buttonContent}>
                                        {activeSubmit === 'resetRequest' ? <ActivityIndicator size="small" color={COLORS.text.inverse} /> : null}
                                        <Text style={styles.primaryButtonText}>
                                            {activeSubmit === 'resetRequest' ? 'Sending reset link...' : 'Send reset link'}
                                        </Text>
                                    </View>
                                </LinearGradient>
                            </AnimatedPressable>

                            <AnimatedPressable
                                accessibilityRole="button"
                                accessibilityLabel="Back to sign in"
                                accessibilityState={{ disabled: busy }}
                                style={styles.secondaryButton}
                                onPress={switchToSignIn}
                                disabled={busy}
                            >
                                <Text style={styles.secondaryButtonText}>Back to sign in</Text>
                            </AnimatedPressable>
                        </>
                    ) : (
                        <>
                            <TextInput
                                style={[
                                    styles.input,
                                    emailFocused && styles.inputFocused,
                                    fieldErrors.email && styles.inputInvalid,
                                ]}
                                placeholder="Email"
                                placeholderTextColor={COLORS.text.tertiary}
                                value={email}
                                onChangeText={setEmailInput}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                editable={!busy}
                                textContentType="emailAddress"
                                autoComplete="email"
                                accessibilityLabel="Email"
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => {
                                    setEmailFocused(false);
                                    setEmail((current) => normalizeEmail(current));
                                }}
                            />
                            {fieldErrors.email ? <Text style={styles.fieldError} accessibilityLiveRegion="polite">{fieldErrors.email}</Text> : null}

                            <TextInput
                                style={[
                                    styles.input,
                                    passwordFocused && styles.inputFocused,
                                    fieldErrors.password && styles.inputInvalid,
                                ]}
                                placeholder="Password"
                                placeholderTextColor={COLORS.text.tertiary}
                                value={password}
                                onChangeText={setPasswordInput}
                                secureTextEntry
                                editable={!busy}
                                textContentType="password"
                                autoComplete="password"
                                accessibilityLabel="Password"
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                            />
                            <Text style={[styles.requirementText, fieldErrors.password && styles.fieldError]} accessibilityLiveRegion="polite">
                                {fieldErrors.password ?? PASSWORD_REQUIREMENT_COPY}
                            </Text>

                            <View style={styles.forgotRow}>
                                <AnimatedPressable
                                    accessibilityRole="button"
                                    accessibilityLabel="Forgot password"
                                    accessibilityState={{ disabled: busy }}
                                    onPress={switchToResetRequest}
                                    disabled={busy}
                                >
                                    <Text style={[styles.textLink, busy && styles.linkDisabled]}>Forgot password?</Text>
                                </AnimatedPressable>
                            </View>

                            <AnimatedPressable
                                accessibilityRole="button"
                                accessibilityLabel="Sign in"
                                accessibilityState={{ disabled: busy, busy: activeSubmit === 'signIn' }}
                                style={[styles.primaryButtonWrapper, busy && styles.buttonDisabled]}
                                onPress={signInWithEmail}
                                disabled={busy}
                            >
                                <LinearGradient
                                    colors={[...GRADIENTS.accent]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.primaryButton}
                                >
                                    <View style={styles.buttonContent}>
                                        {activeSubmit === 'signIn' ? <ActivityIndicator size="small" color={COLORS.text.inverse} /> : null}
                                        <Text style={styles.primaryButtonText}>
                                            {activeSubmit === 'signIn' ? 'Signing in...' : 'Sign In'}
                                        </Text>
                                    </View>
                                </LinearGradient>
                            </AnimatedPressable>
                        </>
                    )}
                </Animated.View>

                {!passwordRecovery && !isResetRequest ? (
                    <Animated.View entering={FadeInDown.delay(300).duration(ANIMATION.normal).springify()} style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <AnimatedPressable
                            accessibilityRole="button"
                            accessibilityLabel="Create account"
                            accessibilityState={{ disabled: busy, busy: activeSubmit === 'signUp' }}
                            onPress={signUpWithEmail}
                            disabled={busy}
                        >
                            <Text style={[styles.footerLink, busy && styles.linkDisabled]}>
                                {activeSubmit === 'signUp' ? 'Creating...' : 'Create Account'}
                            </Text>
                        </AnimatedPressable>
                    </Animated.View>
                ) : null}

                {!passwordRecovery ? (
                    <Animated.View entering={FadeInDown.delay(360).duration(ANIMATION.normal).springify()} style={styles.legalLinks}>
                        <AnimatedPressable accessibilityRole="link" accessibilityLabel="Privacy policy" onPress={openPrivacy}>
                            <Text style={styles.legalLink}>Privacy</Text>
                        </AnimatedPressable>
                        <Text style={styles.legalSeparator}>/</Text>
                        <AnimatedPressable accessibilityRole="link" accessibilityLabel="Support" onPress={openSupport}>
                            <Text style={styles.legalLink}>Support</Text>
                        </AnimatedPressable>
                    </Animated.View>
                ) : null}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.xxl,
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
        lineHeight: 22,
    },
    form: {
        gap: SPACING.sm,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md + 2,
        minHeight: 52,
        fontSize: 16,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
    },
    inputFocused: {
        borderColor: COLORS.accent,
        ...SHADOWS.sm,
    },
    inputInvalid: {
        borderColor: COLORS.error,
    },
    requirementText: {
        marginTop: -SPACING.xs,
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        lineHeight: 18,
    },
    fieldError: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.error,
        lineHeight: 18,
    },
    formMessage: {
        borderRadius: RADIUS.md,
        borderWidth: 1,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        lineHeight: 19,
    },
    formMessageError: {
        color: COLORS.readiness.depleted,
        borderColor: `${COLORS.error}40`,
        backgroundColor: `${COLORS.error}12`,
    },
    formMessageSuccess: {
        color: COLORS.success,
        borderColor: `${COLORS.success}40`,
        backgroundColor: `${COLORS.success}12`,
    },
    forgotRow: {
        alignItems: 'flex-end',
        minHeight: 44,
        justifyContent: 'center',
    },
    textLink: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.readiness.prime,
    },
    primaryButtonWrapper: {
        marginTop: SPACING.sm,
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        ...SHADOWS.colored.accent,
    },
    primaryButton: {
        minHeight: 52,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.inverse,
    },
    secondaryButton: {
        minHeight: 48,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.sm,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    buttonDisabled: {
        opacity: 0.62,
    },
    linkDisabled: {
        opacity: 0.5,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 44,
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
    legalLinks: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.lg,
        minHeight: 44,
    },
    legalLink: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    legalSeparator: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
});
