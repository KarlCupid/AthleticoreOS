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
import type {
  FightOpportunityStatus,
  FightOpponentMetadata,
  GuidedFightOpportunityViewModel,
} from '../../../lib/performance-engine';
import {
  BUILD_GOAL_OBJECTIVE_PLACEHOLDERS,
  BUILD_GOAL_OPTIONS,
  SECONDARY_CONSTRAINT_OPTIONS,
} from './constants';
import { FightOpportunityFlow } from './FightOpportunityFlow';
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
  fightOpportunityStatus: Exclude<FightOpportunityStatus, 'completed'>;
  setFightOpportunityStatus: (value: Exclude<FightOpportunityStatus, 'completed'>) => void;
  competitionTime: string;
  setCompetitionTime: (value: string) => void;
  weighInDate: string;
  setWeighInDate: (value: string) => void;
  weighInTime: string;
  setWeighInTime: (value: string) => void;
  targetWeightClassName: string;
  setTargetWeightClassName: (value: string) => void;
  targetWeight: string;
  setTargetWeight: (value: string) => void;
  weightClassChanged: boolean;
  setWeightClassChanged: (value: boolean) => void;
  opponentName: string;
  setOpponentName: (value: string) => void;
  opponentStance: FightOpponentMetadata['stance'];
  setOpponentStance: (value: FightOpponentMetadata['stance']) => void;
  eventName: string;
  setEventName: (value: string) => void;
  eventLocation: string;
  setEventLocation: (value: string) => void;
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
  fightOpportunitySummary: GuidedFightOpportunityViewModel;
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
    fightOpportunityStatus,
    setFightOpportunityStatus,
    competitionTime,
    setCompetitionTime,
    weighInDate,
    setWeighInDate,
    weighInTime,
    setWeighInTime,
    targetWeightClassName,
    setTargetWeightClassName,
    targetWeight,
    setTargetWeight,
    weightClassChanged,
    setWeightClassChanged,
    opponentName,
    setOpponentName,
    opponentStance,
    setOpponentStance,
    eventName,
    setEventName,
    eventLocation,
    setEventLocation,
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
    fightOpportunitySummary,
  } = props;

  const selectedConstraintLabel =
    SECONDARY_CONSTRAINT_OPTIONS.find((option) => option.value === secondaryConstraint)?.label ?? 'Recovery';

  return (
    <>
      <Section label="Start Date" description="When should this journey segment begin?">
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

      <Section label="Training Goal" description="Choose the adjustment that matches your next block.">
        <View style={styles.optionList}>
          <OptionPill selected={goalMode === 'fight_camp'} label="Fight Camp" onPress={() => setGoalMode('fight_camp')} />
          <OptionPill selected={goalMode === 'build_phase'} label="Build Phase" onPress={() => setGoalMode('build_phase')} />
        </View>

        {goalMode === 'build_phase' ? (
          <>
            <Text style={styles.subLabel}>Main Focus</Text>
            <FieldNote>Pick the quality your ongoing journey should build first.</FieldNote>
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
          <FightOpportunityFlow
            fightOpportunityStatus={fightOpportunityStatus}
            setFightOpportunityStatus={setFightOpportunityStatus}
            fightDate={fightDate}
            setFightDate={setFightDate}
            competitionTime={competitionTime}
            setCompetitionTime={setCompetitionTime}
            weighInDate={weighInDate}
            setWeighInDate={setWeighInDate}
            weighInTime={weighInTime}
            setWeighInTime={setWeighInTime}
            targetWeightClassName={targetWeightClassName}
            setTargetWeightClassName={setTargetWeightClassName}
            targetWeight={targetWeight}
            setTargetWeight={setTargetWeight}
            weightClassChanged={weightClassChanged}
            setWeightClassChanged={setWeightClassChanged}
            opponentName={opponentName}
            setOpponentName={setOpponentName}
            opponentStance={opponentStance}
            setOpponentStance={setOpponentStance}
            eventName={eventName}
            setEventName={setEventName}
            eventLocation={eventLocation}
            setEventLocation={setEventLocation}
            weighInTiming={weighInTiming}
            setWeighInTiming={setWeighInTiming}
            travelStartDate={travelStartDate}
            setTravelStartDate={setTravelStartDate}
            travelEndDate={travelEndDate}
            setTravelEndDate={setTravelEndDate}
            roundCount={roundCount}
            setRoundCount={setRoundCount}
            roundDurationSec={roundDurationSec}
            setRoundDurationSec={setRoundDurationSec}
            restDurationSec={restDurationSec}
            setRestDurationSec={setRestDurationSec}
            daysToFight={daysToFight}
            summary={fightOpportunitySummary}
          />
        )}
      </Section>
    </>
  );
}
