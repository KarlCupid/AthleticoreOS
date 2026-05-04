import React from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { TimePickerField } from '../../components/TimePickerField';
import { COLORS, SPACING } from '../../theme/theme';
import { COMMITMENT_OPTIONS, DAY_OPTIONS } from './constants';
import { OptionPill, Section } from './shared';
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
  function confirmRemoveCommitment(id: string, label: string) {
    Alert.alert(
      'Remove fixed session?',
      `${label || 'This fixed session'} will no longer be protected in your weekly planning setup.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeCommitment(id) },
      ],
    );
  }

  return (
    <Section label="Fixed Sessions" description="Add classes, sparring, or coach-set work that already has a spot in your week.">
      {commitments.map((commitment) => (
        <View key={commitment.id} style={styles.commitmentCard}>
          <View style={styles.commitmentHeader}>
            <Text style={styles.commitmentTitle}>{commitment.label || 'Gym Session'}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Remove ${commitment.label || 'fixed session'}`}
              accessibilityHint="Asks for confirmation before removing this protected session from setup."
              onPress={() => confirmRemoveCommitment(commitment.id, commitment.label)}
            >
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subLabel}>Type</Text>
          <View style={styles.optionList}>
            {COMMITMENT_OPTIONS.map((option) => (
              <OptionPill key={option.value} selected={commitment.activityType === option.value} label={option.label} onPress={() => updateCommitment(commitment.id, { activityType: option.value })} />
            ))}
          </View>
          <Text style={styles.subLabel}>Lock It In?</Text>
          <View style={styles.optionList}>
            <OptionPill selected={commitment.tier === 'mandatory'} label="Must keep" onPress={() => updateCommitment(commitment.id, { tier: 'mandatory' })} />
            <OptionPill selected={commitment.tier === 'preferred'} label="Move if needed" onPress={() => updateCommitment(commitment.id, { tier: 'preferred' })} />
          </View>
          <Text style={styles.subLabel}>Day</Text>
          <View style={styles.pillRow}>
            {DAY_OPTIONS.map((day) => (
              <OptionPill compact key={day.value} selected={commitment.dayOfWeek === day.value} label={day.label} onPress={() => updateCommitment(commitment.id, { dayOfWeek: day.value })} />
            ))}
          </View>
          <Text style={styles.subLabel}>Label</Text>
          <TextInput
            accessibilityLabel="Fixed session label"
            style={styles.input}
            value={commitment.label}
            onChangeText={(value) => updateCommitment(commitment.id, { label: value })}
            placeholder="Team sparring"
            placeholderTextColor={COLORS.text.tertiary}
          />
          <View style={styles.inputRow}>
            <View style={[styles.inlineField, { marginRight: SPACING.sm }]}>
              <Text style={styles.subLabel}>Time</Text>
              <TimePickerField label={`${commitment.label || 'Commitment'} Start`} value={commitment.startTime} onChange={(value) => updateCommitment(commitment.id, { startTime: value })} />
            </View>
            <View style={styles.inlineField}>
              <Text style={styles.subLabel}>Duration</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Duration ${commitment.durationMin ? `${commitment.durationMin} minutes` : 'not selected'}`}
                accessibilityHint="Opens duration choices for this fixed session."
                style={styles.dropdownField}
                onPress={() => setDurationPickerCommitmentId(commitment.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownFieldText}>{commitment.durationMin ? `${commitment.durationMin} min` : 'Select duration'}</Text>
                <Text style={styles.dropdownFieldChevron}>v</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.subLabel}>Intensity</Text>
          <View style={styles.pillRow}>
            {[4, 5, 6, 7, 8, 9].map((value) => (
              <OptionPill compact key={value} selected={commitment.expectedIntensity === value} label={`RPE ${value}`} onPress={() => updateCommitment(commitment.id, { expectedIntensity: value })} />
            ))}
          </View>
        </View>
      ))}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add fixed session"
        accessibilityHint="Adds another protected training commitment to this setup."
        style={styles.secondaryButton}
        onPress={addCommitment}
      >
        <Text style={styles.secondaryButtonText}>Add Fixed Session</Text>
      </TouchableOpacity>
    </Section>
  );
}
