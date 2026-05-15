import React, { useCallback, useState } from 'react';
import {
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  addDays,
  formatLocalDate,
  formatShortMonthDay,
  todayLocalDate,
} from '../../lib/utils/date';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { OvertrainingAlert } from '../components/OvertrainingAlert';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { UnifiedJourneySummaryCard } from '../components/performance/UnifiedJourneySummaryCard';
import { usePlanCalendarData } from '../hooks/usePlanCalendarData';
import type { PlanStackParamList, RootTabParamList } from '../navigation/types';
import {
  HeaderIconButton,
  MetricTile,
  PlanActionButton,
  PlanSetupCard,
  SegmentedViews,
  type PlanViewMode,
} from './plan-calendar/PlanCalendarControls';
import {
  DayAgenda,
  MonthView,
  WeekView,
  formatDateLabel,
} from './plan-calendar/PlanCalendarViews';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { ANIMATION, COLORS, FONT_FAMILY, RADIUS, SPACING, TAP_TARGETS } from '../theme/theme';

type NavProp = NativeStackNavigationProp<PlanStackParamList>;
type RootNavProp = BottomTabNavigationProp<RootTabParamList>;

const PLAN_BACKGROUND = require('../../assets/images/universal-screen-background.png');

function startOfWeek(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatLocalDate(date);
}

