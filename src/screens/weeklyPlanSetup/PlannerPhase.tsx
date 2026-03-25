import React from 'react';
import { Text, View } from 'react-native';

import { DELOAD_OPTIONS } from './constants';
import { FieldNote, OptionPill, Section } from './shared';
import { styles } from './styles';

type PlannerPhaseProps = {
  autoDeloadInterval: number;
  setAutoDeloadInterval: (value: number) => void;
};

export function PlannerPhase({
  autoDeloadInterval,
  setAutoDeloadInterval,
}: PlannerPhaseProps) {
  return (
    <Section label="Weekly Planner" description="These settings shape the recovery rhythm for the optimizer.">
      <Text style={styles.subLabel}>Planner behavior</Text>
      <FieldNote>Guided sessions are now composed day by day from the best strength, conditioning, durability, and recovery mix.</FieldNote>
      <FieldNote>The engine can build multi-module blocks when it needs to close weekly dose targets, and session length is derived from the work itself instead of a setup cap.</FieldNote>
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
