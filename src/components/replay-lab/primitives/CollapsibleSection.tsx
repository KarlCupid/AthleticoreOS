import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../../theme/theme';
import { AnimatedPressable } from '../../AnimatedPressable';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  resetKey?: string | number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  resetKey,
  style,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen, resetKey]);

  return (
    <View style={style}>
      <AnimatedPressable
        onPress={() => setOpen((current) => !current)}
        style={[styles.header, open && styles.headerOpen]}
        accessibilityRole="button"
        accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${title}`}
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.headerBody}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.togglePill, open && styles.togglePillOpen]}>
          <Text style={[styles.toggleText, open && styles.toggleTextOpen]}>{open ? 'Hide' : 'Show'}</Text>
        </View>
      </AnimatedPressable>

      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerOpen: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  headerBody: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  subtitle: {
    marginTop: SPACING.xs,
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  togglePill: {
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  togglePillOpen: {
    backgroundColor: COLORS.accent,
  },
  toggleText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.primary,
  },
  toggleTextOpen: {
    color: COLORS.text.inverse,
  },
  body: {
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
});
