import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { WheelColumn } from './WheelColumn';
import { IconCalendar } from './icons';
import { COLORS, FONT_FAMILY, RADIUS, SPACING, SHADOWS } from '../theme/theme';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ITEM_H = 48;

export function DatePickerField({ label, value, onChange }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);

    const parseValue = (s: string) => {
        if (!s) {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
        }
        const parts = s.split('-');
        return { y: parseInt(parts[0]) || 2026, m: parseInt(parts[1]) || 1, d: parseInt(parts[2]) || 1 };
    };

    const initial = parseValue(value);
    const [tempY, setTempY] = useState(initial.y);
    const [tempM, setTempM] = useState(initial.m);
    const [tempD, setTempD] = useState(initial.d);

    const currentYear = new Date().getFullYear();
    const YEARS = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
    const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
    const maxDay = new Date(tempY, tempM, 0).getDate();
    const DAYS = Array.from({ length: maxDay }, (_, i) => i + 1);

    useEffect(() => {
        if (tempD > maxDay) setTempD(maxDay);
    }, [tempM, tempY, maxDay]);

    const onOpen = () => {
        const p = parseValue(value);
        setTempY(p.y); setTempM(p.m); setTempD(p.d);
        setOpen(true);
    };

    const onConfirm = () => {
        const clamped = Math.min(tempD, new Date(tempY, tempM, 0).getDate());
        onChange(`${tempY}-${String(tempM).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`);
        setOpen(false);
    };

    const displayDate = value
        ? (() => {
            const p = parseValue(value);
            return `${MONTH_SHORT[p.m - 1]} ${p.d}, ${p.y}`;
        })()
        : 'Tap to select';

    return (
        <>
            <TouchableOpacity style={styles.dateField} onPress={onOpen} activeOpacity={0.7}>
                <Text style={[styles.dateFieldText, !value && { color: COLORS.text.tertiary }]}>
                    {displayDate}
                </Text>
                <IconCalendar size={18} color={COLORS.text.secondary} />
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={styles.pickerOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
                    <View style={styles.pickerSheet}>
                        <View style={styles.pickerHeader}>
                            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={styles.pickerCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.pickerTitle}>{label}</Text>
                            <TouchableOpacity onPress={onConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={styles.pickerDone}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', position: 'relative' }}>
                            <WheelColumn items={MONTHS} selected={tempM} onSelect={setTempM} flex={2.2} format={(v) => MONTH_NAMES[v - 1]} />
                            <WheelColumn items={DAYS} selected={tempD} onSelect={setTempD} flex={1} format={(v) => String(v)} />
                            <WheelColumn items={YEARS} selected={tempY} onSelect={setTempY} flex={1.8} format={(v) => String(v)} />
                            <View pointerEvents="none" style={styles.pickerHighlight} />
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    dateField: {
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
    dateFieldText: { fontSize: 16, fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary },

    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    pickerSheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
        overflow: 'hidden',
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    pickerCancel: { fontSize: 16, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
    pickerTitle: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    pickerDone: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: '#16A34A' },
    pickerHighlight: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: ITEM_H * 2,
        height: ITEM_H,
        borderTopWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor: '#16A34A',
    },
});


