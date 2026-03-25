import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { IconActivity, IconBarChart, IconCalendar, IconPerson, IconRestaurant } from '../components/icons';
import { TodayStackNavigator } from './TodayStack';
import { TrainStackNavigator } from './TrainStack';
import { PlanStackNavigator } from './PlanStack';
import { FuelStackNavigator } from './FuelStack';
import { MeStackNavigator } from './MeStack';
import { ANIMATION, APP_CHROME, COLORS, RADIUS, SHADOWS, SPACING } from '../theme/theme';
import { useInteractionMode } from '../context/InteractionModeContext';

const Tab = createBottomTabNavigator();

function TabIcon({ focused, color, label, IconComponent }: { focused: boolean; color: string; label: string; IconComponent: any }) {
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
      <View style={[styles.iconChip, focused && { backgroundColor: `${APP_CHROME.accent}18` }]}>
        <IconComponent size={20} color={color} focused={focused} />
      </View>
      <Animated.Text style={[styles.label, { color }, dotStyle]}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
}

export function TabNavigator() {
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
          bottom: Platform.OS === 'ios' ? 16 : 12,
          left: SPACING.md,
          right: SPACING.md,
          height: Platform.OS === 'ios' ? 76 : 72,
          paddingBottom: Platform.OS === 'ios' ? 12 : 10,
          paddingTop: 10,
          paddingHorizontal: 10,
          borderTopWidth: 0,
          borderRadius: RADIUS.xxl,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : COLORS.surface,
          ...SHADOWS.header,
          display: mode === 'gym-floor' ? 'none' : 'flex',
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: RADIUS.xxl }}>
              <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.92)' }]} />
            </View>
          ) : null
        ),
        tabBarActiveTintColor: APP_CHROME.accent,
        tabBarInactiveTintColor: COLORS.text.tertiary,
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Today" IconComponent={IconBarChart} />,
        }}
      />
      <Tab.Screen
        name="Train"
        component={TrainStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Train" IconComponent={IconActivity} />,
        }}
      />
      <Tab.Screen
        name="Plan"
        component={PlanStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Plan" IconComponent={IconCalendar} />,
        }}
      />
      <Tab.Screen
        name="Fuel"
        component={FuelStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Fuel" IconComponent={IconRestaurant} />,
        }}
      />
      <Tab.Screen
        name="Me"
        component={MeStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Me" IconComponent={IconPerson} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconChip: {
    minWidth: 40,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  activeDot: {
    opacity: 1,
  },
});
