import React from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { DatePickerField } from '../../components/DatePickerField';
import { COLORS } from '../../theme/theme';
import type {
  AthleteGoalMode,
  BuildPhaseGoalType,
  ObjectiveSecondaryConstraint,
  WeighInTiming,
} from '../../../lib/engine/types';
import {
  BUILD_GOAL_OBJECTIVE_PLACEHOLDERS,
  BUILD_GOAL_OPTIONS,
  REST_DURATION_OPTIONS,
  ROUND_DURATION_OPTIONS,
  ROUND_OPTIONS,
  SECONDARY_CONSTRAINT_OPTIONS,
} from './constants';
import { FieldNote, OptionPill, Section } from './shared';
import { styles } from './styles';
import { getBuildMetricOptions } from './utils';
import type { BuildMetricOption, BuildPhaseRecommendation } from './types';
import { formatLocalDate } from '../../../lib/utils/date';

type ObjectivePhaseProps = {
  startDate: string;
  setStartDate: (value: string) => void;
  goalMode: AthleteGoalMode;
  setGoalMode: (value: AthleteGoalMode) => void;
  buildGoalType: BuildPhaseGoalType;
  setBuildGoalType: (value: BuildPhaseGoalType) => void;
  buildGoalTypeLabel: string;
  buildRecommendation: BuildPhaseRecommendation;
  secondaryConstraint: ObjectiveSecondaryConstraint;
  setSecondaryConstraint: (value: ObjectiveSecondaryConstraint) => void;
  showAdvancedOverride: boolean;
  setShowAdvancedOverride: React.Dispatch<React.SetStateAction<boolean>>;
  goalLabel: string;
  setGoalLabel: (value: string) => void;
  goalStatement: string;
  setGoalStatement: (value: string) => void;
  primaryOutcome: string;
  setPrimaryOutcome: (value: string) => void;
  selectedBuildMetric: BuildMetricOption;
  setTargetMetric: (value: string) => void;
  targetValue: string;
  setTargetValue: (value: string) => void;
  targetDate: string;
  setTargetDate: (value: string) => void;
  targetHorizonWeeks: string;
  setTargetHorizonWeeks: (value: string) => void;
  fightDate: string;
  setFightDate: (value: string) => void;
  targetWeight: string;
  setTargetWeight: (value: string) => void;
  weighInTiming: WeighInTiming;
  setWeighInTiming: (value: WeighInTiming) => void;
  travelStartDate: string;
  setTravelStartDate: (value: string) => void;
  travelEndDate: string;
  setTravelEndDate: (value: string) => void;
  roundCount: number;
  setRoundCount: (value: number) => void;
  roundDurationSec: number;
  setRoundDurationSec: (value: number) => void;
  restDurationSec: number;
  setRestDurationSec: (value: number) => void;
  weeklyLockedSlots: number;
  estimatedRoundWorkMin: number;
  daysToFight: number | null;
};

