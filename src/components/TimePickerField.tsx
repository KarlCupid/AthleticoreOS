import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WheelColumn } from './WheelColumn';
import { COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING } from '../theme/theme';

const ITEM_H = 48;
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 15, 30, 45];
const PERIOD_OPTIONS = [0, 1];

type Period = 'AM' | 'PM';

function periodToIndex(period: Period): number {
  return period === 'PM' ? 1 : 0;
}

function indexToPeriod(value: number): Period {
  return value === 1 ? 'PM' : 'AM';
}

function parseTime(value: string): { hour: number; minute: number; period: Period } {
  if (!value) {
    return { hour: 6, minute: 0, period: 'PM' };
  }

  const [hourPart, minutePart] = value.split(':');
  const hour24 = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return { hour: 6, minute: 0, period: 'PM' };
  }

  const period: Period = hour24 >= 12 ? 'PM' : 'AM';
  const hour = hour24 % 12 || 12;
  const roundedMinute = MINUTES.includes(minute) ? minute : MINUTES.reduce((closest, current) => (
    Math.abs(current - minute) < Math.abs(closest - minute) ? current : closest
  ), MINUTES[0]);

  return { hour, minute: roundedMinute, period };
}

function to24Hour(hour: number, minute: number, period: Period): string {
  const normalizedHour = period === 'PM'
    ? (hour === 12 ? 12 : hour + 12)
    : (hour === 12 ? 0 : hour);

  return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDisplay(value: string): string {
  const { hour, minute, period } = parseTime(value);
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
}

export function TimePickerField({ label, value, onChange, testID }: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const initial = parseTime(value);
  const [tempHour, setTempHour] = useState(initial.hour);
  const [tempMinute, setTempMinute] = useState(initial.minute);
  const [tempPeriod, setTempPeriod] = useState<Period>(initial.period);

  const onOpen = () => {
    const next = parseTime(value);
    setTempHour(next.hour);
    setTempMinute(next.minute);
    setTempPeriod(next.period);
    setOpen(true);
  };

  const onConfirm = () => {
    onChange(to24Hour(tempHour, tempMinute, tempPeriod));
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens a time picker."
        style={styles.field}
        onPress={onOpen}
        activeOpacity={0.7}
        testID={testID}
      >
        <Text style={styles.fieldText}>{formatDisplay(value)}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} testID={testID ? `${testID}-scrim` : undefined} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 34 : SPACING.lg) }]}>
            <View style={styles.header}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel time picker" style={styles.headerAction} onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} testID={testID ? `${testID}-cancel` : undefined}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{label}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Confirm time" style={styles.headerAction} onPress={onConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} testID={testID ? `${testID}-done` : undefined}>
                <Text style={styles.done}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.wheels}>
              <WheelColumn items={HOURS} selected={tempHour} onSelect={setTempHour} flex={1.2} format={(item) => String(item)} />
              <WheelColumn items={MINUTES} selected={tempMinute} onSelect={setTempMinute} flex={1.2} format={(item) => String(item).padStart(2, '0')} />
              <WheelColumn items={PERIOD_OPTIONS} selected={periodToIndex(tempPeriod)} onSelect={(item) => setTempPeriod(indexToPeriod(item))} flex={1.1} format={(item) => indexToPeriod(item)} />
              <View pointerEvents="none" style={styles.highlight} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  fieldText: { fontSize: 16, fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.82)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.24)',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 245, 240, 0.12)',
  },
  headerAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cancel: { fontSize: 16, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  title: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  done: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent },
  wheels: {
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: COLORS.background,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_H * 2,
    height: ITEM_H,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.62)',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
});
