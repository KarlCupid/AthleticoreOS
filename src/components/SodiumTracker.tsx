import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

interface Props {
  targetMg: number;
  consumedMg: number;
  onUpdate: (newConsumedMg: number) => void;
  phase: 'fight_week_load' | 'fight_week_cut' | string;
}

// Common food sodium reference (mg)
const SODIUM_REFS = [
  { label: 'Pinch of salt',    mg: 380  },
  { label: 'Soy sauce (1 tsp)', mg: 290  },
  { label: 'Canned soup',       mg: 890  },
  { label: 'Chicken breast',    mg: 74   },
  { label: 'Rice (cooked)',      mg: 1    },
];

export function SodiumTracker({ targetMg, consumedMg, onUpdate, phase }: Props) {
  const [inputValue, setInputValue] = useState('');

  const pct = targetMg > 0 ? Math.min(consumedMg / targetMg, 1) : 0;
  const remaining = Math.max(0, targetMg - consumedMg);
  const isOverTarget = consumedMg > targetMg;
  const isCutPhase = phase === 'fight_week_cut' || phase === 'weigh_in';

  const barColor = isOverTarget
    ? COLORS.readiness.depleted
    : pct > 0.85
    ? COLORS.readiness.caution
    : '#06B6D4';

  const addMg = (mg: number) => {
    onUpdate(consumedMg + mg);
  };

  const handleManualAdd = () => {
    const val = parseInt(inputValue, 10);
    if (!isNaN(val) && val > 0) {
      onUpdate(consumedMg + val);
      setInputValue('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧂 Sodium</Text>
        <View style={[
          styles.targetBadge,
          { backgroundColor: isCutPhase ? '#FEE2E2' : '#EFF6FF' },
        ]}>
          <Text style={[
            styles.targetText,
            { color: isCutPhase ? '#DC2626' : '#2563EB' },
          ]}>
            {isCutPhase ? 'RESTRICT' : `Target: ${(targetMg / 1000).toFixed(1)}g`}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{(consumedMg / 1000).toFixed(2)}g</Text>
          <Text style={styles.statLabel}>Consumed</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, isOverTarget && { color: COLORS.readiness.depleted }]}>
            {isOverTarget ? `+${((consumedMg - targetMg) / 1000).toFixed(2)}g` : `${(remaining / 1000).toFixed(2)}g`}
          </Text>
          <Text style={styles.statLabel}>{isOverTarget ? 'Over target' : 'Remaining'}</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{(targetMg / 1000).toFixed(1)}g</Text>
          <Text style={styles.statLabel}>Target</Text>
        </View>
      </View>

      {isOverTarget && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Exceeded sodium target — water retention may affect weigh-in weight.
          </Text>
        </View>
      )}

      {/* Quick add chips */}
      {!isCutPhase && (
        <>
          <Text style={styles.quickLabel}>Quick add</Text>
          <View style={styles.quickRow}>
            {SODIUM_REFS.map(ref => (
              <TouchableOpacity
                key={ref.label}
                style={styles.quickChip}
                onPress={() => addMg(ref.mg)}
                activeOpacity={0.75}
              >
                <Text style={styles.quickChipMg}>+{ref.mg}mg</Text>
                <Text style={styles.quickChipLabel}>{ref.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Manual entry */}
      <View style={styles.manualRow}>
        <TextInput
          style={styles.input}
          placeholder="Amount (mg)"
          placeholderTextColor={COLORS.text.tertiary}
          keyboardType="numeric"
          value={inputValue}
          onChangeText={setInputValue}
          returnKeyType="done"
          onSubmitEditing={handleManualAdd}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleManualAdd}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
        {consumedMg > 0 && (
          <TouchableOpacity style={styles.resetBtn} onPress={() => onUpdate(0)}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  title: { fontFamily: FONT_FAMILY.semiBold, fontSize: 15, color: COLORS.text.primary },
  targetBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  targetText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 11 },
  barTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  barFill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FONT_FAMILY.semiBold, fontSize: 16, color: COLORS.text.primary },
  statLabel: { fontFamily: FONT_FAMILY.regular, fontSize: 11, color: COLORS.text.secondary, marginTop: 1 },
  statSep: { width: 1, height: 32, backgroundColor: COLORS.border },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  warningText: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: '#92400E' },
  quickLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  quickChip: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  quickChipMg: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: '#06B6D4' },
  quickChipLabel: { fontFamily: FONT_FAMILY.regular, fontSize: 10, color: COLORS.text.secondary, marginTop: 1 },
  manualRow: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  addBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  addBtnText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: '#FFFFFF' },
  resetBtn: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
  },
  resetBtnText: { fontFamily: FONT_FAMILY.regular, fontSize: 13, color: COLORS.text.secondary },
});
