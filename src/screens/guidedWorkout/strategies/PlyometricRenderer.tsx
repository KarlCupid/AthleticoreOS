import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY_V2,
  TAP_TARGETS,
} from '../../../theme/theme';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function PlyometricRenderer(props: StrategyRendererProps) {
  const {
    exercise,
    progress,
    isLoggingSet,
    onLogEffort,
    onCompleteExercise,
    onFinishWorkout,
    isLastExercise,
  } = props;

  const dose = exercise.modalityDose?.plyometric;
  const completedSets = progress?.effortsCompleted ?? 0;
  const totalSets = Math.max(1, exercise.targetSets);
  const contactsPerSet = Math.max(1, Math.round((dose?.groundContacts ?? totalSets * 8) / totalSets));
  const [contacts, setContacts] = useState(contactsPerSet);
  const [quality, setQuality] = useState(4);
  const [painFlag, setPainFlag] = useState(false);
  const done = completedSets >= totalSets;

  const subtitle = useMemo(() => {
    const jumpType = dose?.jumpType?.replace(/_/g, ' ') ?? 'jump';
    const surface = dose?.surface?.replace(/_/g, ' ') ?? 'chosen surface';
    return `${jumpType} | ${surface} | ${dose?.amplitude ?? 'controlled'} amplitude`;
  }, [dose?.amplitude, dose?.jumpType, dose?.surface]);

  const handleLogSet = async () => {
    await onLogEffort({
      exercise_library_id: exercise.id,
      effort_kind: 'plyo_set',
      effort_index: completedSets + 1,
      target_snapshot: {
        contacts: contactsPerSet,
        jump_type: dose?.jumpType ?? null,
        amplitude: dose?.amplitude ?? null,
        surface: dose?.surface ?? null,
      },
      actual_snapshot: {
        contacts,
        landing_quality: quality,
        surface: dose?.surface ?? null,
        highImpactCount: dose?.amplitude === 'high' ? contacts : 0,
      },
      quality_rating: quality,
      pain_flag: painFlag,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>Plyometric</Text>
        <Text style={styles.title}>{exercise.name}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.metricRow}>
        <Metric label="Set" value={`${Math.min(completedSets + 1, totalSets)}/${totalSets}`} />
        <Metric label="Contacts" value={String(contacts)} />
        <Metric label="Quality" value={`${quality}/5`} />
      </View>

      {!done ? (
        <>
          <Stepper
            label="Ground contacts"
            value={contacts}
            onMinus={() => setContacts((value) => Math.max(1, value - 1))}
            onPlus={() => setContacts((value) => value + 1)}
          />
          <Stepper
            label="Landing quality"
            value={quality}
            onMinus={() => setQuality((value) => Math.max(1, value - 1))}
            onPlus={() => setQuality((value) => Math.min(5, value + 1))}
          />
          <TouchableOpacity
            style={[styles.painToggle, painFlag && styles.painToggleActive]}
            onPress={() => setPainFlag((value) => !value)}
            activeOpacity={0.82}
          >
            <Text style={[styles.painText, painFlag && styles.painTextActive]}>
              {painFlag ? 'Pain flagged' : 'No pain'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, painFlag && styles.warningButton]}
            onPress={handleLogSet}
            disabled={isLoggingSet}
            activeOpacity={0.82}
          >
            <Text style={styles.primaryText}>Log Plyo Set</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>Plyo Work Complete</Text>
          <Text style={styles.doneSubtitle}>{progress?.effortsCompleted ?? 0} sets logged</Text>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={isLastExercise ? onFinishWorkout : onCompleteExercise}
            activeOpacity={0.82}
          >
            <Text style={styles.completeText}>{isLastExercise ? 'Finish Workout' : 'Complete ->'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity style={styles.stepperButton} onPress={onMinus} activeOpacity={0.78}>
          <Text style={styles.stepperText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity style={styles.stepperButton} onPress={onPlus} activeOpacity={0.78}>
          <Text style={styles.stepperText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
  headerBlock: { gap: SPACING.xs },
  kicker: { ...TYPOGRAPHY_V2.plan.caption, color: COLORS.accent, textTransform: 'uppercase' },
  title: { ...TYPOGRAPHY_V2.focus.display, color: COLORS.text.primary },
  subtitle: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.secondary },
  metricRow: { flexDirection: 'row', gap: SPACING.sm },
  metric: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricLabel: { ...TYPOGRAPHY_V2.plan.caption, color: COLORS.text.tertiary },
  metricValue: { fontFamily: FONT_FAMILY.extraBold, fontSize: 22, color: COLORS.text.primary },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepperLabel: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.primary, flex: 1 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSecondary,
  },
  stepperText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 22, color: COLORS.text.primary },
  stepperValue: { fontFamily: FONT_FAMILY.extraBold, fontSize: 20, color: COLORS.text.primary, minWidth: 28, textAlign: 'center' },
  painToggle: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  painToggleActive: { borderColor: COLORS.readiness.caution, backgroundColor: COLORS.readiness.caution + '18' },
  painText: { fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  painTextActive: { color: COLORS.readiness.caution },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    minHeight: TAP_TARGETS.focusPrimary.min,
    ...SHADOWS.colored.accent,
  },
  warningButton: { backgroundColor: COLORS.readiness.caution },
  primaryText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 17, color: COLORS.text.inverse },
  finishSection: { alignItems: 'center', gap: SPACING.md, paddingTop: SPACING.lg },
  doneTitle: { ...TYPOGRAPHY_V2.focus.display, color: COLORS.text.primary },
  doneSubtitle: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.secondary },
  completeButton: {
    backgroundColor: COLORS.readiness.prime,
    borderRadius: RADIUS.xl,
    width: '100%',
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    minHeight: TAP_TARGETS.focusPrimary.min,
    ...SHADOWS.colored.prime,
  },
  completeText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 17, color: COLORS.text.inverse },
});
