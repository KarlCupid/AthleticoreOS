import React from 'react';
import { Switch, Text, View } from 'react-native';

import { COLORS } from '../../theme/theme';
import { DAY_OPTIONS, DELOAD_OPTIONS, DURATION_OPTIONS } from './constants';
import { FieldNote, OptionPill, Section } from './shared';
import { styles } from './styles';
import type { SessionType } from './types';

type PlannerPhaseProps = {
  sessionDuration: number;
  setSessionDuration: (value: number) => void;
  allowTwoADays: boolean;
  handleAllowTwoADaysChange: (value: boolean) => void;
  twoADayDays: number[];
  availableDays: number[];
  toggleTwoADay: (day: number) => void;
  amSessionType: SessionType;
  setAmSessionType: (value: SessionType) => void;
  pmSessionType: SessionType;
  setPmSessionType: (value: SessionType) => void;
  autoDeloadInterval: number;
  setAutoDeloadInterval: (value: number) => void;
};

export function PlannerPhase({
  sessionDuration,
  setSessionDuration,
  allowTwoADays,
  handleAllowTwoADaysChange,
  twoADayDays,
  availableDays,
  toggleTwoADay,
  amSessionType,
  setAmSessionType,
  pmSessionType,
  setPmSessionType,
  autoDeloadInterval,
  setAutoDeloadInterval,
}: PlannerPhaseProps) {
  return (
    <Section label="Weekly Planner" description="These settings decide how the engine fills open space after it places fixed work.">
      <Text style={styles.subLabel}>Default Session Duration</Text>
      <FieldNote>Pick the standard duration for sessions the engine creates automatically.</FieldNote>
      <View style={styles.pillRow}>
        {DURATION_OPTIONS.map((minutes) => (
          <OptionPill compact key={minutes} selected={sessionDuration === minutes} label={`${minutes}m`} onPress={() => setSessionDuration(minutes)} />
        ))}
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Allow two-a-day sessions</Text>
        <Switch
          value={allowTwoADays}
          onValueChange={handleAllowTwoADaysChange}
          trackColor={{ false: COLORS.border, true: COLORS.readiness.prime }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={COLORS.border}
        />
      </View>
      <FieldNote>Enable this only on days where doubling up is realistic and sustainable.</FieldNote>
      {allowTwoADays ? (
        <>
          <Text style={styles.subLabel}>Two-a-day days</Text>
          <FieldNote>Choose which available days are allowed to host two separate sessions.</FieldNote>
          <View style={styles.pillRow}>
            {availableDays.map((day) => {
              const label = DAY_OPTIONS.find((option) => option.value === day)?.label ?? 'Day';
              return <OptionPill compact key={day} selected={twoADayDays.includes(day)} label={label} onPress={() => toggleTwoADay(day)} />;
            })}
          </View>
          <Text style={styles.subLabel}>AM session type</Text>
          <FieldNote>Choose what the first session should usually be.</FieldNote>
          <View style={styles.optionList}>
            <OptionPill selected={amSessionType === 'sc'} label="S&C" onPress={() => setAmSessionType('sc')} />
            <OptionPill selected={amSessionType === 'boxing_practice'} label="Boxing" onPress={() => setAmSessionType('boxing_practice')} />
            <OptionPill selected={amSessionType === 'conditioning'} label="Conditioning" onPress={() => setAmSessionType('conditioning')} />
          </View>
          <Text style={styles.subLabel}>PM session type</Text>
          <View style={styles.optionList}>
            <OptionPill selected={pmSessionType === 'sc'} label="S&C" onPress={() => setPmSessionType('sc')} />
            <OptionPill selected={pmSessionType === 'boxing_practice'} label="Boxing" onPress={() => setPmSessionType('boxing_practice')} />
            <OptionPill selected={pmSessionType === 'conditioning'} label="Conditioning" onPress={() => setPmSessionType('conditioning')} />
          </View>
        </>
      ) : null}
      <Text style={styles.subLabel}>Auto Deload</Text>
      <FieldNote>Choose how often the planner should reduce loading to manage fatigue over time.</FieldNote>
      <View style={styles.pillRow}>
        {DELOAD_OPTIONS.map((weeks) => (
          <OptionPill compact key={weeks} selected={autoDeloadInterval === weeks} label={`Every ${weeks}w`} onPress={() => setAutoDeloadInterval(weeks)} />
        ))}
      </View>
    </Section>
  );
}
