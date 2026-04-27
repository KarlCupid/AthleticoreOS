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
    daysToFight,
  } = props;

  const [showFightDetails, setShowFightDetails] = React.useState(false);
  const selectedConstraintLabel =
    SECONDARY_CONSTRAINT_OPTIONS.find((option) => option.value === secondaryConstraint)?.label ?? 'Recovery';
  const weighInLabel = weighInTiming === 'same_day' ? 'Same day' : 'Next day';

  return (
    <>
      <Section label="Start Date" description="When should this plan begin?">
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

      <Section label="Training Goal" description="Choose the setup that matches your next block.">
        <View style={styles.optionList}>
          <OptionPill selected={goalMode === 'fight_camp'} label="Fight Camp" onPress={() => setGoalMode('fight_camp')} />
          <OptionPill selected={goalMode === 'build_phase'} label="Build Phase" onPress={() => setGoalMode('build_phase')} />
        </View>

        {goalMode === 'build_phase' ? (
          <>
            <Text style={styles.subLabel}>Main Focus</Text>
            <FieldNote>Pick the quality you want to build first.</FieldNote>
            <View style={styles.optionList}>
              {BUILD_GOAL_OPTIONS.map((option) => (
                <OptionPill key={option.value} selected={buildGoalType === option.value} label={option.label} onPress={() => setBuildGoalType(option.value)} />
              ))}
            </View>

            <Text style={styles.subLabel}>Protect</Text>
            <FieldNote>Choose what the plan should respect while you push.</FieldNote>
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

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Plan Target</Text>
              <Text style={styles.previewLine}>Focus: {buildGoalTypeLabel}.</Text>
              <Text style={styles.previewLine}>Measure: {buildRecommendation.metric.label}.</Text>
              <Text style={styles.previewLine}>Target: {String(buildRecommendation.targetValue)} {buildRecommendation.metric.unit} in {buildRecommendation.targetHorizonWeeks} weeks.</Text>
              <Text style={styles.previewLine}>Protect: {selectedConstraintLabel}.</Text>
            </View>

            <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvancedOverride((current) => !current)} activeOpacity={0.8}>
              <View style={styles.advancedToggleTextWrap}>
                <Text style={styles.advancedToggleTitle}>Custom Target</Text>
                <Text style={styles.advancedToggleDescription}>Use this if you want exact metrics, numbers, or dates.</Text>
              </View>
              <Text style={styles.advancedToggleAction}>{showAdvancedOverride ? 'Hide' : 'Open'}</Text>
            </TouchableOpacity>

            {showAdvancedOverride ? (
              <>
                <Text style={styles.subLabel}>Block Name (optional)</Text>
                <TextInput style={styles.input} value={goalLabel} onChangeText={setGoalLabel} placeholder="Explosive strength block" placeholderTextColor={COLORS.text.tertiary} />

                <Text style={styles.subLabel}>Goal Sentence</Text>
                <FieldNote>Say what this block should accomplish.</FieldNote>
                <TextInput style={[styles.input, styles.multilineInput]} value={goalStatement} onChangeText={setGoalStatement} placeholder={BUILD_GOAL_OBJECTIVE_PLACEHOLDERS[buildGoalType]} placeholderTextColor={COLORS.text.tertiary} multiline />

                <Text style={styles.subLabel}>Mission Focus</Text>
                <FieldNote>Short version shown in daily guidance.</FieldNote>
                <TextInput style={[styles.input, styles.multilineInput]} value={primaryOutcome} onChangeText={setPrimaryOutcome} placeholder={BUILD_GOAL_OBJECTIVE_PLACEHOLDERS[buildGoalType]} placeholderTextColor={COLORS.text.tertiary} multiline />

                <Text style={styles.subLabel}>Success Metric</Text>
                <FieldNote>Use a specific scoreboard if the default is not right.</FieldNote>
                <View style={styles.optionList}>
                  {getBuildMetricOptions(buildGoalType).map((option) => (
                    <OptionPill key={option.value} selected={selectedBuildMetric.value === option.value} label={option.label} onPress={() => setTargetMetric(option.value)} />
                  ))}
                </View>
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>{selectedBuildMetric.label}</Text>
                  <Text style={styles.previewLine}>{selectedBuildMetric.description}</Text>
                </View>

                <Text style={styles.subLabel}>Target {selectedBuildMetric.label}</Text>
                <TextInput style={styles.input} value={targetValue} onChangeText={setTargetValue} keyboardType="decimal-pad" placeholder={selectedBuildMetric.placeholder} placeholderTextColor={COLORS.text.tertiary} />

                <Text style={styles.subLabel}>Deadline (optional)</Text>
                <DatePickerField label="Goal Deadline" value={targetDate} onChange={setTargetDate} />

                <Text style={styles.subLabel}>Weeks (optional)</Text>
                <TextInput style={styles.input} value={targetHorizonWeeks} onChangeText={setTargetHorizonWeeks} keyboardType="number-pad" placeholder="8" placeholderTextColor={COLORS.text.tertiary} />
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.subLabel}>Fight Date</Text>
            <FieldNote>Your camp timeline is built from this date.</FieldNote>
            <DatePickerField label="Fight Date" value={fightDate} onChange={setFightDate} />

            <Text style={styles.subLabel}>Target Weight (lbs)</Text>
            <FieldNote>Use the contracted or intended weigh-in weight.</FieldNote>
            <TextInput style={styles.input} value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" placeholder="155" placeholderTextColor={COLORS.text.tertiary} />

            <Text style={styles.subLabel}>Weigh-in Timing</Text>
            <FieldNote>Same-day weigh-ins need more conservative assumptions.</FieldNote>
            <View style={styles.optionList}>
              <OptionPill selected={weighInTiming === 'same_day'} label="Same Day" onPress={() => setWeighInTiming('same_day')} />
              <OptionPill selected={weighInTiming === 'next_day'} label="Next Day" onPress={() => setWeighInTiming('next_day')} />
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Camp Target</Text>
              <Text style={styles.previewLine}>Fight: {daysToFight != null ? `${daysToFight} days out` : 'Set fight date'}.</Text>
              <Text style={styles.previewLine}>Target weight: {targetWeight.trim() ? `${targetWeight.trim()} lbs` : 'Add target weight'}.</Text>
              <Text style={styles.previewLine}>Weigh-in: {weighInLabel}.</Text>
            </View>

            <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowFightDetails((current) => !current)} activeOpacity={0.8}>
              <View style={styles.advancedToggleTextWrap}>
                <Text style={styles.advancedToggleTitle}>Fight Details</Text>
                <Text style={styles.advancedToggleDescription}>Optional travel and round format.</Text>
              </View>
              <Text style={styles.advancedToggleAction}>{showFightDetails ? 'Hide' : 'Open'}</Text>
            </TouchableOpacity>

            {showFightDetails ? (
              <>
                <Text style={styles.subLabel}>Travel Start (optional)</Text>
                <DatePickerField label="Travel Start" value={travelStartDate} onChange={setTravelStartDate} />

                <Text style={styles.subLabel}>Travel End (optional)</Text>
                <DatePickerField label="Travel End" value={travelEndDate} onChange={setTravelEndDate} />

                <Text style={styles.subLabel}>Rounds</Text>
                <View style={styles.pillRow}>
                  {ROUND_OPTIONS.map((value) => (
                    <OptionPill compact key={value} selected={roundCount === value} label={String(value)} onPress={() => setRoundCount(value)} />
                  ))}
                </View>

                <Text style={styles.subLabel}>Round Duration</Text>
                <View style={styles.pillRow}>
                  {ROUND_DURATION_OPTIONS.map((value) => (
                    <OptionPill compact key={value} selected={roundDurationSec === value} label={`${Math.round(value / 60)}m`} onPress={() => setRoundDurationSec(value)} />
                  ))}
                </View>

                <Text style={styles.subLabel}>Rest</Text>
                <View style={styles.pillRow}>
                  {REST_DURATION_OPTIONS.map((value) => (
                    <OptionPill compact key={value} selected={restDurationSec === value} label={`${value}s`} onPress={() => setRestDurationSec(value)} />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </Section>
    </>
  );
}
