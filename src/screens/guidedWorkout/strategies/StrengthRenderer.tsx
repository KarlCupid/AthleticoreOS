import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  ANIMATION,
  TYPOGRAPHY_V2,
  TAP_TARGETS,
} from '../../../theme/theme';
import { ExerciseCard } from '../../../components/workout/ExerciseCard';
import { getLoadingStrategyActionHint } from '../../../components/workout/metadata';
import { SetDots } from '../../../components/workout/SetTracker';
import { InputRow } from '../../../components/workout/SetInputPanel';
import { LoadingPyramid } from '../../../components/workout/LoadingPyramid';
import { SectionRail } from '../../../components/workout/SectionRail';
import RPESelector from '../../../components/RPESelector';
import WeightSuggestionBanner from '../../../components/WeightSuggestionBanner';
import WarmupSetsCard from '../../../components/WarmupSetsCard';
import { GymFloorPressable } from '../../../components/training/GymFloorPressable';
import { SetCompletionFlash } from '../../../components/workout/SetCompletionFlash';
import type { StrategyRendererProps } from './StrategyRendererProps';

// ---------------------------------------------------------------------------
// StrengthRenderer — handles straight_sets and top_set_backoff
// ---------------------------------------------------------------------------

export function StrengthRenderer(props: StrategyRendererProps) {
  const {
    session,
    currentSectionIndex,
    exercise,
    progress,
    selectedWeight,
    selectedReps,
    selectedRPE,
    isLoggingSet,
    isGymFloor,
    restSeconds,
    onLogSet,
    onCompleteExercise,
    onSkipExercise,
    onWeightDecrement,
    onWeightIncrement,
    onRepsDecrement,
    onRepsIncrement,
    onSelectRPE,
    onFinishWorkout,
    warmupSets,
    allWarmupsDone,
    onToggleWarmup,
    showWeightBanner,
    overloadSuggestion,
    onAcceptSuggestion,
    onModifySuggestion,
    isLastExercise,
    formatWeight,
  } = props;

  const [showFlash, setShowFlash] = useState(false);
  const prevSetsRef = useRef(0);

  const workingSetsLogged = progress?.setsLogged.filter(s => !s.isWarmup).length ?? 0;
  const targetSets = exercise.targetSets;
  const allTargetSetsLogged = workingSetsLogged >= targetSets && targetSets > 0;
  const canLogSet = selectedRPE !== null && !isLoggingSet;
  const isBackoff = exercise.loadingStrategy === 'top_set_backoff';
  const topSetBackoffActionHint = getLoadingStrategyActionHint({
    loadingStrategy: exercise.loadingStrategy,
    setPrescriptions: exercise.setPrescription,
    workingSetsLogged,
  });
  const mode: 'plan' | 'focus' = isGymFloor ? 'focus' : 'plan';

  // Flash line when a set is logged
  useEffect(() => {
    if (workingSetsLogged > prevSetsRef.current) {
      setShowFlash(true);
    }
    prevSetsRef.current = workingSetsLogged;
  }, [workingSetsLogged]);

  return (
    <View style={styles.container}>
      {/* Section rail (if session has sections) */}
      {session.hasSections && (
        <SectionRail
          sections={session.sections}
          activeSectionIndex={currentSectionIndex}
        />
      )}

      {/* Exercise identity */}
      <Animated.View
        key={exercise.id}
        entering={FadeInDown.duration(300).springify().damping(14)}
        exiting={FadeOutUp.duration(200)}
      >
        <ExerciseCard
          exercise={exercise}
          progress={progress}
          mode="interactive"
          currentWeight={selectedWeight}
          formatWeight={formatWeight}
        >
          {/* Loading pyramid for top_set_backoff */}
          {isBackoff && exercise.setPrescription.length > 0 && (
            <LoadingPyramid
              setPrescriptions={exercise.setPrescription}
              currentSetIndex={workingSetsLogged + 1}
              loggedSets={progress?.setsLogged}
            />
          )}
          {isBackoff && topSetBackoffActionHint ? (
            <Text style={styles.phaseHint}>{topSetBackoffActionHint}</Text>
          ) : null}
        </ExerciseCard>
      </Animated.View>

      {/* Set tracker — tight to exercise */}
      <Animated.View
        style={styles.setRow}
        entering={FadeInDown.delay(60).duration(280).springify().damping(16)}
      >
        <Text style={[styles.setLabel, isGymFloor && styles.setLabelFocus]}>
          Set {Math.min(workingSetsLogged + 1, targetSets)} of {targetSets}
        </Text>
        <SetDots total={targetSets} completed={workingSetsLogged} size={mode} />
      </Animated.View>

      {/* Set completion flash */}
      <SetCompletionFlash
        visible={showFlash}
        onDone={() => setShowFlash(false)}
      />

      {/* Warmup sets */}
      {warmupSets.length > 0 && !allWarmupsDone && (
        <Animated.View entering={FadeInDown.duration(ANIMATION.normal).springify()}>
          <WarmupSetsCard
            exerciseName={exercise.name}
            sets={warmupSets}
            onToggleSet={onToggleWarmup}
          />
        </Animated.View>
      )}

      {/* Weight suggestion banner (first set only) */}
      {showWeightBanner && overloadSuggestion && (
        <WeightSuggestionBanner
          lastWeight={overloadSuggestion.lastSessionWeight}
          lastReps={overloadSuggestion.lastSessionReps}
          lastRPE={overloadSuggestion.lastSessionRPE}
          suggestedWeight={overloadSuggestion.suggestedWeight}
          suggestedReps={overloadSuggestion.suggestedReps}
          reasoning={overloadSuggestion.reasoning}
          onAccept={onAcceptSuggestion}
          onModify={onModifySuggestion}
          isDeload={overloadSuggestion.isDeloadSet}
        />
      )}

      {/* Weight + Reps input */}
      {!allTargetSetsLogged && restSeconds === null && (
        <Animated.View entering={FadeInDown.delay(120).duration(280).springify().damping(16)}>
          <InputRow
            weight={selectedWeight}
            reps={selectedReps}
            onWeightDecrement={onWeightDecrement}
            onWeightIncrement={onWeightIncrement}
            onRepsDecrement={onRepsDecrement}
            onRepsIncrement={onRepsIncrement}
            formatWeight={formatWeight}
            mode={mode}
          />
        </Animated.View>
      )}

      {/* RPE selector */}
      {!allTargetSetsLogged && restSeconds === null && (
        <RPESelector
          value={selectedRPE}
          onChange={onSelectRPE}
          disabled={isLoggingSet}
        />
      )}

      {/* Log Set / Complete Exercise button */}
      {!allTargetSetsLogged ? (
        isGymFloor ? (
          <GymFloorPressable
            label={isLoggingSet ? 'Logging...' : 'Log Set'}
            onPress={onLogSet}
            disabled={!canLogSet}
            variant="primary"
          />
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !canLogSet && styles.primaryButtonDisabled,
            ]}
            onPress={onLogSet}
            disabled={!canLogSet}
            activeOpacity={0.82}
            accessibilityLabel="Log set"
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>
              {isLoggingSet ? 'Logging...' : 'Log Set'}
            </Text>
          </TouchableOpacity>
        )
      ) : (
        <TouchableOpacity
          style={[styles.primaryButton, styles.completeButton]}
          onPress={isLastExercise ? onFinishWorkout : onCompleteExercise}
          activeOpacity={0.82}
          accessibilityLabel={isLastExercise ? 'Finish workout' : 'Complete exercise'}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>
            {isLastExercise ? 'Finish Workout' : 'Complete Exercise →'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Footer links — skip / finish early */}
      {!allTargetSetsLogged && (
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={onSkipExercise} activeOpacity={0.7} style={styles.footerLink}>
            <Text style={styles.linkText}>Skip Exercise</Text>
          </TouchableOpacity>
          {workingSetsLogged > 0 && (
            <>
              <Text style={styles.footerDivider}>·</Text>
              <TouchableOpacity onPress={onFinishWorkout} activeOpacity={0.7} style={styles.footerLink}>
                <Text style={styles.finishEarlyText}>End Workout</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -SPACING.xs,
  },
  setLabel: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 18,
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  setLabelFocus: {
    ...TYPOGRAPHY_V2.focus.action,
    color: COLORS.text.primary,
  },
  phaseHint: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    color: COLORS.accent,
    letterSpacing: 0.2,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TAP_TARGETS.plan.recommended,
    ...SHADOWS.colored.accent,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.border,
    ...SHADOWS.sm,
  },
  primaryButtonText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 17,
    color: COLORS.text.inverse,
    letterSpacing: 0.3,
  },
  completeButton: {
    backgroundColor: COLORS.readiness.prime,
    ...SHADOWS.colored.prime,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  footerLink: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    minHeight: TAP_TARGETS.plan.min,
    justifyContent: 'center',
  },
  footerDivider: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  linkText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  finishEarlyText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: COLORS.readiness.depleted,
  },
});
