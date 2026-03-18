import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { IconBarChart, IconCalendar, IconPerson } from '../components/icons';
import { HomeStackNavigator } from './HomeStack';
import { PlanStackNavigator } from './PlanStack';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { COLORS, RADIUS, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { useInteractionMode } from '../context/InteractionModeContext';

const Tab = createBottomTabNavigator();

function TabIcon({ focused, color, IconComponent }: { focused: boolean; color: string; IconComponent: any }) {
  const scale = useSharedValue(focused ? 1.1 : 1);
  const dotOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, { damping: 12, stiffness: 200 });
    dotOpacity.value = withTiming(focused ? 1 : 0, { duration: ANIMATION.fast });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    alignItems: 'center',
    justifyContent: 'center',
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotOpacity.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <IconComponent size={24} color={color} focused={focused} />
      <Animated.View style={[styles.activeDot, { backgroundColor: color }, dotStyle]} />
    </Animated.View>
  );
}

export function TabNavigator() {
  const { themeColor } = useReadinessTheme();
  const { mode } = useInteractionMode();

  return (
    <Tab.Navigator
      // @ts-expect-error sceneContainerStyle is passed successfully but causes TS issue
      sceneContainerStyle={{
        paddingBottom: mode === 'gym-floor' ? 0 : (Platform.OS === 'ios' ? 70 : 60),
      }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 70 : 60,
          paddingBottom: Platform.OS === 'ios' ? 14 : 4,
          paddingTop: 8,
          borderTopWidth: 0,
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : COLORS.surface,
          elevation: Platform.OS === 'android' ? 8 : 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          display: mode === 'gym-floor' ? 'none' : 'flex',
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl }}>
              <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.75)' }]} />
            </View>
          ) : null
        ),
        tabBarActiveTintColor: themeColor,
        tabBarInactiveTintColor: COLORS.text.tertiary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} IconComponent={IconBarChart} />,
        }}
      />
      <Tab.Screen
        name="Plan"
        component={PlanStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} IconComponent={IconCalendar} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileSettingsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} IconComponent={IconPerson} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
  },
});
