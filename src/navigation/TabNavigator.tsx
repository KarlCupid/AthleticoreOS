import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconActivity, IconBarChart, IconCalendar, IconPerson, IconRestaurant } from '../components/icons';
import { TodayStackNavigator } from './TodayStack';
import { TrainStackNavigator } from './TrainStack';
import { PlanStackNavigator } from './PlanStack';
import { FuelStackNavigator } from './FuelStack';
import { MeStackNavigator } from './MeStack';
import { ANIMATION, APP_CHROME, COLORS, RADIUS, SHADOWS, SPACING } from '../theme/theme';
import { useInteractionMode } from '../context/InteractionModeContext';

const Tab = createBottomTabNavigator();

function shouldHideTabBar(route: Parameters<typeof getFocusedRouteNameFromRoute>[0]) {
  const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'WorkoutHome';
  return focusedRouteName === 'GuidedWorkout' || focusedRouteName === 'WorkoutSummary';
}

function TabIcon({ focused, color, label, IconComponent }: { focused: boolean; color: string; label: string; IconComponent: any }) {
  const scale = useSharedValue(focused ? 1.05 : 1);
  const dotOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.05 : 1, { damping: 12, stiffness: 200 });
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
    <Animated.View style={[animatedStyle, styles.tabIconWrap]}>
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
  const insets = useSafeAreaInsets();
  const bottomInset = mode === 'gym-floor' ? 0 : insets.bottom;
  const tabBarTopPadding = Platform.OS === 'ios' ? 16 : 12;
  const tabBarBottomPadding = Platform.OS === 'ios' ? 0 : 2;
  const tabBarHeight = (Platform.OS === 'ios' ? 50 : 56) + bottomInset;
  const tabBarInnerHeight = tabBarHeight - tabBarTopPadding - tabBarBottomPadding;
  const tabBarVisualTopInset = Platform.OS === 'ios' ? 8 : 3;
  const baseTabBarStyle = {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: tabBarHeight,
    paddingBottom: tabBarBottomPadding,
    paddingTop: tabBarTopPadding,
    paddingHorizontal: 12,
    borderTopWidth: 0,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : COLORS.surface,
    ...SHADOWS.header,
    display: mode === 'gym-floor' ? 'none' as const : 'flex' as const,
  };

  return (
    <Tab.Navigator
      // @ts-expect-error sceneContainerStyle is passed successfully but causes TS issue
      sceneContainerStyle={{
        paddingBottom: mode === 'gym-floor' ? 0 : tabBarHeight,
      }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: baseTabBarStyle,
        tabBarItemStyle: {
          height: tabBarInnerHeight,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 0,
          paddingTop: Platform.OS === 'ios' ? 10 : 5,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <View style={StyleSheet.absoluteFill}>
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  top: tabBarVisualTopInset,
                  overflow: 'hidden',
                  borderTopLeftRadius: RADIUS.xxl,
                  borderTopRightRadius: RADIUS.xxl,
                }}
              >
                <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.92)' }]} />
              </View>
            </View>
          ) : (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                top: tabBarVisualTopInset,
                backgroundColor: COLORS.surface,
                borderTopLeftRadius: RADIUS.xxl,
                borderTopRightRadius: RADIUS.xxl,
              }}
            />
          )
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
        options={({ route }) => ({
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Train" IconComponent={IconActivity} />,
          tabBarStyle: shouldHideTabBar(route)
            ? { display: 'none' }
            : baseTabBarStyle,
        })}
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
  tabIconWrap: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    transform: [{ translateY: Platform.OS === 'ios' ? 12 : 6 }],
  },
  iconChip: {
    minWidth: 36,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
    textAlign: 'center',
  },
  activeDot: {
    opacity: 1,
  },
});
