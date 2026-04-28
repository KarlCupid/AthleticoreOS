import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { APP_CHROME, COLORS } from './src/theme/theme';
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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [journeyEntryState, setJourneyEntryState] = useState<AthleteJourneyAppEntryState | null>(null);
  const [checkingJourney, setCheckingJourney] = useState(false);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  useEffect(() => {
    let isActive = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (isActive) {
        setSession(currentSession);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) {
        return;
      }

      setSession(nextSession);

      if (!nextSession) {
        setJourneyEntryState(null);
        setCheckingJourney(false);
      }
    });

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshJourneyEntryState = useCallback(async () => {
    if (!session?.user) {
      setCheckingJourney(false);
      setJourneyEntryState(null);
      return;
    }

    setCheckingJourney(true);
    try {
      const entryState = await getAthleteJourneyAppEntryState(session.user.id);
      setJourneyEntryState(entryState);
    } catch (error) {
      logError('App.journeyEntryLookup', error);
      setJourneyEntryState({
        status: 'needs_onboarding',
        hasProfile: false,
        needsTrainingSetup: false,
        journey: null,
        performanceState: null,
      });
    } finally {
      setCheckingJourney(false);
    }
  }, [session?.user]);

  useEffect(() => {
    void refreshJourneyEntryState();
  }, [refreshJourneyEntryState]);

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <OceanLoader color={COLORS.text.primary} />
      </View>
    );
  }

  const entryStatus = journeyEntryState?.status ?? null;
  const content = !session ? (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CHROME.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
