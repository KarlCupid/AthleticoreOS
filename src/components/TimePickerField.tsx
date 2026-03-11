import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export function TimePickerField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
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
      <TouchableOpacity style={styles.field} onPress={onOpen} activeOpacity={0.7}>
        <Text style={styles.fieldText}>{formatDisplay(value)}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{label}</Text>
              <TouchableOpacity onPress={onConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cancel: { fontSize: 16, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  title: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  done: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent },
  wheels: { flexDirection: 'row', position: 'relative' },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_H * 2,
    height: ITEM_H,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: COLORS.accent,
  },
});