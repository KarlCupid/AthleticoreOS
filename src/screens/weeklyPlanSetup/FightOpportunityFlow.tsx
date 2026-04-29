import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { DatePickerField } from '../../components/DatePickerField';
import { COLORS } from '../../theme/theme';
import type {
  FightOpportunityStatus,
  GuidedFightOpportunityViewModel,
} from '../../../lib/performance-engine';
import type { FightOpponentMetadata } from '../../../lib/performance-engine';
import type { WeighInTiming } from '../../../lib/engine/types';
import { FieldNote, OptionPill } from './shared';
import { styles } from './styles';

type FightFlowStatus = Exclude<FightOpportunityStatus, 'completed'>;

type FightOpportunityFlowProps = {
  fightOpportunityStatus: FightFlowStatus;
  setFightOpportunityStatus: (value: FightFlowStatus) => void;
  fightDate: string;
  setFightDate: (value: string) => void;
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
  summary: GuidedFightOpportunityViewModel;
};

const STATUS_OPTIONS: Array<{ value: FightFlowStatus; label: string }> = [
  { value: 'tentative', label: 'Tentative' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'short_notice', label: 'Short notice' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'canceled', label: 'Canceled' },
];

const STANCE_OPTIONS: Array<{ value: FightOpponentMetadata['stance']; label: string }> = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'orthodox', label: 'Orthodox' },
  { value: 'southpaw', label: 'Southpaw' },
  { value: 'switch', label: 'Switch' },
];

const ROUND_OPTIONS = [3, 4, 5, 6, 8, 10, 12];
const ROUND_DURATION_OPTIONS = [120, 180];
const REST_DURATION_OPTIONS = [60, 90];

