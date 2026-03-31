import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { AuroraBackground } from './AuroraBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  useSafeArea?: boolean;
}

export function ScreenWrapper({
  children,
  style,
  contentContainerStyle,
  useSafeArea = false,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, style]}>
      {/* The Global OS Background */}
      <AuroraBackground />
      
      <View 
        style={[
          styles.content, 
          useSafeArea && { paddingTop: insets.top, paddingBottom: insets.bottom },
          contentContainerStyle
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900 base fallback
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