export function ObjectivePhase(props: ObjectivePhaseProps) {
  const {
    startDate,
    setStartDate,
    goalMode,
    setGoalMode,
    buildGoalType,
    setBuildGoalType,
    buildGoalTypeLabel,
    buildRecommendation,
    secondaryConstraint,
    setSecondaryConstraint,
    showAdvancedOverride,
    setShowAdvancedOverride,
    goalLabel,
    setGoalLabel,
    goalStatement,
    setGoalStatement,
    primaryOutcome,
    setPrimaryOutcome,
    selectedBuildMetric,
    setTargetMetric,
    targetValue,
    setTargetValue,
    targetDate,
    setTargetDate,
    targetHorizonWeeks,
    setTargetHorizonWeeks,
    fightDate,
    setFightDate,
    targetWeight,
    setTargetWeight,
    weighInTiming,
    setWeighInTiming,
    travelStartDate,
    setTravelStartDate,
    travelEndDate,
    setTravelEndDate,
    roundCount,
    setRoundCount,
    roundDurationSec,
    setRoundDurationSec,
    restDurationSec,
    setRestDurationSec,
    weeklyLockedSlots,
    estimatedRoundWorkMin,
    daysToFight,
  } = props;

  return (
    <>
      <Section label="Start Date" description="Pick the first day this plan should begin running.">
        <FieldNote>The planner builds the initial weekly cycle from this date.</FieldNote>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {Array.from({ length: 14 }).map((_, idx) => {
            const date = new Date();
            date.setDate(date.getDate() + idx);
            const dateStr = formatLocalDate(date);
            const selected = startDate === dateStr;
            const topLabel = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' });
            const bottomLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return (
              <TouchableOpacity
                key={dateStr}
                style={[styles.datePill, selected ? styles.datePillSelected : styles.datePillIdle]}
                onPress={() => setStartDate(dateStr)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dateTopText, selected && styles.optionPillTextSelected]}>{topLabel}</Text>
                <Text style={[styles.dateBottomText, selected && styles.optionPillTextSelected]}>{bottomLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Section>

      <Section label="Plan Type" description="Choose the kind of block you want the engine to build.">
        <FieldNote>Every athlete should be in either Fight Camp or Build Phase so the planner can prioritize correctly.</FieldNote>
        <View style={styles.optionList}>
          <OptionPill selected={goalMode === 'fight_camp'} label="Fight Camp" onPress={() => setGoalMode('fight_camp')} />
          <OptionPill selected={goalMode === 'build_phase'} label="Build Phase" onPress={() => setGoalMode('build_phase')} />
        </View>

        {goalMode === 'build_phase' ? (
          <>
            <Text style={styles.subLabel}>Primary Focus</Text>
            <FieldNote>Pick the area you want the engine to lead. We will recommend the scoreboard, target, and time frame for you.</FieldNote>
            <View style={styles.optionList}>
              {BUILD_GOAL_OPTIONS.map((option) => (
                <OptionPill key={option.value} selected={buildGoalType === option.value} label={option.label} onPress={() => setBuildGoalType(option.value)} />
              ))}
            </View>
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Coach Recommendation</Text>
              <Text style={styles.previewLine}>Focus: {buildGoalTypeLabel}.</Text>
              <Text style={styles.previewLine}>The engine will optimize for {buildRecommendation.metric.label.toLowerCase()}.</Text>
              <Text style={styles.previewLine}>Recommended target: {String(buildRecommendation.targetValue)} {buildRecommendation.metric.unit}.</Text>
              <Text style={styles.previewLine}>Recommended time frame: {buildRecommendation.targetHorizonWeeks} weeks.</Text>
              <Text style={styles.previewLine}>
                Secondary constraint: {SECONDARY_CONSTRAINT_OPTIONS.find((option) => option.value === buildRecommendation.secondaryConstraint)?.label ?? 'Protect Recovery'}.
              </Text>
              <Text style={styles.previewLine}>{buildRecommendation.reason}</Text>
            </View>
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Planned Objective</Text>
              <Text style={styles.previewLine}>{buildRecommendation.goalStatement}</Text>
            </View>
            <Text style={styles.subLabel}>Secondary Constraint</Text>
            <FieldNote>Tell the engine what it should protect while driving this block forward.</FieldNote>
            <View style={styles.optionList}>
              {SECONDARY_CONSTRAINT_OPTIONS.map((option) => (
                <OptionPill
                  key={option.value}
                  selected={secondaryConstraint === option.value}
                  label={option.label}
                  onPress={() => setSecondaryConstraint(option.value)}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvancedOverride((current) => !current)} activeOpacity={0.8}>
              <View style={styles.advancedToggleTextWrap}>
                <Text style={styles.advancedToggleTitle}>Advanced Override</Text>
                <Text style={styles.advancedToggleDescription}>Open this if you want to manually set the outcome, metric, target number, or deadline.</Text>
              </View>
              <Text style={styles.advancedToggleAction}>{showAdvancedOverride ? 'Hide' : 'Open'}</Text>
            </TouchableOpacity>
            {showAdvancedOverride ? (
              <>
                <Text style={styles.subLabel}>Block Name (optional)</Text>
                <FieldNote>Short label if you want to name this block for yourself.</FieldNote>
                <TextInput style={styles.input} value={goalLabel} onChangeText={setGoalLabel} placeholder="Explosive strength block" placeholderTextColor={COLORS.text.tertiary} />
                <Text style={styles.subLabel}>Specific Outcome</Text>
                <FieldNote>Describe the outcome you want if the coach recommendation is not specific enough.</FieldNote>
                <TextInput style={[styles.input, styles.multilineInput]} value={goalStatement} onChangeText={setGoalStatement} placeholder={BUILD_GOAL_OBJECTIVE_PLACEHOLDERS[buildGoalType]} placeholderTextColor={COLORS.text.tertiary} multiline />
                <Text style={styles.subLabel}>Primary Objective</Text>
                <FieldNote>This becomes the north-star sentence shown in the daily mission.</FieldNote>
                <TextInput style={[styles.input, styles.multilineInput]} value={primaryOutcome} onChangeText={setPrimaryOutcome} placeholder={BUILD_GOAL_OBJECTIVE_PLACEHOLDERS[buildGoalType]} placeholderTextColor={COLORS.text.tertiary} multiline />
                <Text style={styles.subLabel}>Success Metric</Text>
                <FieldNote>Choose the exact scoreboard the engine should optimize if you want to override the default.</FieldNote>
                <View style={styles.optionList}>
                  {getBuildMetricOptions(buildGoalType).map((option) => (
                    <OptionPill key={option.value} selected={selectedBuildMetric.value === option.value} label={option.label} onPress={() => setTargetMetric(option.value)} />
                  ))}
                </View>
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>{selectedBuildMetric.label}</Text>
                  <Text style={styles.previewLine}>{selectedBuildMetric.description}</Text>
                  <Text style={styles.previewLine}>The engine will judge this override in {selectedBuildMetric.unit}.</Text>
                </View>
                <Text style={styles.subLabel}>Target {selectedBuildMetric.label}</Text>
                <FieldNote>Enter the exact number you want the engine to build toward by the end of this block.</FieldNote>
                <TextInput style={styles.input} value={targetValue} onChangeText={setTargetValue} keyboardType="decimal-pad" placeholder={selectedBuildMetric.placeholder} placeholderTextColor={COLORS.text.tertiary} />
                <Text style={styles.subLabel}>Goal Deadline</Text>
                <FieldNote>Use a calendar date if you need this done by a specific time.</FieldNote>
                <DatePickerField label="Goal Deadline" value={targetDate} onChange={setTargetDate} />
                <Text style={styles.subLabel}>Or Weeks To Work On This</Text>
                <FieldNote>Use this when you know the length of the block but not the exact end date.</FieldNote>
                <TextInput style={styles.input} value={targetHorizonWeeks} onChangeText={setTargetHorizonWeeks} keyboardType="number-pad" placeholder="8" placeholderTextColor={COLORS.text.tertiary} />
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>Override Preview</Text>
                  <Text style={styles.previewLine}>
                    {primaryOutcome.trim() || goalStatement.trim() || 'Add a specific outcome if you want the override to replace the guided objective.'}
                  </Text>
                  <Text style={styles.previewLine}>
                    {targetValue.trim()
                      ? `Manual target: ${targetValue.trim()} ${selectedBuildMetric.unit} for ${selectedBuildMetric.label.toLowerCase()}.`
                      : `Set the manual target for ${selectedBuildMetric.label.toLowerCase()}.`}
                  </Text>
                  <Text style={styles.previewLine}>
                    Constraint: {SECONDARY_CONSTRAINT_OPTIONS.find((option) => option.value === secondaryConstraint)?.label ?? 'Protect Recovery'}.
                  </Text>
                  <Text style={styles.previewLine}>
                    {targetDate.trim()
                      ? `Deadline: ${targetDate}.`
                      : targetHorizonWeeks.trim()
                        ? `Time frame: ${targetHorizonWeeks.trim()} weeks.`
                        : 'Add a date or number of weeks so the override has a finish line.'}
                  </Text>
                </View>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.subLabel}>Fight Date</Text>
            <FieldNote>This is the deadline the camp will build backward from.</FieldNote>
            <DatePickerField label="Fight Date" value={fightDate} onChange={setFightDate} />
            <Text style={styles.subLabel}>Target Weight (lbs)</Text>
            <FieldNote>Enter the contracted or intended weigh-in weight.</FieldNote>
            <TextInput style={styles.input} value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" placeholder="155" placeholderTextColor={COLORS.text.tertiary} />
            <Text style={styles.subLabel}>Weigh-in Timing</Text>
            <FieldNote>This changes how aggressive weight-cut assumptions can be.</FieldNote>
            <View style={styles.optionList}>
              <OptionPill selected={weighInTiming === 'same_day'} label="Same Day" onPress={() => setWeighInTiming('same_day')} />
              <OptionPill selected={weighInTiming === 'next_day'} label="Next Day" onPress={() => setWeighInTiming('next_day')} />
            </View>
            <Text style={styles.subLabel}>Travel Start (optional)</Text>
            <FieldNote>Add travel if camp should protect energy around those dates.</FieldNote>
            <DatePickerField label="Travel Start" value={travelStartDate} onChange={setTravelStartDate} />
            <Text style={styles.subLabel}>Travel End (optional)</Text>
            <DatePickerField label="Travel End" value={travelEndDate} onChange={setTravelEndDate} />
            <Text style={styles.subLabel}>Rounds</Text>
            <FieldNote>Use the actual fight format when you know it.</FieldNote>
            <View style={styles.pillRow}>
              {ROUND_OPTIONS.map((value) => (
                <OptionPill key={value} selected={roundCount === value} label={String(value)} onPress={() => setRoundCount(value)} />
              ))}
            </View>
            <Text style={styles.subLabel}>Round Duration</Text>
            <View style={styles.pillRow}>
              {ROUND_DURATION_OPTIONS.map((value) => (
                <OptionPill key={value} selected={roundDurationSec === value} label={`${Math.round(value / 60)}m`} onPress={() => setRoundDurationSec(value)} />
              ))}
            </View>
            <Text style={styles.subLabel}>Rest Duration</Text>
            <View style={styles.pillRow}>
              {REST_DURATION_OPTIONS.map((value) => (
                <OptionPill key={value} selected={restDurationSec === value} label={`${value}s`} onPress={() => setRestDurationSec(value)} />
              ))}
            </View>
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Camp Impact Preview</Text>
              <Text style={styles.previewLine}>Locked gym commitments: {weeklyLockedSlots} recurring sessions.</Text>
              <Text style={styles.previewLine}>Fight format load: {roundCount} x {Math.round(roundDurationSec / 60)}m rounds, {restDurationSec}s rest (~{estimatedRoundWorkMin} min total).</Text>
              <Text style={styles.previewLine}>Timeline: {daysToFight != null ? `${daysToFight} days to fight date.` : 'Set fight date to compute timeline impact.'}</Text>
            </View>
          </>
        )}
      </Section>
    </>
  );
}
