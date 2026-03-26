import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut, SlideInRight } from 'react-native-reanimated';
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
import { SetDots, SetMiniTable } from '../../../components/workout/SetTracker';
import { InputRow } from '../../../components/workout/SetInputPanel';
import { LoadingPyramid } from '../../../components/workout/LoadingPyramid';
import { TimerDisplay } from '../../../components/workout/TimerDisplay';
import { SectionRail } from '../../../components/workout/SectionRail';
import RPESelector from '../../../components/RPESelector';
import WeightSuggestionBanner from '../../../components/WeightSuggestionBanner';
import AdaptationBanner from '../../../components/AdaptationBanner';
import WarmupSetsCard from '../../../components/WarmupSetsCard';
import FormCueCard from '../../../components/FormCueCard';
import type { StrategyRendererProps } from './StrategyRendererProps';

// ---------------------------------------------------------------------------
// StrengthRenderer — handles straight_sets and top_set_backoff
//
// Layout:
//   SectionRail → ExerciseCard → LoadingPyramid (backoff) or SetDots (straight)
//   → SetMiniTable → InputRow + RPE → Log Set / Complete → inline rest timer
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
    adaptationResult,
    adaptationDismissed,
    restSeconds,
    restTotal,
    onLogSet,
    onCompleteExercise,
    onSkipExercise,
    onWeightDecrement,
    onWeightIncrement,
    onRepsDecrement,
    onRepsIncrement,
    onSelectRPE,
    onDismissAdaptation,
    onSkipRest,
    onExtendRest,
    onFinishWorkout,
    warmupSets,
    allWarmupsDone,
    onToggleWarmup,
    showWeightBanner,
    overloadSuggestion,
    onAcceptSuggestion,
    onModifySuggestion,
    formCues,
    formCueExpanded,
    onToggleFormCue,
    isLastExercise,
    formatWeight,
  } = props;

  const workingSetsLogged = progress?.setsLogged.filter(s => !s.isWarmup).length ?? 0;
  const targetSets = exercise.targetSets;
  const allTargetSetsLogged = workingSetsLogged >= targetSets && targetSets > 0;
  const canLogSet = selectedRPE !== null && !isLoggingSet;
  const isBackoff = exercise.loadingStrategy === 'top_set_backoff';
  const mode: 'plan' | 'focus' = isGymFloor ? 'focus' : 'plan';

  return (
    <View style={styles.container}>
      {/* Section rail (if session has sections) */}
      {session.hasSections && (
        <SectionRail
          sections={session.sections}
          activeSectionIndex={currentSectionIndex}
        />
      )}

      {/* Exercise card */}
      <Animated.View
        key={exercise.id}
        entering={SlideInRight.duration(ANIMATION.normal).springify() as any}
      >
        <ExerciseCard exercise={exercise} progress={progress}>
          {/* Loading pyramid for top_set_backoff */}
          {isBackoff && exercise.setPrescription.length > 0 && (
            <LoadingPyramid
              setPrescriptions={exercise.setPrescription}
              currentSetIndex={workingSetsLogged + 1}
              loggedSets={progress?.setsLogged}
            />
          )}
        </ExerciseCard>
      </Animated.View>

      {/* Set tracker */}
      <View style={styles.setRow}>
        <Text style={[styles.setLabel, isGymFloor && styles.setLabelFocus]}>
          Set {Math.min(workingSetsLogged + 1, targetSets)} of {targetSets}
        </Text>
        <SetDots total={targetSets} completed={workingSetsLogged} size={mode} />
      </View>

      {/* Logged sets mini table */}
      {progress && progress.setsLogged.length > 0 && (
        <SetMiniTable sets={progress.setsLogged} />
      )}

      {/* Warmup sets card */}
      {warmupSets.length > 0 && !allWarmupsDone && (
        <Animated.View entering={FadeInDown.duration(ANIMATION.normal).springify()}>
          <WarmupSetsCard
            exerciseName={exercise.name}
            sets={warmupSets}
            onToggleSet={onToggleWarmup}
          />
        </Animated.View>
      )}

      {/* Form cues */}
      {formCues ? (
        <FormCueCard
          exerciseName={exercise.name}
          cues={formCues}
          isExpanded={formCueExpanded}
          onToggle={onToggleFormCue}
        />
      ) : null}

      {/* Weight suggestion banner */}
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

      {/* Adaptation banner */}
      {adaptationResult && !adaptationDismissed && (
        <Animated.View
          entering={FadeInDown.duration(ANIMATION.normal)}
          exiting={FadeOut.duration(ANIMATION.fast)}
        >
          <AdaptationBanner
            message={adaptationResult.feedbackMessage}
            severity={adaptationResult.feedbackSeverity}
            onDismiss={onDismissAdaptation}
          />
        </Animated.View>
      )}

      {/* Inline rest timer (between sets) */}
      {restSeconds !== null && (
        <TimerDisplay
          mode="countdown"
          totalSeconds={restTotal}
          running={true}
          label="Rest"
          onSkip={onSkipRest}
          onExtend={onExtendRest}
          size="inline"
        />
      )}

      {/* Weight + Reps input */}
      {!allTargetSetsLogged && restSeconds === null && (
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
        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canLogSet && styles.primaryButtonDisabled,
            isGymFloor && styles.primaryButtonFocus,
          ]}
          onPress={onLogSet}
          disabled={!canLogSet}
          activeOpacity={0.82}
          accessibilityLabel="Log set"
          accessibilityRole="button"
        >
          <Text style={[styles.primaryButtonText, isGymFloor && styles.primaryButtonTextFocus]}>
            {isLoggingSet ? 'Logging...' : 'Log Set'}
          </Text>
        </TouchableOpacity>
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

      {/* Skip exercise link */}
      {!allTargetSetsLogged && (
        <TouchableOpacity onPress={onSkipExercise} activeOpacity={0.7} style={styles.link}>
          <Text style={styles.linkText}>Skip Exercise</Text>
        </TouchableOpacity>
      )}

      {/* Finish early link */}
      {workingSetsLogged > 0 && !allTargetSetsLogged && (
        <TouchableOpacity onPress={onFinishWorkout} activeOpacity={0.7} style={styles.link}>
          <Text style={styles.finishEarlyText}>Finish Workout Early</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setLabel: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  setLabelFocus: {
    ...TYPOGRAPHY_V2.focus.action,
    color: COLORS.text.primary,
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
  primaryButtonFocus: {
    paddingVertical: SPACING.lg,
    minHeight: TAP_TARGETS.focusPrimary.min,
  },
  primaryButtonText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 17,
    color: COLORS.text.inverse,
    letterSpacing: 0.3,
  },
  primaryButtonTextFocus: {
    fontSize: 19,
  },
  completeButton: {
    backgroundColor: COLORS.readiness.prime,
    ...SHADOWS.colored.prime,
  },
  link: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    minHeight: TAP_TARGETS.plan.min,
    justifyContent: 'center',
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
