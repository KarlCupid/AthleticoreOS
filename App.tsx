import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { supabase } from './lib/supabase';
import { getPlanningSetupStatus } from './lib/api/planningSetupService';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { TabNavigator } from './src/navigation/TabNavigator';
import { PlanningSetupStackNavigator } from './src/navigation/PlanningSetupStack';
import { ReadinessThemeProvider } from './src/theme/ReadinessThemeContext';
import { InteractionModeProvider } from './src/context/InteractionModeContext';
import { COLORS } from './src/theme/theme';
import { logError } from './lib/utils/logger';

const myTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
  },
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [hasPlanningSetup, setHasPlanningSetup] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_800ExtraBold,
    Inter_900Black,
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
        setHasProfile(null);
        setHasPlanningSetup(null);
        setCheckingProfile(false);
      }
    });

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setCheckingProfile(false);
      return;
    }

    let isActive = true;

    const loadProfileState = async () => {
      setCheckingProfile(true);

      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!isActive) {
        return;
      }

      if (error) {
        logError('App.profileLookup', error);
        setHasProfile(false);
        setHasPlanningSetup(false);
        setCheckingProfile(false);
        return;
      }

      const profileExists = Boolean(data);
      setHasProfile(profileExists);

      if (!profileExists) {
        setHasPlanningSetup(null);
        setCheckingProfile(false);
        return;
      }

      try {
        const planningStatus = await getPlanningSetupStatus(session.user.id);
        if (!isActive) {
          return;
        }
        setHasPlanningSetup(planningStatus.isComplete);
      } catch (planningError) {
        logError('App.planningSetupLookup', planningError);
        setHasPlanningSetup(false);
      }

      setCheckingProfile(false);
    };

    loadProfileState();

    return () => {
      isActive = false;
    };
  }, [session?.user?.id]);

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.text.primary} />
      </View>
    );
  }

  const content = !session ? (
    <AuthScreen />
  ) : checkingProfile || hasProfile === null || (hasProfile && hasPlanningSetup === null) ? (
    <View style={[styles.container, styles.centered]}>
      <ActivityIndicator size="large" color={COLORS.readiness.prime} />
    </View>
  ) : !hasProfile ? (
    <OnboardingScreen onComplete={() => { setHasProfile(true); setHasPlanningSetup(false); }} />
  ) : !hasPlanningSetup ? (
    <PlanningSetupStackNavigator onComplete={() => setHasPlanningSetup(true)} />
  ) : (
    <TabNavigator />
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ReadinessThemeProvider>
          <InteractionModeProvider>
            <NavigationContainer theme={myTheme}>
              <View style={styles.container}>
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
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
