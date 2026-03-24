import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { TimePickerField } from '../../components/TimePickerField';
import type { AvailabilityWindow } from '../../../lib/engine/types';
import { DAY_OPTIONS } from './constants';
import { FieldNote, Section } from './shared';
import { styles } from './styles';
import { sortWindows } from './utils';

type AvailabilityPhaseProps = {
  availableDays: number[];
  availabilityWindows: AvailabilityWindow[];
  toggleAvailabilityDay: (dayOfWeek: number) => void;
  updateAvailabilityWindow: (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => void;
};

export function AvailabilityPhase({
  availableDays,
  availabilityWindows,
  toggleAvailabilityDay,
  updateAvailabilityWindow,
}: AvailabilityPhaseProps) {
  return (
    <Section label="Availability Windows" description="Show when supplemental work is actually allowed to happen.">
      <FieldNote>Select only the days and time windows where the engine can safely place training.</FieldNote>
      <FieldNote>Tap each boundary and choose the earliest start and latest finish instead of typing times manually.</FieldNote>
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
      {sortWindows(availabilityWindows).map((window) => {
        const dayLabel = DAY_OPTIONS.find((day) => day.value === window.dayOfWeek)?.label ?? 'Day';
        return (
          <View key={window.dayOfWeek} style={styles.windowCard}>
            <Text style={styles.windowTitle}>{dayLabel}</Text>
            <FieldNote>Enter the earliest start and latest end time the planner can use on this day.</FieldNote>
            <View style={styles.inputRow}>
              <View style={[styles.inlineField, { marginRight: 12 }]}>
                <Text style={styles.subLabel}>Start</Text>
                <TimePickerField label={`${dayLabel} Start`} value={window.startTime} onChange={(value) => updateAvailabilityWindow(window.dayOfWeek, 'startTime', value)} />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.subLabel}>End</Text>
                <TimePickerField label={`${dayLabel} End`} value={window.endTime} onChange={(value) => updateAvailabilityWindow(window.dayOfWeek, 'endTime', value)} />
              </View>
            </View>
          </View>
        );
      })}
    </Section>
  );
}
