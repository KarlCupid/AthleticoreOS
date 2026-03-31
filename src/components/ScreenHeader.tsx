import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  rightAction?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  subtitle,
  kicker,
  rightAction,
  children,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightAction ? <View style={styles.action}>{rightAction}</View> : null}
      </View>
      {children ? <View style={styles.bottom}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.sm, // Tighter gap
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  copy: {
    flex: 1,
  },
  kicker: {
    fontSize: 11, // Slightly smaller
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4, // Tighter
  },
  title: {
    fontSize: 26, // Reduced from 30
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 2, // Reduced from 4
    fontSize: 13, // Slightly smaller
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 18, // Tighter
  },
  action: {
    alignSelf: 'center',
  },
  bottom: {
    gap: SPACING.sm,
  },
});
