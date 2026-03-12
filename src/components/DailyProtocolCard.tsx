import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { DailyCutProtocolRow } from '../../lib/engine/types';

interface Props {
  protocol: DailyCutProtocolRow;
}

const SECTION_ICONS: Record<string, string> = {
  Morning: '🌅',
  Afternoon: '☀️',
  Evening: '🌙',
};

export function DailyProtocolCard({ protocol }: Props) {
  const [expanded, setExpanded] = useState(false);

  const waterPct = protocol.water_target_oz > 0
    ? Math.min((protocol.water_consumed_oz ?? 0) / protocol.water_target_oz, 1)
    : 0;

  const sodiumTargetMg = protocol.sodium_target_mg ?? 0;
  const sodiumK = sodiumTargetMg / 1000;

  return (
    <View style={styles.card}>
      {/* Top row: title + refeed badge */}
      <View style={styles.header}>
        <Text style={styles.title}>Today's Protocol</Text>
        {protocol.is_refeed_day && (
          <View style={styles.refeedBadge}>
            <Text style={styles.refeedText}>REFEED DAY</Text>
          </View>
        )}
        {protocol.is_carb_cycle_high && !protocol.is_refeed_day && (
          <View style={[styles.refeedBadge, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.refeedText, { color: '#2563EB' }]}>HIGH CARB</Text>
          </View>
        )}
      </View>

      {/* Macro targets grid */}
      <View style={styles.macroGrid}>
        <MacroCell label="Calories" value={`${protocol.prescribed_calories}`} unit="kcal" color={COLORS.chart.accent} />
        <MacroCell label="Protein" value={`${protocol.prescribed_protein}`} unit="g" color={COLORS.chart.protein} />
        <MacroCell label="Carbs" value={`${protocol.prescribed_carbs}`} unit="g" color={COLORS.chart.carbs} />
        <MacroCell label="Fat" value={`${protocol.prescribed_fat}`} unit="g" color={COLORS.chart.fat} />
      </View>

      {/* Hydration + Sodium row */}
      <View style={styles.hydrRow}>
        {/* Water bar */}
        <View style={styles.waterBlock}>
          <View style={styles.hydrLabelRow}>
            <Text style={styles.hydrLabel}>💧 Water</Text>
            <Text style={styles.hydrValue}>
              {protocol.water_consumed_oz ?? 0} / {protocol.water_target_oz} oz
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${waterPct * 100}%`, backgroundColor: COLORS.chart.water }]} />
          </View>
        </View>

        {/* Sodium */}
        <View style={styles.sodiumBlock}>
          <Text style={styles.sodiumValue}>{sodiumK.toFixed(1)}g</Text>
          <Text style={styles.sodiumLabel}>Sodium</Text>
        </View>
      </View>

      {/* Sodium instruction */}
      {protocol.sodium_instruction && (
        <Text style={styles.sodiumInstruction}>{protocol.sodium_instruction}</Text>
      )}

      {/* Training recommendation */}
      <View style={styles.trainingRow}>
        <Text style={styles.trainingIcon}>🥊</Text>
        <View style={styles.trainingContent}>
          <Text style={styles.trainingCap}>
            Intensity cap: {protocol.training_intensity_cap ?? 'No cap'}{protocol.training_intensity_cap != null ? ' / 10 RPE' : ''}
          </Text>
          {protocol.training_recommendation && (
            <Text style={styles.trainingRec}>{protocol.training_recommendation}</Text>
          )}
        </View>
      </View>

      {/* Expandable protocol steps */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={styles.expandTrigger}
        activeOpacity={0.7}
      >
        <Text style={styles.expandText}>
          {expanded ? '▲ Hide daily schedule' : '▼ Daily schedule'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.scheduleBlock}>
          {[
            { label: 'Morning', text: protocol.morning_protocol },
            { label: 'Afternoon', text: protocol.afternoon_protocol },
            { label: 'Evening', text: protocol.evening_protocol },
          ]
            .filter(s => s.text)
            .map(s => (
              <View key={s.label} style={styles.scheduleRow}>
                <Text style={styles.scheduleIcon}>{SECTION_ICONS[s.label]}</Text>
                <View style={styles.scheduleTextBlock}>
                  <Text style={styles.scheduleLabel}>{s.label}</Text>
                  <Text style={styles.scheduleBody}>{s.text}</Text>
                </View>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

function MacroCell({
  label, value, unit, color,
}: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.macroCell}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: { fontFamily: FONT_FAMILY.semiBold, fontSize: 16, color: COLORS.text.primary },
  refeedBadge: {
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  refeedText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 10, color: '#CA8A04', letterSpacing: 0.5 },
  macroGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  macroCell: { flex: 1, alignItems: 'center' },
  macroValue: { fontFamily: FONT_FAMILY.semiBold, fontSize: 18 },
  macroUnit: { fontFamily: FONT_FAMILY.regular, fontSize: 11, color: COLORS.text.secondary },
  macroLabel: { fontFamily: FONT_FAMILY.regular, fontSize: 11, color: COLORS.text.tertiary, marginTop: 1 },
  hydrRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  waterBlock: { flex: 1 },
  hydrLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  hydrLabel: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: COLORS.text.primary },
  hydrValue: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.text.secondary },
  barTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  sodiumBlock: {
    alignItems: 'center',
    minWidth: 60,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sodiumValue: { fontFamily: FONT_FAMILY.semiBold, fontSize: 15, color: COLORS.text.primary },
  sodiumLabel: { fontFamily: FONT_FAMILY.regular, fontSize: 10, color: COLORS.text.secondary },
  sodiumInstruction: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: SPACING.xs,
  },
  trainingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  trainingIcon: { fontSize: 18 },
  trainingContent: { flex: 1 },
  trainingCap: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: COLORS.text.primary },
  trainingRec: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  expandTrigger: { alignItems: 'center', paddingVertical: SPACING.sm },
  expandText: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.text.tertiary },
  scheduleBlock: { gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  scheduleRow: { flexDirection: 'row', gap: SPACING.xs },
  scheduleIcon: { fontSize: 18 },
  scheduleTextBlock: { flex: 1 },
  scheduleLabel: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: COLORS.text.primary },
  scheduleBody: { fontFamily: FONT_FAMILY.regular, fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
});
