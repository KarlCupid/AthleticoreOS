import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { DAY_OPTIONS } from './constants';
import { Section } from './shared';
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
    <Section label="Training Days" description="Pick the days you can usually train. Start realistic; you can change this later.">
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
