import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import type { FeedbackSeverity } from '../../lib/engine/types';

interface AdaptationBannerProps {
  message: string;
  severity: FeedbackSeverity;
  onDismiss?: () => void;
}

const SEVERITY_CONFIG: Record<
  FeedbackSeverity,
  { bg: string; text: string; icon: string }
> = {
  positive: { bg: COLORS.readiness.primeLight, text: COLORS.readiness.prime, icon: '\u2B06' },
  neutral: { bg: COLORS.surfaceSecondary, text: COLORS.text.secondary, icon: '\u2714' },
  caution: { bg: COLORS.readiness.cautionLight, text: COLORS.readiness.caution, icon: '\u26A0' },
  warning: { bg: COLORS.readiness.depletedLight, text: COLORS.readiness.depleted, icon: '\u26A0' },
};

const AdaptationBanner: React.FC<AdaptationBannerProps> = ({
  message,
  severity,
  onDismiss,
}) => {
  const config = SEVERITY_CONFIG[severity];

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      style={[styles.container, { backgroundColor: config.bg }]}
    >
      <Text style={[styles.icon, { color: config.text }]}>{config.icon}</Text>

      <Text style={[styles.message, { color: config.text }]}>{message}</Text>

      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          activeOpacity={0.6}
          style={styles.dismissButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.dismissText, { color: config.text }]}>
            {'\u2715'}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
  },
  icon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  message: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: SPACING.sm,
    padding: SPACING.xs,
  },
  dismissText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
});

export default AdaptationBanner;
