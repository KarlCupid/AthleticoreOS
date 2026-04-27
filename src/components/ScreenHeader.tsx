import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../theme/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  rightAction?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
  subtitleLines?: number;
}

export function ScreenHeader({
  title,
  subtitle,
  kicker,
  rightAction,
  children,
  style,
  subtitleLines = 1,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={subtitleLines}>{subtitle}</Text> : null}
        </View>
        {rightAction ? <View style={styles.action}>{rightAction}</View> : null}
      </View>
      {children ? <View style={styles.bottom}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.sm,
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
    ...TYPOGRAPHY_V2.plan.caption,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  action: {
    alignSelf: 'center',
    minWidth: 44,
    minHeight: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.30)',
  },
  bottom: {
    gap: SPACING.sm,
  },
});
