import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { APP_SUPPORT_EMAIL, APP_SUPPORT_MAILTO, PRIVACY_POLICY_SECTIONS } from '../config/appReview';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../theme/theme';

export function LegalSupportScreen() {
  const handleEmailSupport = async () => {
    const supported = await Linking.canOpenURL(APP_SUPPORT_MAILTO);
    if (!supported) {
      Alert.alert('Support email', APP_SUPPORT_EMAIL);
      return;
    }

    await Linking.openURL(APP_SUPPORT_MAILTO);
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
        <Card variant="glass" title="Privacy policy" subtitle="In-app summary for review and user access.">
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
        </Card>

        <Card
          variant="glass"
          title="Support contact"
          subtitle="Use this for product questions, privacy requests, and App Review follow-up."
        >
          <Text style={styles.supportEmail}>{APP_SUPPORT_EMAIL}</Text>
          <AnimatedPressable style={styles.primaryButton} onPress={() => void handleEmailSupport()}>
            <Text style={styles.primaryButtonText}>Email support</Text>
          </AnimatedPressable>
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
});
