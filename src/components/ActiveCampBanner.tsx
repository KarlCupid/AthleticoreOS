import React from 'react';
import { ImageBackground, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { AnimatedPressable } from './AnimatedPressable';
import { IconChevronRight, IconTarget } from './icons';

const CAMP_BACKGROUND = require('../../assets/images/dashboard/camp-card-bg.png');

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
        <ImageBackground
          source={CAMP_BACKGROUND}
          style={styles.gradient}
          imageStyle={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.scrim} />
          <View style={styles.headerRow}>
            <View style={styles.campBadge}>
              <IconTarget size={14} color="#F5F5F0" />
              <Text style={styles.campBadgeText}>Active Camp</Text>
            </View>
            <IconChevronRight size={20} color="rgba(255,255,255,0.7)" />
          </View>

          <Text style={styles.countdownTitle}>{weeksOut} WEEKS OUT</Text>
          <Text style={styles.subtitle}>
            {goalMode === 'cut' ? 'Weight Cut Phase' : 'Fight Camp'} - Stay disciplined today.
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
            </View>
          </View>
        </ImageBackground>
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
  backgroundImage: {
    borderRadius: RADIUS.xxl,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.28)',
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
    color: '#F5F5F0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdownTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.black,
    color: '#F5F5F0',
    letterSpacing: 0,
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
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
});
