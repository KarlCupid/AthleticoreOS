import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import { supabase } from './lib/supabase';
import { getSupabaseAuthErrorCopy, parsePasswordRecoveryLink } from './lib/api/authUx';
import {
  DEV_AUTH_ACCOUNTS,
  activateDevAuthAccount,
  clearActiveDevAuthAccount,
  createDevAuthEntryState,
  createDevAuthSession,
  getActiveDevAuthAccountSnapshot,
  hydratePersistedDevAuthAccount,
  subscribeDevAuthAccountChanges,
  type DevAuthAccount,
  type DevAuthAccountKey,
} from './lib/api/devAuthService';
import {
  createReadyAthleteJourneyAppEntryState,
  getAthleteJourneyAppEntryState,
  type AthleteJourneyAppEntryState,
} from './lib/api/athleteJourneyService';
import {
  readReadyAthleteJourneyEntryCache,
  writeReadyAthleteJourneyEntryCache,
} from './lib/api/athleteJourneyEntryCache';
import { setActiveAuthUserId } from './lib/api/athleteContextService';
import type { CoachIntakeResult } from './src/screens/onboarding/completeCoachIntake';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { TabNavigator } from './src/navigation/TabNavigator';
import { appLinking } from './src/navigation/linking';
import { isDevAuthShortcutEnabled } from './src/config/devSurfaces';
import { ReadinessThemeProvider } from './src/theme/ReadinessThemeContext';
import { InteractionModeProvider } from './src/context/InteractionModeContext';
import { APP_CHROME, COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING } from './src/theme/theme';
import { logError, logWarn } from './lib/utils/logger';
import { addMonitoringBreadcrumb, setCurrentMonitoringRoute } from './lib/observability/breadcrumbs';
import { capturePreviewMonitoringTestError } from './lib/observability/monitoring';
import { AuroraBackground, type AuroraBackgroundMood } from './src/components/AuroraBackground';
import { OceanLoader } from './src/components/OceanLoader';
import { CustomNumericPadProvider } from './src/components/CustomNumericInput';

const BRAND_LOGO = require('./assets/images/athleticore-logo.png');
const JOURNEY_ENTRY_LOOKUP_TIMEOUT_MS = 15000;

const myTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function withTimeout<T>(
  operation: (signal?: AbortSignal) => Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller?.abort();
      reject(new Error(message));
    }, timeoutMs);

    operation(controller?.signal).then(resolve, reject).finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });
  });
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [journeyEntryState, setJourneyEntryState] = useState<AthleteJourneyAppEntryState | null>(null);
  const [authLoadError, setAuthLoadError] = useState<Error | null>(null);
  const [journeyLoadError, setJourneyLoadError] = useState<Error | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingJourney, setCheckingJourney] = useState(false);
  const [authLoadAttempt, setAuthLoadAttempt] = useState(0);
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(false);
  const [passwordRecoveryNotice, setPasswordRecoveryNotice] = useState<string | null>(null);
  const [devAuthHydrated, setDevAuthHydrated] = useState(false);
  const [devAuthSelectingKey, setDevAuthSelectingKey] = useState<DevAuthAccountKey | null>(null);
  const sessionUserIdRef = useRef<string | null>(null);
  const devAuthAccountRef = useRef<DevAuthAccount | null>(null);
  const handledRecoveryUrlRef = useRef<string | null>(null);
  const navigationRef = useNavigationContainerRef();
  const devAuthEnabled = isDevAuthShortcutEnabled({
    dev: typeof __DEV__ !== 'undefined' && __DEV__,
    buildProfile: process.env.EXPO_PUBLIC_BUILD_PROFILE,
  });

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  useEffect(() => {
    addMonitoringBreadcrumb('app', 'root_component_mounted');
    capturePreviewMonitoringTestError();
  }, []);

  const applyDevAuthAccount = useCallback((account: DevAuthAccount | null) => {
    devAuthAccountRef.current = account;
    setDevAuthSelectingKey(null);

    if (!account) {
      if (!sessionUserIdRef.current) {
        setCheckingAuth(false);
        return;
      }

      setSession(null);
      sessionUserIdRef.current = null;
      setActiveAuthUserId(null);
      setJourneyEntryState(null);
      setJourneyLoadError(null);
      setCheckingJourney(false);
      setCheckingAuth(false);
      addMonitoringBreadcrumb('auth', 'dev_session_cleared');
      return;
    }

    const nextSession = createDevAuthSession(account);
    sessionUserIdRef.current = nextSession.user.id;
    setActiveAuthUserId(nextSession.user.id);
    setSession(nextSession);
    setAuthLoadError(null);
    setJourneyLoadError(null);
    setCheckingAuth(false);
    setCheckingJourney(false);
    setPasswordRecoveryActive(false);
    setPasswordRecoveryNotice(null);
    setJourneyEntryState(createDevAuthEntryState(account));
    addMonitoringBreadcrumb('auth', 'dev_session_selected', {
      accountKey: account.key,
      entryStatus: account.entryStatus,
    });
  }, []);

  useEffect(() => {
    if (!devAuthEnabled) {
      setDevAuthHydrated(true);
      return;
    }

    let isActive = true;
    const unsubscribe = subscribeDevAuthAccountChanges((account) => {
      if (isActive) {
        applyDevAuthAccount(account);
      }
    });

    hydratePersistedDevAuthAccount()
      .catch((error) => {
        logWarn('App.devAuthHydration.failed', error);
      })
      .finally(() => {
        if (isActive) {
          setDevAuthHydrated(true);
        }
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [applyDevAuthAccount, devAuthEnabled]);

  const handlePasswordRecoveryLink = useCallback(async (url: string | null) => {
    if (!url || handledRecoveryUrlRef.current === url) {
      return;
    }

    const recoveryLink = parsePasswordRecoveryLink(url);
    if (!recoveryLink) {
      return;
    }

    handledRecoveryUrlRef.current = url;

    if (recoveryLink.error || recoveryLink.errorDescription) {
      addMonitoringBreadcrumb('auth', 'password_recovery_link_rejected', { hasDescription: Boolean(recoveryLink.errorDescription) });
      setPasswordRecoveryActive(false);
      setPasswordRecoveryNotice(recoveryLink.errorDescription ?? 'That reset link could not be opened. Request a new password reset email.');
      return;
    }

    setPasswordRecoveryNotice(null);
    addMonitoringBreadcrumb('auth', 'password_recovery_link_opened', {
      hasTokenSession: Boolean(recoveryLink.accessToken && recoveryLink.refreshToken),
      hasCode: Boolean(recoveryLink.code),
    });

    try {
      const recoveryResult = recoveryLink.code
        ? await supabase.auth.exchangeCodeForSession(recoveryLink.code)
        : recoveryLink.accessToken && recoveryLink.refreshToken
          ? await supabase.auth.setSession({
            access_token: recoveryLink.accessToken,
            refresh_token: recoveryLink.refreshToken,
          })
          : null;

      if (!recoveryResult) {
        setPasswordRecoveryActive(false);
        setPasswordRecoveryNotice('That reset link is incomplete. Request a new password reset email.');
        return;
      }

      if (recoveryResult.error) {
        logError('App.passwordRecoveryLink', recoveryResult.error, { authOperation: 'passwordRecoveryLink' });
        setPasswordRecoveryActive(false);
        setPasswordRecoveryNotice(getSupabaseAuthErrorCopy(recoveryResult.error, 'passwordUpdate'));
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      setAuthLoadError(null);
      setPasswordRecoveryActive(true);
      addMonitoringBreadcrumb('auth', 'password_recovery_session_ready');
    } catch (error) {
      logError('App.passwordRecoveryLink.unhandled', error, { authOperation: 'passwordRecoveryLink' });
      setPasswordRecoveryActive(false);
      setPasswordRecoveryNotice(getSupabaseAuthErrorCopy(error, 'passwordUpdate'));
      await supabase.auth.signOut({ scope: 'local' });
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    Linking.getInitialURL()
      .then((url) => {
        if (isActive) {
          void handlePasswordRecoveryLink(url);
        }
      })
      .catch((error) => {
        logError('App.passwordRecoveryInitialUrl', error, { authOperation: 'getInitialURL' });
      });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handlePasswordRecoveryLink(url);
    });

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [handlePasswordRecoveryLink]);

  useEffect(() => {
    let isActive = true;
    const activeDevAccount = getActiveDevAuthAccountSnapshot();

    if (devAuthEnabled && !devAuthHydrated) {
      return () => {
        isActive = false;
      };
    }

    if (activeDevAccount) {
      applyDevAuthAccount(activeDevAccount);
      return () => {
        isActive = false;
      };
    }

    setCheckingAuth(true);
    setAuthLoadError(null);
    addMonitoringBreadcrumb('auth', 'session_lookup_started', { attempt: authLoadAttempt });

    supabase.auth.getSession()
      .then(({ data: { session: currentSession }, error }) => {
        if (!isActive) {
          return;
        }

        if (error) {
          throw error;
        }

        const nextUserId = currentSession?.user.id ?? null;
        sessionUserIdRef.current = nextUserId;
        setActiveAuthUserId(nextUserId);
        setSession(currentSession);
        addMonitoringBreadcrumb('auth', 'session_lookup_succeeded', {
          sessionPresent: Boolean(currentSession),
        });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        logError('App.authSessionLookup', error, { authOperation: 'getSession' });
        setAuthLoadError(toError(error));
      })
      .finally(() => {
        if (isActive) {
          setCheckingAuth(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [applyDevAuthAccount, authLoadAttempt, devAuthEnabled, devAuthHydrated]);

  useEffect(() => {
    let isActive = true;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isActive) {
        return;
      }
      if (devAuthAccountRef.current) {
        return;
      }

      const previousUserId = sessionUserIdRef.current;
      const nextUserId = nextSession?.user.id ?? null;

      sessionUserIdRef.current = nextUserId;
      setActiveAuthUserId(nextUserId);
      setSession(nextSession);
      addMonitoringBreadcrumb('auth', 'auth_state_changed', {
        authEvent: event,
        sessionPresent: Boolean(nextSession),
        userChanged: previousUserId !== nextUserId,
      });
      if (nextSession) {
        setAuthLoadError(null);
      }

      if (event === 'PASSWORD_RECOVERY' && nextSession) {
        setPasswordRecoveryActive(true);
        setPasswordRecoveryNotice(null);
      }

      if (nextUserId && previousUserId !== nextUserId) {
        setJourneyLoadError(null);
        setJourneyEntryState(null);
      }

      if (!nextSession) {
        setPasswordRecoveryActive(false);
        setJourneyEntryState(null);
        setJourneyLoadError(null);
        setCheckingJourney(false);
      }
    });

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;
  const entryStatus = journeyEntryState?.status ?? null;
  const navigationScopeKey = useMemo(() => {
    const authScope = session?.user.id ?? 'signed-out';
    const entryScope = passwordRecoveryActive
      ? 'password-recovery'
      : session
        ? entryStatus ?? 'checking-entry'
        : 'auth';
    return `${authScope}:${entryScope}`;
  }, [entryStatus, passwordRecoveryActive, session]);
  const navigationLinking = useMemo(() => (
    session && entryStatus === 'ready' && !passwordRecoveryActive ? appLinking : undefined
  ), [entryStatus, passwordRecoveryActive, session]);

  const refreshJourneyEntryState = useCallback(async () => {
    if (devAuthAccountRef.current) {
      setCheckingJourney(false);
      setJourneyLoadError(null);
      setJourneyEntryState(createDevAuthEntryState(devAuthAccountRef.current));
      return;
    }

    if (!userId) {
      setCheckingJourney(false);
      setJourneyEntryState(null);
      return;
    }

    setCheckingJourney(true);
    setJourneyLoadError(null);
    addMonitoringBreadcrumb('journey', 'entry_lookup_started', { hasUserId: Boolean(userId) });
    try {
      const cachedEntryState = await readReadyAthleteJourneyEntryCache(userId);
      if (cachedEntryState && sessionUserIdRef.current === userId) {
        setJourneyEntryState(cachedEntryState);
        addMonitoringBreadcrumb('journey', 'entry_lookup_cache_warmed', { status: cachedEntryState.status });
      }

      const entryState = await withTimeout(
        (signal) => getAthleteJourneyAppEntryState(userId, signal ? { signal } : {}),
        JOURNEY_ENTRY_LOOKUP_TIMEOUT_MS,
        'Athlete profile lookup timed out. Check your connection and try again.',
      );

      if (sessionUserIdRef.current !== userId) {
        return;
      }

      setJourneyEntryState(entryState);
      void writeReadyAthleteJourneyEntryCache(userId, entryState);
      addMonitoringBreadcrumb('journey', 'entry_lookup_succeeded', { status: entryState.status });
    } catch (error) {
      if (sessionUserIdRef.current !== userId) {
        return;
      }

      const cachedEntryState = await readReadyAthleteJourneyEntryCache(userId);
      if (cachedEntryState) {
        logWarn('App.journeyEntryLookup.cacheFallback', error, { journeyOperation: 'getAppEntryState' });
        setJourneyEntryState(cachedEntryState);
        setJourneyLoadError(null);
        addMonitoringBreadcrumb('journey', 'entry_lookup_cache_fallback', { status: cachedEntryState.status });
        return;
      }

      logWarn('App.journeyEntryLookup.failed', error, { journeyOperation: 'getAppEntryState' });
      setJourneyEntryState(null);
      setJourneyLoadError(toError(error));
      addMonitoringBreadcrumb('journey', 'entry_lookup_failed_without_cache', {
        hasCache: false,
      }, 'warning');
    } finally {
      setCheckingJourney(false);
    }
  }, [userId]);

  const handleOnboardingComplete = useCallback((result: CoachIntakeResult) => {
    if (devAuthAccountRef.current) {
      const completedDevAccount = { ...devAuthAccountRef.current, entryStatus: 'ready' as const };
      devAuthAccountRef.current = completedDevAccount;
    }

    const entryState = createReadyAthleteJourneyAppEntryState({
      journey: result.journey,
      performanceState: result.performanceState,
    });

    setJourneyLoadError(null);
    setCheckingJourney(false);
    setJourneyEntryState(entryState);

    if (userId) {
      void writeReadyAthleteJourneyEntryCache(userId, entryState);
    }

    addMonitoringBreadcrumb('journey', 'entry_state_ready_from_onboarding', {
      generatedPlan: result.generatedPlan,
    });
  }, [userId]);

  useEffect(() => {
    void refreshJourneyEntryState();
  }, [refreshJourneyEntryState]);

  const retryAppLoad = useCallback(() => {
    if (authLoadError) {
      setAuthLoadAttempt((attempt) => attempt + 1);
      return;
    }

    if (userId) {
      void refreshJourneyEntryState();
      return;
    }

    setAuthLoadAttempt((attempt) => attempt + 1);
  }, [authLoadError, refreshJourneyEntryState, userId]);

  const handleSignOut = useCallback(async () => {
    setAuthLoadError(null);
    setCheckingJourney(false);
    setJourneyEntryState(null);
    setJourneyLoadError(null);
    setPasswordRecoveryActive(false);
    setPasswordRecoveryNotice(null);

    addMonitoringBreadcrumb('auth', 'sign_out_started');
    if (devAuthAccountRef.current) {
      await clearActiveDevAuthAccount();
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      logError('App.signOut', error, { authOperation: 'signOut' });
      setJourneyLoadError(error);
      return;
    }

    setSession(null);
    sessionUserIdRef.current = null;
    setActiveAuthUserId(null);
    addMonitoringBreadcrumb('auth', 'sign_out_succeeded');
  }, []);

  const handleSelectDevAuthAccount = useCallback(async (key: DevAuthAccountKey) => {
    if (!devAuthEnabled || devAuthSelectingKey) return;

    setDevAuthSelectingKey(key);
    try {
      await activateDevAuthAccount(key);
    } catch (error) {
      logError('App.selectDevAuthAccount', error, { authOperation: 'devAuth' });
      setDevAuthSelectingKey(null);
      setPasswordRecoveryNotice('Developer account could not be opened. Try again.');
    }
  }, [devAuthEnabled, devAuthSelectingKey]);

  const handleNavigationReady = useCallback(() => {
    setCurrentMonitoringRoute(navigationRef.getCurrentRoute()?.name ?? 'unknown');
  }, [navigationRef]);

  const handleNavigationStateChange = useCallback(() => {
    setCurrentMonitoringRoute(navigationRef.getCurrentRoute()?.name ?? 'unknown');
  }, [navigationRef]);

  if (!fontsLoaded) {
    return (
      <AppLoadingScreen copy="Preparing Athleticore OS" />
    );
  }

  const appLoadError = passwordRecoveryActive ? null : authLoadError ?? journeyLoadError;
  const content = appLoadError ? (
    <AppLoadErrorScreen
      loading={checkingAuth || checkingJourney}
      onRetry={retryAppLoad}
      onSignOut={session ? handleSignOut : undefined}
    />
  ) : passwordRecoveryActive ? (
    <AuthScreen
      passwordRecovery
      notice={passwordRecoveryNotice}
      onPasswordRecoveryCompleted={() => {
        setPasswordRecoveryActive(false);
        setPasswordRecoveryNotice(null);
        void refreshJourneyEntryState();
      }}
    />
  ) : checkingAuth ? (
    <AppLoadingScreen />
  ) : !session ? (
    <AuthScreen
      notice={passwordRecoveryNotice}
      devAuthAccounts={devAuthEnabled ? DEV_AUTH_ACCOUNTS : []}
      activeDevAuthAccountKey={devAuthSelectingKey}
      onSelectDevAuthAccount={devAuthEnabled ? handleSelectDevAuthAccount : undefined}
    />
  ) : entryStatus === null ? (
    <AppLoadingScreen />
  ) : entryStatus === 'needs_onboarding' ? (
    <OnboardingScreen onComplete={handleOnboardingComplete} />
  ) : (
    <TabNavigator />
  );
  const backgroundMood: AuroraBackgroundMood = passwordRecoveryActive || !session || entryStatus === 'needs_onboarding' ? 'hero' : 'calm';

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ReadinessThemeProvider>
          <InteractionModeProvider>
            <NavigationContainer
              key={navigationScopeKey}
              ref={navigationRef}
              theme={myTheme}
              onReady={handleNavigationReady}
              onStateChange={handleNavigationStateChange}
              {...(navigationLinking ? { linking: navigationLinking } : {})}
            >
              <CustomNumericPadProvider>
                <View style={styles.container}>
                  <AuroraBackground mood={backgroundMood} />
                  <StatusBar
                    style="light"
                    backgroundColor={APP_CHROME.background}
                    translucent={false}
                  />
                  {content}
                </View>
              </CustomNumericPadProvider>
            </NavigationContainer>
          </InteractionModeProvider>
        </ReadinessThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppLoadingScreen({ copy = 'Connecting athlete profile.' }: { copy?: string }) {
  return (
    <View style={[styles.container, styles.centered, styles.loadingScreen]}>
      <View style={styles.loadingMarkShell}>
        <Image source={BRAND_LOGO} style={styles.loadingMark} resizeMode="cover" />
      </View>
      <Text style={styles.loadingWordmark}>ATHLETICORE OS</Text>
      <View style={styles.loadingRing}>
        <OceanLoader color={COLORS.readiness.prime} />
      </View>
      <Text style={styles.loadingCopy}>{copy}</Text>
    </View>
  );
}

function AppLoadErrorScreen({
  loading,
  onRetry,
  onSignOut,
}: {
  loading: boolean;
  onRetry: () => void;
  onSignOut?: (() => void) | undefined;
}) {
  return (
    <View style={[styles.container, styles.centered, styles.errorScreen]}>
      <View style={styles.errorPanel}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>!</Text>
        </View>
        <Text style={styles.errorTitle}>We couldn&apos;t load your athlete profile</Text>
        <Text style={styles.errorBody}>Your data is safe. Check your connection and try again.</Text>

        <View style={styles.errorActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try loading athlete profile again"
            accessibilityHint="Retries loading your signed-in athlete data."
            disabled={loading}
            onPress={onRetry}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || loading) && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Trying again...' : 'Try again'}</Text>
          </Pressable>

          {onSignOut ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              accessibilityHint="Signs out and returns to the authentication screen."
              disabled={loading}
              onPress={onSignOut}
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || loading) && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CHROME.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorScreen: {
    paddingHorizontal: SPACING.xl,
  },
  errorPanel: {
    width: '100%',
    maxWidth: 420,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  errorIcon: {
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.readiness.depleted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    backgroundColor: `${COLORS.error}18`,
  },
  errorIconText: {
    color: COLORS.readiness.depleted,
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 18,
  },
  errorTitle: {
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  errorBody: {
    marginTop: SPACING.md,
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  errorActions: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
  },
  primaryButtonText: {
    color: COLORS.text.inverse,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.lg,
  },
  secondaryButtonText: {
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.65,
  },
  loadingScreen: {
    paddingHorizontal: SPACING.xl,
  },
  loadingMarkShell: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.62)',
    ...SHADOWS.colored.accent,
  },
  loadingMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  loadingWordmark: {
    marginTop: SPACING.lg,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 18,
    letterSpacing: 4,
  },
  loadingRing: {
    marginTop: SPACING.lg,
  },
  loadingCopy: {
    marginTop: SPACING.md,
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    textAlign: 'center',
  },
});
