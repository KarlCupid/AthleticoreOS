import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { FONT_FAMILY, SPACING, RADIUS, SHADOWS, GRADIENTS } from '../theme/theme';
import { AnimatedPressable } from './AnimatedPressable';
import { IconChevronRight, IconTarget } from './icons';

interface ActiveCampBannerProps {
  goalMode: string | null;
}

export function ActiveCampBanner({ goalMode }: ActiveCampBannerProps) {
  const navigation = useNavigation<any>();
  const weeksOut = 4;
  const progressPct = 0.35;

  return (
    <AnimatedPressable onPress={() => navigation.navigate('PlanningHome')}>
      <View style={styles.container}>
        <LinearGradient
          colors={[...GRADIENTS.caution]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.headerRow}>
            <View style={styles.campBadge}>
              <IconTarget size={14} color="#FFF" />
              <Text style={styles.campBadgeText}>Active Camp</Text>
            </View>
            <IconChevronRight size={20} color="rgba(255,255,255,0.7)" />
          </View>

          <Text style={styles.countdownTitle}>{weeksOut} WEEKS OUT</Text>
          <Text style={styles.subtitle}>
            {goalMode === 'cut' ? 'Weight Cut Phase' : 'Fight Camp'} • Stay disciplined today.
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
            </View>
          </View>
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  gradient: {
    padding: SPACING.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  campBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  campBadgeText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.black,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdownTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.black,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: SPACING.lg,
  },
  progressContainer: {
    marginTop: SPACING.xs,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
});