export function PlanCalendarScreen() {
  const navigation = useNavigation<NavProp>();
  const parentNavigation = navigation.getParent<RootNavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useReadinessTheme();
  const [activeView, setActiveView] = useState<PlanViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(todayLocalDate());
  const [currentMonth, setCurrentMonth] = useState(() => new Date(`${todayLocalDate()}T12:00:00`));
  const [visibleWeekStart, setVisibleWeekStart] = useState(() => startOfWeek(todayLocalDate()));

  const {
    items: scheduleItems,
    selectedDayItems,
    visibleWeekItems,
    activityDots,
    metrics,
    loading: calendarLoading,
    refreshing,
    error: calendarError,
    config,
    hasDefaultGymProfile,
    missedEntries,
    performanceContext,
    warnings,
    streak,
    loadData,
    refresh,
    dismissWarning,
    rescheduleFirstMissedEntry,
  } = usePlanCalendarData({ currentMonth, visibleWeekStart, selectedDate });

  useFocusEffect(
    useCallback(() => {
      void loadData({ forceRefresh: true });
    }, [loadData]),
  );

  const handleSelectDate = useCallback((date: string) => {
    const nextWeekStart = startOfWeek(date);
    setSelectedDate(date);
    setVisibleWeekStart(nextWeekStart);
    setCurrentMonth(new Date(`${date}T12:00:00`));
  }, []);

  const handleChangeMonth = useCallback((date: Date) => {
    setCurrentMonth(date);
    const selectedInMonth = formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDate(selectedInMonth);
    setVisibleWeekStart(startOfWeek(selectedInMonth));
  }, []);

  const navigateWeek = useCallback((deltaDays: number) => {
    const nextStart = addDays(visibleWeekStart, deltaDays);
    setVisibleWeekStart(nextStart);
    setSelectedDate(nextStart);
    setCurrentMonth(new Date(`${nextStart}T12:00:00`));
  }, [visibleWeekStart]);

  const handleToday = useCallback(() => {
    const today = todayLocalDate();
    const weekStart = startOfWeek(today);
    setSelectedDate(today);
    setVisibleWeekStart(weekStart);
    setCurrentMonth(new Date(`${today}T12:00:00`));
  }, []);

  const handleOpenDay = useCallback((date: string = selectedDate) => {
    navigation.navigate('DayDetail', { date });
  }, [navigation, selectedDate]);

  const handleSetupPress = useCallback((initialPhaseKey?: 'objective' | 'availability' | 'commitments') => {
    navigation.navigate('WeeklyPlanSetup', initialPhaseKey ? {
      initialPhaseKey,
      source: 'plan',
    } : { source: 'plan' });
  }, [navigation]);

  const handleSetupGym = useCallback(() => {
    parentNavigation?.navigate('Train', { screen: 'GymProfiles' });
  }, [parentNavigation]);

  const handleMissedPress = useCallback(() => {
    void rescheduleFirstMissedEntry();
  }, [rescheduleFirstMissedEntry]);

  const isInitialLoading = calendarLoading && scheduleItems.length === 0;

  const renderShell = (children: React.ReactNode) => (
    <ScreenWrapper style={styles.screenShell} useSafeArea={true}>
      <ImageBackground
        source={PLAN_BACKGROUND}
        resizeMode="cover"
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        <View style={styles.backgroundOverlay} />
        {children}
      </ImageBackground>
    </ScreenWrapper>
  );

  if (isInitialLoading) {
    return renderShell(
      <>
        <View style={styles.header}>
          <SkeletonLoader width={80} height={18} shape="rect" style={{ borderRadius: RADIUS.sm, marginBottom: SPACING.md }} />
          <SkeletonLoader width="68%" height={34} shape="rect" style={{ borderRadius: RADIUS.lg }} />
        </View>
        <View style={styles.loadingContent}>
          <SkeletonLoader width="100%" height={108} shape="rect" style={{ borderRadius: RADIUS.xl, marginBottom: SPACING.sm }} />
          <SkeletonLoader width="100%" height={320} shape="rect" style={{ borderRadius: RADIUS.xl, marginBottom: SPACING.sm }} />
          <SkeletonLoader width="100%" height={144} shape="rect" style={{ borderRadius: RADIUS.xl }} />
        </View>
      </>,
    );
  }

  return renderShell(
    <>
      <View style={styles.header}>
        <ScreenHeader
          kicker="Plan"
          title={activeView === 'day' ? formatDateLabel(selectedDate) : activeView === 'week' ? `Week of ${formatShortMonthDay(visibleWeekStart)}` : 'Calendar'}
          subtitle={activeView === 'month' ? 'Month view, anchors, and day edits' : 'Schedule control and plan adjustments'}
          subtitleLines={2}
          rightAction={(
            <HeaderIconButton
              icon="tune-variant"
              label="Adjust plan"
              onPress={() => handleSetupPress('objective')}
            />
          )}
        >
          <SegmentedViews value={activeView} onChange={setActiveView} />
        </ScreenHeader>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 176 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={themeColor} colors={[themeColor]} />}
      >
        {calendarError ? (
          <Animated.View entering={FadeInDown.duration(ANIMATION.normal).springify()}>
            <Card variant="glass" backgroundTone="planning" backgroundScrimColor="rgba(10, 10, 10, 0.78)">
              <Text style={styles.errorTitle}>Planning calendar needs a refresh</Text>
              <Text style={styles.errorText}>{calendarError}</Text>
              <AnimatedPressable style={styles.openDayButton} onPress={() => { void loadData({ forceRefresh: true, refresh: true }); }}>
                <MaterialCommunityIcons name="refresh" size={17} color={COLORS.accent} />
                <Text style={styles.openDayButtonText}>Try Again</Text>
              </AnimatedPressable>
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(20).duration(ANIMATION.slow).springify()}>
          <UnifiedJourneySummaryCard
            summary={performanceContext}
            compact
            showBodyMass={Boolean(performanceContext.bodyMass)}
            variant="todayCommand"
          />
        </Animated.View>

        {!config || !hasDefaultGymProfile ? (
          <Animated.View entering={FadeInDown.delay(35).duration(ANIMATION.slow).springify()}>
            <PlanSetupCard
              hasDefaultGymProfile={hasDefaultGymProfile}
              onSetupPlan={() => handleSetupPress('objective')}
              onSetupGym={handleSetupGym}
            />
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(45).duration(ANIMATION.slow).springify()}>
          <Card
            variant="glass"
            backgroundTone="planning"
            backgroundScrimColor="rgba(10, 10, 10, 0.74)"
          >
            <View style={styles.metricsRow}>
              <MetricTile icon="calendar-check-outline" label="Days" value={String(metrics.scheduledDays)} tone={COLORS.success} />
              <MetricTile icon="lock-outline" label="Anchors" value={String(metrics.protectedAnchors)} />
              <MetricTile icon="fire" label="Streak" value={streak > 0 ? String(streak) : '--'} tone={COLORS.warning} />
            </View>
            <View style={styles.actionsGrid}>
              <PlanActionButton icon="calendar-edit" label="Open Day" onPress={() => handleOpenDay()} />
              <PlanActionButton icon="tune-variant" label="Adjust Plan" onPress={() => handleSetupPress('objective')} />
              <PlanActionButton icon="clock-outline" label="Availability" onPress={() => handleSetupPress('availability')} />
              <PlanActionButton icon="lock-outline" label="Commitments" onPress={() => handleSetupPress('commitments')} />
            </View>
          </Card>
        </Animated.View>

        {missedEntries.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(60).duration(ANIMATION.slow).springify()}>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={`${missedEntries.length} missed session${missedEntries.length === 1 ? '' : 's'} need a new day`}
              style={styles.missedBanner}
              onPress={handleMissedPress}
            >
              <MaterialCommunityIcons name="alert" size={16} color={COLORS.text.inverse} />
              <Text style={styles.missedBannerText}>
                {missedEntries.length} session{missedEntries.length === 1 ? '' : 's'} need a new day
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.warning} />
            </AnimatedPressable>
          </Animated.View>
        ) : null}

        {warnings.map((warning, index) => (
          <Animated.View key={`${warning.title}-${index}`} entering={FadeInDown.delay(70 + index * 35).duration(ANIMATION.slow).springify()}>
            <OvertrainingAlert
              warning={warning}
              onDismiss={() => dismissWarning(index)}
            />
          </Animated.View>
        ))}

        {activeView === 'day' ? (
          <Animated.View entering={FadeInDown.delay(90).duration(ANIMATION.slow).springify()}>
            <DayAgenda
              selectedDate={selectedDate}
              items={selectedDayItems}
              onOpenDay={() => handleOpenDay()}
            />
          </Animated.View>
        ) : null}

        {activeView === 'week' ? (
          <Animated.View entering={FadeInDown.delay(90).duration(ANIMATION.slow).springify()}>
            <WeekView
              weekStart={visibleWeekStart}
              items={visibleWeekItems}
              onPrev={() => navigateWeek(-7)}
              onToday={handleToday}
              onNext={() => navigateWeek(7)}
              onOpenDate={(date) => {
                handleSelectDate(date);
                handleOpenDay(date);
              }}
            />
          </Animated.View>
        ) : null}

        {activeView === 'month' ? (
          <Animated.View entering={FadeInDown.delay(90).duration(ANIMATION.slow).springify()}>
            <MonthView
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              activityDots={activityDots}
              items={selectedDayItems}
              onSelectDate={handleSelectDate}
              onChangeMonth={handleChangeMonth}
              onOpenDay={() => handleOpenDay()}
            />
          </Animated.View>
        ) : null}
      </ScrollView>
    </>,
  );
}

const styles = StyleSheet.create({
  screenShell: {
    backgroundColor: 'transparent',
  },
  background: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    opacity: 0.72,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 8, 10, 0.76)',
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    gap: SPACING.sm + 2,
  },
  loadingContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  missedBanner: {
    minHeight: TAP_TARGETS.plan.recommended,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.34)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  missedBannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  openDayButton: {
    minHeight: TAP_TARGETS.plan.recommended,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.30)',
    backgroundColor: 'rgba(10, 10, 10, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  openDayButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  errorText: {
    marginTop: SPACING.xs,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
});
