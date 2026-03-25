import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { DAY_OPTIONS } from './constants';
import { FieldNote, Section } from './shared';
import { styles } from './styles';

type AvailabilityPhaseProps = {
  availableDays: number[];
  toggleAvailabilityDay: (dayOfWeek: number) => void;
};

export function AvailabilityPhase({
  availableDays,
  toggleAvailabilityDay,
}: AvailabilityPhaseProps) {
  return (
    <Section label="Training Days" description="Choose the days the planner can use when it builds the week.">
      <FieldNote>The planner is day-based now. It selects the best training mix for each available day instead of fitting work into time blocks.</FieldNote>
      <FieldNote>Fixed boxing and sparring commitments still stay locked to their day, but guided work is no longer capped by setup-time duration windows.</FieldNote>
      <View style={styles.dayRow}>
        {DAY_OPTIONS.map((day) => {
          const selected = availableDays.includes(day.value);
          return (
            <TouchableOpacity key={day.value} style={[styles.dayPill, selected && styles.dayPillSelected]} onPress={() => toggleAvailabilityDay(day.value)} activeOpacity={0.75}>
              <Text style={[styles.dayPillText, selected && styles.optionPillTextSelected]}>{day.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Section>
  );
}
