import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, TYPOGRAPHY_V2 } from '../../../theme/theme';
import { shared } from '../styles';

interface ConditioningDrillRowProps {
  name: string;
  subtitle: string;
  status: string;
  note: string;
}

export function ConditioningDrillRow({ name, subtitle, status, note }: ConditioningDrillRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <View style={styles.headerBody}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{subtitle}</Text>
        </View>
        <Text style={styles.status}>{status}</Text>
      </View>
      <Text style={shared.detailText}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  headerBody: { flex: 1 },
  name: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  meta: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  status: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.readiness.prime,
    textTransform: 'uppercase',
  },
});
