import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  useSafeArea?: boolean;
}

export const ScreenWrapper = memo(function ScreenWrapper({
  children,
  style,
  contentContainerStyle,
  useSafeArea = false,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, style]}>
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Root background handles the fallback color
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
