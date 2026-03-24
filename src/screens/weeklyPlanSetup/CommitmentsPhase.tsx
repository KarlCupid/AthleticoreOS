import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { TimePickerField } from '../../components/TimePickerField';
import { COLORS, SPACING } from '../../theme/theme';
import { COMMITMENT_OPTIONS, DAY_OPTIONS } from './constants';
import { FieldNote, OptionPill, Section } from './shared';
import { styles } from './styles';
import type { EditableCommitment } from './types';

type CommitmentsPhaseProps = {
  commitments: EditableCommitment[];
  updateCommitment: (id: string, patch: Partial<EditableCommitment>) => void;
  removeCommitment: (id: string) => void;
  addCommitment: () => void;
  setDurationPickerCommitmentId: (value: string | null) => void;
};

export function CommitmentsPhase({
  commitments,
  updateCommitment,
  removeCommitment,
  addCommitment,
  setDurationPickerCommitmentId,
}: CommitmentsPhaseProps) {
  return (
    <Section label="Recurring Gym Commitments" description="List coach-set or standing sessions that should anchor the week.">
      <FieldNote>Mandatory means the planner must work around it. Preferred means it should try to preserve it when possible.</FieldNote>
      {commitments.map((commitment) => (
        <View key={commitment.id} style={styles.commitmentCard}>
          <View style={styles.commitmentHeader}>
            <Text style={styles.commitmentTitle}>{commitment.label || 'Gym Session'}</Text>
            <TouchableOpacity onPress={() => removeCommitment(commitment.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subLabel}>Session Type</Text>
          <FieldNote>Choose what this session actually is so the engine can model load correctly.</FieldNote>
          <View style={styles.optionList}>
            {COMMITMENT_OPTIONS.map((option) => (
              <OptionPill key={option.value} selected={commitment.activityType === option.value} label={option.label} onPress={() => updateCommitment(commitment.id, { activityType: option.value })} />
            ))}
          </View>
          <Text style={styles.subLabel}>Constraint Tier</Text>
          <View style={styles.optionList}>
            <OptionPill selected={commitment.tier === 'mandatory'} label="Mandatory" onPress={() => updateCommitment(commitment.id, { tier: 'mandatory' })} />
            <OptionPill selected={commitment.tier === 'preferred'} label="Preferred" onPress={() => updateCommitment(commitment.id, { tier: 'preferred' })} />
          </View>
          <Text style={styles.subLabel}>Day</Text>
          <View style={styles.pillRow}>
            {DAY_OPTIONS.map((day) => (
              <OptionPill compact key={day.value} selected={commitment.dayOfWeek === day.value} label={day.label} onPress={() => updateCommitment(commitment.id, { dayOfWeek: day.value })} />
            ))}
          </View>
          <Text style={styles.subLabel}>Label</Text>
          <FieldNote>Use the real session name if you have one, such as Team Sparring or Technical Boxing.</FieldNote>
          <TextInput style={styles.input} value={commitment.label} onChangeText={(value) => updateCommitment(commitment.id, { label: value })} placeholder="Team sparring" placeholderTextColor={COLORS.text.tertiary} />
          <View style={styles.inputRow}>
            <View style={[styles.inlineField, { marginRight: SPACING.sm }]}>
              <Text style={styles.subLabel}>Start Time</Text>
              <TimePickerField label={`${commitment.label || 'Commitment'} Start`} value={commitment.startTime} onChange={(value) => updateCommitment(commitment.id, { startTime: value })} />
            </View>
            <View style={styles.inlineField}>
              <Text style={styles.subLabel}>Duration</Text>
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={() => setDurationPickerCommitmentId(commitment.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownFieldText}>{commitment.durationMin ? `${commitment.durationMin} min` : 'Select duration'}</Text>
                <Text style={styles.dropdownFieldChevron}>v</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.subLabel}>Typical Intensity</Text>
          <FieldNote>This should reflect how hard the session usually is, not the best-case day.</FieldNote>
          <View style={styles.pillRow}>
            {[4, 5, 6, 7, 8, 9].map((value) => (
              <OptionPill compact key={value} selected={commitment.expectedIntensity === value} label={`RPE ${value}`} onPress={() => updateCommitment(commitment.id, { expectedIntensity: value })} />
            ))}
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.secondaryButton} onPress={addCommitment}>
        <Text style={styles.secondaryButtonText}>Add Recurring Commitment</Text>
      </TouchableOpacity>
    </Section>
  );
}
