import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { deleteMyAccount } from '../../lib/api/accountService';
import { getSupabaseAuthErrorCopy } from '../../lib/api/authUx';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../theme/theme';

export function DeleteAccountScreen() {
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete account permanently?',
      'This removes your AthletiCore account, profile, logs, plans, and history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteMyAccount();
            } catch (error) {
              Alert.alert('Delete failed', getSupabaseAuthErrorCopy(error, 'deleteAccount'));
              setDeleting(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <ScreenWrapper useSafeArea>
      <View style={styles.header}>
        <ScreenHeader
          kicker="Account"
          title="Delete account"
          subtitle="Use this if you want to permanently remove your AthletiCore account and stored app data."
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant="glass" title="What will be deleted">
          <View style={styles.list}>
            <Text style={styles.listItem}>Your sign-in account</Text>
            <Text style={styles.listItem}>Profile, planning, and gym setup data</Text>
            <Text style={styles.listItem}>Workout, nutrition, hydration, and weight-class history</Text>
            <Text style={styles.listItem}>Saved schedules, goals, and engine snapshots</Text>
          </View>
        </Card>

        <Card
          variant="glass"
          title="Important"
          subtitle="This is permanent. Deleting your account cannot be undone."
        >
          <View style={styles.confirmRow}>
            <View style={styles.confirmCopy}>
              <Text style={styles.confirmTitle}>I understand this permanently deletes my account and app data.</Text>
              <Text style={styles.confirmBody}>Turn this on to enable the deletion button below.</Text>
            </View>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel="Confirm permanent account deletion"
              accessibilityHint="Enables the delete account button."
              value={confirmed}
              onValueChange={setConfirmed}
              trackColor={{ true: COLORS.readiness.depleted, false: COLORS.border }}
              thumbColor={COLORS.text.primary}
            />
          </View>
        </Card>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
          accessibilityHint="Shows a final confirmation before permanently deleting your account and app data."
          accessibilityState={{ disabled: !confirmed || deleting, busy: deleting }}
          style={[styles.deleteButton, (!confirmed || deleting) && styles.deleteButtonDisabled]}
          disabled={!confirmed || deleting}
          onPress={handleDelete}
        >
          {deleting ? <ActivityIndicator size="small" color={COLORS.text.primary} /> : null}
          <Text style={styles.deleteButtonText}>{deleting ? 'Deleting account...' : 'Delete my account'}</Text>
        </AnimatedPressable>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  list: {
    gap: SPACING.sm,
  },
  listItem: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 21,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  confirmCopy: {
    flex: 1,
  },
  confirmTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    lineHeight: 21,
  },
  confirmBody: {
    marginTop: SPACING.xs,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  deleteButton: {
    minHeight: 52,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.readiness.depleted,
  },
  deleteButtonDisabled: {
    opacity: 0.45,
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
});
