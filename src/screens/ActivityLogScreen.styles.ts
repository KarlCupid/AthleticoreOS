import { StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

export const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backButton: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
    headerTitle: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
    content: { paddingHorizontal: SPACING.lg },
    card: {
        backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
        padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.card,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, marginBottom: SPACING.sm },
    addText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold },
    fieldRow: { marginBottom: SPACING.md },
    fieldLabel: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginBottom: 4 },
    fieldInput: {
        backgroundColor: COLORS.background, borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, fontSize: 16,
    },
    rpeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    rpeBubble: {
        width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.borderLight,
    },
    rpeBubbleText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    notesInput: {
        backgroundColor: COLORS.background, borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary, fontSize: 14,
        minHeight: 60, textAlignVertical: 'top',
    },
    emptyText: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, textAlign: 'center', paddingVertical: SPACING.md },
    componentCard: {
        backgroundColor: COLORS.background, borderRadius: RADIUS.md,
        padding: SPACING.sm, marginTop: SPACING.sm,
    },
    componentHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
    componentIcon: { fontSize: 18 },
    componentLabel: { flex: 1, fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    removeText: { fontSize: 18, color: COLORS.text.tertiary, fontWeight: 'bold' },
    componentFields: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
    miniField: { flex: 1, minWidth: 70 },
    miniLabel: { fontSize: 11, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, marginBottom: 2 },
    miniInput: {
        backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm, paddingVertical: 6,
        fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, fontSize: 14,
    },
    completeButton: {
        paddingVertical: SPACING.md, borderRadius: RADIUS.md,
        alignItems: 'center', marginTop: SPACING.md,
    },
    completeButtonText: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: '#F5F5F0' },
    pickerOverlay: {
        flex: 1,
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
    },
    pickerCard: {
        backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
        padding: SPACING.lg, paddingBottom: SPACING.xxl,
        maxHeight: '88%',
    },
    pickerTitle: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, marginBottom: SPACING.md },
    pickerOptionsList: {
        maxHeight: 400,
    },
    pickerOption: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
        minHeight: 48,
        paddingVertical: SPACING.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.borderLight,
    },
    pickerOptionIcon: { fontSize: 20 },
    pickerOptionLabel: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    pickerCancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, marginTop: SPACING.sm },
    pickerCancelText: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary },
});
