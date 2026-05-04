import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconActivity, IconBarChart, IconCalendar, IconPerson, IconRestaurant } from '../components/icons';
import type { IconProps } from '../components/icons';
import { TodayStackNavigator } from './TodayStack';
import { TrainStackNavigator } from './TrainStack';
import { PlanStackNavigator } from './PlanStack';
import { FuelStackNavigator } from './FuelStack';
import { MeStackNavigator } from './MeStack';
import { ANIMATION, APP_CHROME, COLORS, RADIUS, SHADOWS, TAP_TARGETS } from '../theme/theme';
import { useInteractionMode } from '../context/InteractionModeContext';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

function shouldHideTabBar(route: Parameters<typeof getFocusedRouteNameFromRoute>[0]) {
  const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'WorkoutHome';
  return focusedRouteName === 'GuidedWorkout' || focusedRouteName === 'WorkoutSummary';
}

function TabIcon(props: {
  focused: boolean;
  color: string;
  label: string;
  IconComponent: React.ComponentType<IconProps>;
  testID: string;
}) {
  const { focused, color, label, IconComponent, testID } = props;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1.05 : 1, { damping: 12, stiffness: 200 }) }],
    alignItems: 'center',
    justifyContent: 'center',
  }), [focused]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: ANIMATION.fast }),
    transform: [{ scale: withTiming(focused ? 1 : 0, { duration: ANIMATION.fast }) }],
  }), [focused]);

  return (
    <Animated.View accessible={false} style={[animatedStyle, styles.tabIconWrap]} testID={testID}>
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
  const tabBarTopPadding = Platform.OS === 'ios' ? 8 : 6;
  const tabBarBottomPadding = Math.max(bottomInset, Platform.OS === 'ios' ? 8 : 4);
  const tabBarInnerHeight = Math.max(TAP_TARGETS.plan.recommended, Platform.OS === 'ios' ? 56 : 52);
  const tabBarHeight = tabBarInnerHeight + tabBarTopPadding + tabBarBottomPadding;
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
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    ...SHADOWS.header,
    display: mode === 'gym-floor' ? 'none' as const : 'flex' as const,
  };

  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync();
        },
      }}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          paddingBottom: mode === 'gym-floor' ? 0 : tabBarHeight,
        },
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: baseTabBarStyle,
        tabBarItemStyle: {
          height: tabBarInnerHeight,
          minHeight: TAP_TARGETS.plan.min,
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
                  top: -1, // Slight overlap to ensure no gap against screen content
                  overflow: 'hidden',
                  borderTopLeftRadius: RADIUS.xxl,
                  borderTopRightRadius: RADIUS.xxl,
                  borderTopWidth: 1,
                  borderColor: COLORS.borderLight,
                }}
              >
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.surface }]} />
              </View>
            </View>
          ) : (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                top: -1,
                backgroundColor: 'rgba(10, 10, 10, 0.94)',
                borderTopLeftRadius: RADIUS.xxl,
                borderTopRightRadius: RADIUS.xxl,
                borderTopWidth: 1,
                borderColor: COLORS.borderLight,
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
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Today" IconComponent={IconBarChart} testID="tab-today" />,
          tabBarAccessibilityLabel: 'Today tab',
          tabBarButtonTestID: 'tab-button-today',
        }}
      />
      <Tab.Screen
        name="Train"
        component={TrainStackNavigator}
        options={({ route }) => ({
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Train" IconComponent={IconActivity} testID="tab-train" />,
          tabBarAccessibilityLabel: 'Train tab',
          tabBarButtonTestID: 'tab-button-train',
          tabBarStyle: shouldHideTabBar(route)
            ? { display: 'none' }
            : baseTabBarStyle,
        })}
      />
      <Tab.Screen
        name="Plan"
        component={PlanStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Plan" IconComponent={IconCalendar} testID="tab-plan" />,
          tabBarAccessibilityLabel: 'Plan tab',
          tabBarButtonTestID: 'tab-button-plan',
        }}
      />
      <Tab.Screen
        name="Fuel"
        component={FuelStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Fuel" IconComponent={IconRestaurant} testID="tab-fuel" />,
          tabBarAccessibilityLabel: 'Fuel tab',
          tabBarButtonTestID: 'tab-button-fuel',
        }}
      />
      <Tab.Screen
        name="Me"
        component={MeStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="Me" IconComponent={IconPerson} testID="tab-me" />,
          tabBarAccessibilityLabel: 'Me tab',
          tabBarButtonTestID: 'tab-button-me',
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
    minHeight: TAP_TARGETS.plan.min,
  },
  iconChip: {
    minWidth: TAP_TARGETS.plan.min,
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
