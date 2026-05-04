import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import {
  APP_PRIVACY_POLICY_URL,
  APP_SUPPORT_EMAIL,
  APP_SUPPORT_MAILTO,
  APP_SUPPORT_URL,
  PRIVACY_POLICY_SECTIONS,
} from '../config/appReview';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../theme/theme';

export function LegalSupportScreen() {
  const openUrl = async (url: string, fallbackTitle: string, fallbackBody: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(fallbackTitle, fallbackBody);
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(fallbackTitle, fallbackBody);
    }
  };

  const handleEmailSupport = async () => {
    await openUrl(APP_SUPPORT_MAILTO, 'Support email', APP_SUPPORT_EMAIL);
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <ScreenHeader
          kicker="Support"
          title="Privacy & support"
          subtitle="Submission-ready account, privacy, and contact details for the app."
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant="glass" title="Privacy policy" subtitle="In-app summary plus the public policy link used for review.">
          <View style={styles.sectionStack}>
            {PRIVACY_POLICY_SECTIONS.map((section, index) => (
              <View
                key={section.title}
                style={[styles.policySection, index === PRIVACY_POLICY_SECTIONS.length - 1 && styles.policySectionLast]}
              >
                <Text style={styles.policyTitle}>{section.title}</Text>
                <Text style={styles.policyBody}>{section.body}</Text>
              </View>
            ))}
          </View>
          {APP_PRIVACY_POLICY_URL ? (
            <AnimatedPressable
              accessibilityRole="link"
              accessibilityLabel="Open full privacy policy"
              style={[styles.primaryButton, styles.secondaryButton]}
              onPress={() => void openUrl(APP_PRIVACY_POLICY_URL, 'Privacy policy', APP_PRIVACY_POLICY_URL)}
            >
              <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>Open full privacy policy</Text>
            </AnimatedPressable>
          ) : null}
        </Card>

        <Card
          variant="glass"
          title="Support contact"
          subtitle="Use this for product questions, privacy requests, and App Review follow-up."
        >
          <Text style={styles.supportEmail}>{APP_SUPPORT_EMAIL}</Text>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Email support"
            style={styles.primaryButton}
            onPress={() => void handleEmailSupport()}
          >
            <Text style={styles.primaryButtonText}>Email support</Text>
          </AnimatedPressable>
          {APP_SUPPORT_URL ? (
            <AnimatedPressable
              accessibilityRole="link"
              accessibilityLabel="Open support site"
              style={[styles.primaryButton, styles.secondaryButton]}
              onPress={() => void openUrl(APP_SUPPORT_URL, 'Support site', APP_SUPPORT_URL)}
            >
              <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>Open support site</Text>
            </AnimatedPressable>
          ) : null}
        </Card>

        <Card
          variant="glass"
          title="Health guidance note"
          subtitle="This wording is included to keep the product framed correctly for review."
        >
          <Text style={styles.bodyText}>
            AthletiCore provides training, nutrition, hydration, and weight-management guidance for educational and
            coaching purposes. It does not diagnose conditions, replace licensed medical care, or act as an emergency
            service.
          </Text>
        </Card>
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
  sectionStack: {
    gap: SPACING.md,
  },
  policySection: {
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  policySectionLast: {
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  policyTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  policyBody: {
    marginTop: SPACING.xs,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 21,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 21,
  },
  supportEmail: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  primaryButton: {
    marginTop: SPACING.md,
    minHeight: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  secondaryButton: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text.primary,
  },
});
