import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { IconCheckCircle } from '../../components/icons';
import { COLORS } from '../../theme/theme';
import { styles } from './styles';

export function OptionPill({
  selected,
  label,
  onPress,
  compact = false,
  testID,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  compact?: boolean;
  testID?: string;
}) {
  if (compact) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[styles.optionPill, selected && styles.optionPillSelected]}
        onPress={onPress}
        activeOpacity={0.75}
        testID={testID}
      >
        <Text style={[styles.optionPillText, selected && styles.optionPillTextSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
      testID={testID}
    >
      <Text style={[styles.optionCardText, selected && styles.optionCardTextSelected]}>{label}</Text>
      <View style={[styles.optionCardIndicator, selected && styles.optionCardIndicatorSelected]}>
        {selected ? <IconCheckCircle size={14} color={COLORS.readiness.prime} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export function FieldNote({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldNote}>{children}</Text>;
}

export function Section({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      {children}
    </View>
  );
}