export function FightOpportunityFlow({
  fightOpportunityStatus,
  setFightOpportunityStatus,
  fightDate,
  setFightDate,
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
  summary,
}: FightOpportunityFlowProps) {
  const [showOptionalDetails, setShowOptionalDetails] = React.useState(false);
  const [summaryVisible, setSummaryVisible] = React.useState(false);
  const fightIsCanceled = fightOpportunityStatus === 'canceled';

  React.useEffect(() => {
    setSummaryVisible(false);
  }, [
    competitionTime,
    eventLocation,
    eventName,
    fightDate,
    fightOpportunityStatus,
    opponentName,
    opponentStance,
    restDurationSec,
    roundCount,
    roundDurationSec,
    targetWeight,
    targetWeightClassName,
    travelEndDate,
    travelStartDate,
    weighInDate,
    weighInTime,
    weighInTiming,
    weightClassChanged,
  ]);

  return (
    <>
      <Text style={styles.subLabel}>Fight Status</Text>
      <FieldNote>Start with what you know. Athleticore will keep tentative or changed fights connected to the same journey.</FieldNote>
      <View style={styles.optionList}>
        {STATUS_OPTIONS.map((option) => (
          <OptionPill
            key={option.value}
            selected={fightOpportunityStatus === option.value}
            label={option.label}
            onPress={() => setFightOpportunityStatus(option.value)}
            testID={`fight-status-${option.value}`}
          />
        ))}
      </View>

      {!fightIsCanceled ? (
        <>
          <Text style={styles.subLabel}>Fight Date</Text>
          <FieldNote>{fightOpportunityStatus === 'tentative' ? 'Add it if you have it. Tentative fights should not fully override your build.' : 'This tells Athleticore how much time is available.'}</FieldNote>
          <DatePickerField label="Fight Date" value={fightDate} onChange={setFightDate} testID="fight-date-picker" />

          <Text style={styles.subLabel}>Target Weight Class</Text>
          <FieldNote>Add the class name, scale target, or both. Missing body-mass context stays unknown.</FieldNote>
          <TextInput
            style={styles.input}
            value={targetWeightClassName}
            onChangeText={setTargetWeightClassName}
            placeholder="Welterweight"
            placeholderTextColor={COLORS.text.tertiary}
          />
          <TextInput
            style={styles.input}
            value={targetWeight}
            onChangeText={setTargetWeight}
            keyboardType="decimal-pad"
            placeholder="Target scale weight, if known"
            placeholderTextColor={COLORS.text.tertiary}
          />

          <Text style={styles.subLabel}>Weigh-in</Text>
          <FieldNote>Same-day weigh-ins call for more conservative assumptions.</FieldNote>
          <View style={styles.optionList}>
            <OptionPill selected={weighInTiming === 'same_day'} label="Same Day" onPress={() => setWeighInTiming('same_day')} testID="fight-weigh-in-same-day" />
            <OptionPill selected={weighInTiming === 'next_day'} label="Next Day" onPress={() => setWeighInTiming('next_day')} testID="fight-weigh-in-next-day" />
          </View>
        </>
      ) : (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Canceled Fight</Text>
          <Text style={styles.previewLine}>Athleticore will move the journey back toward useful build work without erasing recent camp, readiness, body-mass, or protected-workout context.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowOptionalDetails((current) => !current)} activeOpacity={0.8} testID="fight-details-toggle">
        <View style={styles.advancedToggleTextWrap}>
          <Text style={styles.advancedToggleTitle}>Opponent, event, and timing</Text>
          <Text style={styles.advancedToggleDescription}>Optional details that sharpen the opportunity summary.</Text>
        </View>
        <Text style={styles.advancedToggleAction}>{showOptionalDetails ? 'Hide' : 'Open'}</Text>
      </TouchableOpacity>

      {showOptionalDetails ? (
        <>
          {!fightIsCanceled ? (
            <>
              <Text style={styles.subLabel}>Competition Time</Text>
              <TextInput
                style={styles.input}
                value={competitionTime}
                onChangeText={setCompetitionTime}
                placeholder="19:30"
                placeholderTextColor={COLORS.text.tertiary}
              />

              <Text style={styles.subLabel}>Weigh-in Date</Text>
              <DatePickerField label="Weigh-in Date" value={weighInDate} onChange={setWeighInDate} testID="fight-weigh-in-date-picker" />

              <Text style={styles.subLabel}>Weigh-in Time</Text>
              <TextInput
                style={styles.input}
                value={weighInTime}
                onChangeText={setWeighInTime}
                placeholder="18:00"
                placeholderTextColor={COLORS.text.tertiary}
              />
            </>
          ) : null}

          <Text style={styles.subLabel}>Weight-Class Change</Text>
          <View style={styles.optionList}>
            <OptionPill selected={weightClassChanged} label="Weight class changed" onPress={() => setWeightClassChanged(true)} testID="fight-weight-class-changed" />
            <OptionPill selected={!weightClassChanged} label="No change" onPress={() => setWeightClassChanged(false)} testID="fight-weight-class-unchanged" />
          </View>

          <Text style={styles.subLabel}>Opponent</Text>
          <TextInput
            style={styles.input}
            value={opponentName}
            onChangeText={setOpponentName}
            placeholder="Opponent name"
            placeholderTextColor={COLORS.text.tertiary}
          />
          <View style={styles.pillRow}>
            {STANCE_OPTIONS.map((option) => (
              <OptionPill
                compact
                key={option.value ?? 'none'}
                selected={opponentStance === option.value}
                label={option.label}
                onPress={() => setOpponentStance(option.value)}
                testID={`fight-opponent-stance-${option.value ?? 'none'}`}
              />
            ))}
          </View>

          <Text style={styles.subLabel}>Event</Text>
          <TextInput
            style={styles.input}
            value={eventName}
            onChangeText={setEventName}
            placeholder="Event or promotion"
            placeholderTextColor={COLORS.text.tertiary}
          />
          <TextInput
            style={styles.input}
            value={eventLocation}
            onChangeText={setEventLocation}
            placeholder="Location"
            placeholderTextColor={COLORS.text.tertiary}
          />

          <Text style={styles.subLabel}>Travel Start (optional)</Text>
          <DatePickerField label="Travel Start" value={travelStartDate} onChange={setTravelStartDate} testID="fight-travel-start-picker" />

          <Text style={styles.subLabel}>Travel End (optional)</Text>
          <DatePickerField label="Travel End" value={travelEndDate} onChange={setTravelEndDate} testID="fight-travel-end-picker" />

          <Text style={styles.subLabel}>Rounds</Text>
          <View style={styles.pillRow}>
            {ROUND_OPTIONS.map((value) => (
              <OptionPill compact key={value} selected={roundCount === value} label={String(value)} onPress={() => setRoundCount(value)} testID={`fight-round-count-${value}`} />
            ))}
          </View>

          <Text style={styles.subLabel}>Round Duration</Text>
          <View style={styles.pillRow}>
            {ROUND_DURATION_OPTIONS.map((value) => (
              <OptionPill compact key={value} selected={roundDurationSec === value} label={`${Math.round(value / 60)}m`} onPress={() => setRoundDurationSec(value)} testID={`fight-round-duration-${value}`} />
            ))}
          </View>

          <Text style={styles.subLabel}>Rest</Text>
          <View style={styles.pillRow}>
            {REST_DURATION_OPTIONS.map((value) => (
              <OptionPill compact key={value} selected={restDurationSec === value} label={`${value}s`} onPress={() => setRestDurationSec(value)} testID={`fight-rest-duration-${value}`} />
            ))}
          </View>
        </>
      ) : null}

      <TouchableOpacity style={styles.advancedToggle} onPress={() => setSummaryVisible(true)} activeOpacity={0.8} testID="fight-opportunity-evaluate">
        <View style={styles.advancedToggleTextWrap}>
          <Text style={styles.advancedToggleTitle}>{summary.ctaLabel}</Text>
          <Text style={styles.advancedToggleDescription}>Connect timing, readiness, fueling, body-mass context, and protected work.</Text>
        </View>
        <Text style={styles.advancedToggleAction}>Evaluate</Text>
      </TouchableOpacity>

      {summaryVisible ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Fight Opportunity Summary</Text>
          <Text style={styles.previewLine}>{summary.summary}</Text>
          <Text style={styles.previewLine}>Status: {summary.statusLabel}.</Text>
          <Text style={styles.previewLine}>Time: {summary.timeAvailable}{daysToFight != null ? ` (${daysToFight} days out)` : ''}.</Text>
          <Text style={styles.previewLine}>Current phase: {summary.currentPhaseLabel}.</Text>
          {summary.fightDetailsSummary ? (
            <Text style={styles.previewLine}>{summary.fightDetailsSummary}</Text>
          ) : null}
          <Text style={styles.previewLine}>{summary.recommendedTransition}</Text>
          <Text style={styles.previewLine}>{summary.trainingAdjustment}</Text>
          <Text style={styles.previewLine}>{summary.fuelingAdjustment}</Text>
          <Text style={styles.previewLine}>{summary.bodyMassFeasibility}</Text>
          <Text style={styles.previewLine}>{summary.readinessEvaluation}</Text>
          <Text style={styles.previewLine}>{summary.protectedWorkoutSummary}</Text>
          {summary.riskHighlights.map((risk) => (
            <Text key={risk} style={styles.previewLine}>{risk}</Text>
          ))}
          {summary.whatHappensNext.slice(0, 3).map((step) => (
            <Text key={step} style={styles.previewLine}>Next: {step}.</Text>
          ))}
        </View>
      ) : null}
    </>
  );
}
