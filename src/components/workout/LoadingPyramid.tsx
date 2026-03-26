import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import type { SetPrescriptionVM, SetLogVM } from './types';

// ---------------------------------------------------------------------------
// LoadingPyramid — visual representation of top_set_backoff loading
//
// Shows ascending warmup sets → highlighted top set → descending backoff sets
// as horizontal blocks whose width represents relative intensity.
// ---------------------------------------------------------------------------

interface LoadingPyramidProps {
  setPrescriptions: SetPrescriptionVM[];
  /** Index of the current set (1-based) — highlights the current block */
  currentSetIndex?: number;
  /** Logged sets so far (for showing completed state) */
  loggedSets?: SetLogVM[];
}

export function LoadingPyramid({
  setPrescriptions,
  currentSetIndex,
  loggedSets,
}: LoadingPyramidProps) {
  if (setPrescriptions.length === 0) return null;

  // Find the "top set" — highest RPE
  const maxRPE = Math.max(...setPrescriptions.map(sp => sp.targetRPE));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Loading Scheme</Text>
      <View style={styles.pyramid}>
        {setPrescriptions.map((sp, i) => {
          const intensity = maxRPE > 0 ? sp.targetRPE / maxRPE : 0.5;
          const widthPct = Math.max(40, intensity * 100);
          const isTop = sp.targetRPE === maxRPE;
          const isCurrent = currentSetIndex != null && i === currentSetIndex - 1;
          const isLogged = loggedSets ? i < loggedSets.length : false;

          return (
            <View key={i} style={styles.row}>
              {/* Set label */}
              <Text style={styles.setLabel}>{sp.label}</Text>
              {/* Block */}
              <View style={styles.blockContainer}>
                <View
                  style={[
                    styles.block,
                    { width: `${widthPct}%` as any },
                    isTop && styles.blockTop,
                    isCurrent && styles.blockCurrent,
                    isLogged && styles.blockLogged,
                  ]}
                >
                  <Text
                    style={[
                      styles.blockText,
                      (isTop || isCurrent) && styles.blockTextHighlight,
                      isLogged && styles.blockTextLogged,
                    ]}
                    numberOfLines={1}
                  >
                    {sp.sets} × {sp.reps} @ RPE {sp.targetRPE}
                  </Text>
                </View>
              </View>
              {/* Logged indicator */}
              {isLogged && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          );
        })}
      </View>
      {/* Intensity note if present on top set */}
      {setPrescriptions.find(sp => sp.intensityNote)?.intensityNote && (
        <Text style={styles.note}>
          {setPrescriptions.find(sp => sp.intensityNote)!.intensityNote}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pyramid: {
    gap: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  setLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    width: 50,
    textAlign: 'right',
  },
  blockContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  block: {
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  blockTop: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  blockCurrent: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  blockLogged: {
    backgroundColor: COLORS.readiness.primeLight,
    borderColor: COLORS.readiness.prime,
  },
  blockText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  blockTextHighlight: {
    color: COLORS.text.inverse,
  },
  blockTextLogged: {
    color: COLORS.readiness.prime,
  },
  checkmark: {
    fontSize: 14,
    color: COLORS.readiness.prime,
    width: 20,
    textAlign: 'center',
  },
  note: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
});
