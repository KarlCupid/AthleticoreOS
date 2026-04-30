import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { getAthleteJourneyAppEntryState, type AthleteJourneyAppEntryState } from './lib/api/athleteJourneyService';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { TabNavigator } from './src/navigation/TabNavigator';
import { PlanningSetupStackNavigator } from './src/navigation/PlanningSetupStack';
import { appLinking } from './src/navigation/linking';
import { ReadinessThemeProvider } from './src/theme/ReadinessThemeContext';
import { InteractionModeProvider } from './src/context/InteractionModeContext';
import { APP_CHROME, COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING } from './src/theme/theme';
import { logError } from './lib/utils/logger';
import { AuroraBackground, type AuroraBackgroundMood } from './src/components/AuroraBackground';
import { OceanLoader } from './src/components/OceanLoader';

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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [journeyEntryState, setJourneyEntryState] = useState<AthleteJourneyAppEntryState | null>(null);
  const [authLoadError, setAuthLoadError] = useState<Error | null>(null);
  const [journeyLoadError, setJourneyLoadError] = useState<Error | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingJourney, setCheckingJourney] = useState(false);
  const [authLoadAttempt, setAuthLoadAttempt] = useState(0);
  const sessionUserIdRef = useRef<string | null>(null);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  useEffect(() => {
    let isActive = true;

    setCheckingAuth(true);
    setAuthLoadError(null);

    supabase.auth.getSession()
      .then(({ data: { session: currentSession }, error }) => {
        if (!isActive) {
          return;
        }

        if (error) {
          throw error;
        }

        sessionUserIdRef.current = currentSession?.user.id ?? null;
        setSession(currentSession);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        logError('App.authSessionLookup', error);
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
  }, [authLoadAttempt]);

  useEffect(() => {
    let isActive = true;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) {
        return;
      }

      const previousUserId = sessionUserIdRef.current;
      const nextUserId = nextSession?.user.id ?? null;

      sessionUserIdRef.current = nextUserId;
      setSession(nextSession);
      if (nextSession) {
        setAuthLoadError(null);
      }

      if (nextUserId && previousUserId !== nextUserId) {
        setJourneyLoadError(null);
        setJourneyEntryState(null);
      }

      if (!nextSession) {
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

  const refreshJourneyEntryState = useCallback(async () => {
    if (!userId) {
      setCheckingJourney(false);
      setJourneyEntryState(null);
      return;
    }

    setCheckingJourney(true);
    setJourneyLoadError(null);
    try {
      const entryState = await getAthleteJourneyAppEntryState(userId);
      setJourneyEntryState(entryState);
    } catch (error) {
      logError('App.journeyEntryLookup', error);
      setJourneyLoadError(toError(error));
    } finally {
      setCheckingJourney(false);
    }
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

    const { error } = await supabase.auth.signOut();
    if (error) {
      logError('App.signOut', error);
      setJourneyLoadError(error);
      return;
    }

    setSession(null);
    sessionUserIdRef.current = null;
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <OceanLoader color={COLORS.text.primary} />
      </View>
    );
  }

  const entryStatus = journeyEntryState?.status ?? null;
  const appLoadError = authLoadError ?? journeyLoadError;
  const content = appLoadError ? (
    <AppLoadErrorScreen
      loading={checkingAuth || checkingJourney}
      onRetry={retryAppLoad}
      onSignOut={session ? handleSignOut : undefined}
    />
  ) : checkingAuth ? (
    <View style={[styles.container, styles.centered]}>
      <OceanLoader color={COLORS.readiness.prime} />
    </View>
  ) : !session ? (
    <AuthScreen />
  ) : checkingJourney || entryStatus === null ? (
    <View style={[styles.container, styles.centered]}>
      <OceanLoader color={COLORS.readiness.prime} />
    </View>
  ) : entryStatus === 'needs_onboarding' ? (
    <OnboardingScreen onComplete={() => { void refreshJourneyEntryState(); }} />
  ) : entryStatus === 'needs_training_setup' ? (
    <PlanningSetupStackNavigator onComplete={() => { void refreshJourneyEntryState(); }} />
  ) : (
    <TabNavigator />
  );
  const backgroundMood: AuroraBackgroundMood = !session || entryStatus === 'needs_onboarding' ? 'hero' : 'calm';

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ReadinessThemeProvider>
          <InteractionModeProvider>
            <NavigationContainer theme={myTheme} linking={appLinking}>
              <View style={styles.container}>
                <AuroraBackground mood={backgroundMood} />
                <StatusBar style="dark" />
                {content}
              </View>
            </NavigationContainer>
          </InteractionModeProvider>
        </ReadinessThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
        <Text style={styles.errorTitle}>We couldn&apos;t load your athlete profile</Text>
        <Text style={styles.errorBody}>Your data is safe. Check your connection and try again.</Text>

        <View style={styles.errorActions}>
          <Pressable
            accessibilityRole="button"
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
});
