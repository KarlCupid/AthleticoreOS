import React, { useCallback, useState } from 'react';
import {
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { PlanCalendarScheduleItem } from '../../lib/engine/presentation';
import {
  addDays,
  formatLocalDate,
  formatShortMonthDay,
  todayLocalDate,
} from '../../lib/utils/date';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { MonthlyCalendar } from '../components/MonthlyCalendar';
import { OvertrainingAlert } from '../components/OvertrainingAlert';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { UnifiedJourneySummaryCard } from '../components/performance/UnifiedJourneySummaryCard';
import { usePlanCalendarData } from '../hooks/usePlanCalendarData';
import type { PlanStackParamList, RootTabParamList } from '../navigation/types';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { ANIMATION, COLORS, FONT_FAMILY, RADIUS, SPACING, TAP_TARGETS } from '../theme/theme';

type NavProp = NativeStackNavigationProp<PlanStackParamList>;
type RootNavProp = BottomTabNavigationProp<RootTabParamList>;
type PlanViewMode = 'day' | 'week' | 'month';

const PLAN_BACKGROUND = require('../../assets/images/cards/planning-card-bg.png');

const VIEW_MODES: PlanViewMode[] = ['day', 'week', 'month'];

function startOfWeek(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatLocalDate(date);
}

function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function formatDateLabel(dateStr: string): string {
  const today = todayLocalDate();
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  if (dateStr === yesterday) return 'Yesterday';

  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortDay(dateStr: string): { day: string; date: string } {
  const date = new Date(`${dateStr}T12:00:00`);
  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return 'Time not set';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function HeaderIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.headerIconButton}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={20} color={COLORS.accent} />
    </TouchableOpacity>
  );
}

function SegmentedViews({
  value,
  onChange,
}: {
  value: PlanViewMode;
  onChange: (value: PlanViewMode) => void;
}) {
  return (
    <View style={styles.segmentedControl}>
      {VIEW_MODES.map((mode) => {
        const active = value === mode;
        return (
          <AnimatedPressable
            key={mode}
            accessibilityRole="button"
            accessibilityLabel={`${mode} plan view`}
            accessibilityState={{ selected: active }}
            style={[styles.segmentButton, active && styles.segmentButtonActive]}
            onPress={() => onChange(mode)}
          >
            <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

function PlanActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.actionButton}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={18} color={COLORS.accent} />
      <Text style={styles.actionButtonText} numberOfLines={2}>{label}</Text>
    </AnimatedPressable>
  );
}

function MetricTile({
  label,
  value,
  icon,
  tone = COLORS.accent,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: string;
}) {
  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}18`, borderColor: `${tone}42` }]}>
        <MaterialCommunityIcons name={icon} size={16} color={tone} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function PlanSetupCard({
  hasDefaultGymProfile,
  onSetupPlan,
  onSetupGym,
}: {
  hasDefaultGymProfile: boolean;
  onSetupPlan: () => void;
  onSetupGym: () => void;
}) {
  return (
    <Card
      variant="glass"
      backgroundTone="planning"
      backgroundScrimColor="rgba(10, 10, 10, 0.76)"
      style={styles.setupCard}
    >
      <View style={styles.setupIcon}>
        <MaterialCommunityIcons name={hasDefaultGymProfile ? 'calendar-plus' : 'dumbbell'} size={22} color={COLORS.accent} />
      </View>
      <Text style={styles.setupTitle}>{hasDefaultGymProfile ? 'Build your plan' : 'Equipment needed'}</Text>
      <Text style={styles.setupBody}>
        {hasDefaultGymProfile
          ? 'Add goals, availability, and fixed commitments before Athleticore lays out your week.'
          : 'Set your default equipment first so planned sessions match what you can actually use.'}
      </Text>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={hasDefaultGymProfile ? 'Set up plan' : 'Set up equipment'}
        style={styles.primaryAction}
        onPress={hasDefaultGymProfile ? onSetupPlan : onSetupGym}
      >
        <Text style={styles.primaryActionText}>{hasDefaultGymProfile ? 'Set Up Plan' : 'Set Up Equipment'}</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.text.inverse} />
      </AnimatedPressable>
    </Card>
  );
}

function ScheduleItemRow({ item }: { item: PlanCalendarScheduleItem }) {
  const intensity = item.intensity ? ` / RPE ${item.intensity}` : '';
  const time = item.startTime ? `${item.startTime} / ` : '';
  return (
    <View style={styles.planEntryRow}>
      <View style={[styles.planEntryIcon, item.protectedAnchor && styles.planEntryIconLocked]}>
        <MaterialCommunityIcons
          name={item.protectedAnchor ? 'lock-outline' : item.generatedWorkout ? 'dumbbell' : 'calendar-clock'}
          size={16}
          color={item.protectedAnchor ? COLORS.accent : COLORS.text.secondary}
        />
      </View>
      <View style={styles.planEntryCopy}>
        <Text style={styles.planEntryTitle} numberOfLines={1}>{item.label}</Text>
        <Text style={styles.planEntryMeta} numberOfLines={1}>
          {time}{formatDuration(item.durationMin)}{intensity}
        </Text>
      </View>
      <Text style={[
        styles.planEntryStatus,
        item.status === 'completed' && styles.statusDone,
        (item.status === 'skipped' || item.status === 'rescheduled' || item.status === 'modified') && styles.statusCaution,
      ]}>
        {item.statusLabel}
      </Text>
    </View>
  );
}

function DayAgenda({
  selectedDate,
  items,
  onOpenDay,
}: {
  selectedDate: string;
  items: PlanCalendarScheduleItem[];
  onOpenDay: () => void;
}) {
  const hasItems = items.length > 0;

  return (
    <Card
      title={formatDateLabel(selectedDate)}
      subtitle={`${items.length} item${items.length === 1 ? '' : 's'} on schedule`}
      backgroundTone="schedule"
      backgroundScrimColor="rgba(10, 10, 10, 0.72)"
      subtitleLines={1}
    >
      {!hasItems ? (
        <View style={styles.emptyDay}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={24} color={COLORS.text.tertiary} />
          <Text style={styles.emptyTitle}>No activities scheduled</Text>
          <Text style={styles.emptySubtitle}>Use the day editor to add commitments or adjust this date.</Text>
        </View>
      ) : null}

      {items.map((item) => (
        <ScheduleItemRow key={item.id} item={item} />
      ))}

      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Open day schedule"
        style={styles.openDayButton}
        onPress={onOpenDay}
      >
        <MaterialCommunityIcons name="calendar-edit" size={17} color={COLORS.accent} />
        <Text style={styles.openDayButtonText}>Open Day</Text>
      </AnimatedPressable>
    </Card>
  );
}

function WeekDayCard({
  date,
  items,
  onPress,
}: {
  date: string;
  items: PlanCalendarScheduleItem[];
  onPress: () => void;
}) {
  const label = formatShortDay(date);
  const isToday = date === todayLocalDate();
  const plannedMinutes = items.reduce((sum, item) => sum + item.durationMin, 0);
  const protectedCount = items.filter((item) => item.protectedAnchor).length;
  const itemCount = items.length;
  const mainLabels = items.map((item) => item.label).slice(0, 3);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${label.day} ${label.date} schedule`}
      style={[styles.weekDayCard, isToday && styles.weekDayCardToday]}
      onPress={onPress}
    >
      <View style={styles.weekDateColumn}>
        <Text style={[styles.weekDayText, isToday && styles.weekDayTextToday]}>{label.day}</Text>
        <Text style={styles.weekDateText}>{label.date}</Text>
        {isToday ? <Text style={styles.todayPill}>Today</Text> : null}
      </View>
      <View style={styles.weekDayCopy}>
        {itemCount === 0 ? (
          <>
            <Text style={styles.weekDayTitle}>Open day</Text>
            <Text style={styles.weekDayMeta}>No scheduled load</Text>
          </>
        ) : (
          <>
            <Text style={styles.weekDayTitle} numberOfLines={1}>{mainLabels[0] ?? 'Scheduled work'}</Text>
            <Text style={styles.weekDayMeta} numberOfLines={1}>
              {formatDuration(plannedMinutes)} / {itemCount} item{itemCount === 1 ? '' : 's'}
            </Text>
            {mainLabels.length > 1 ? (
              <Text style={styles.weekDayNote} numberOfLines={1}>{mainLabels.slice(1).join(', ')}</Text>
            ) : null}
          </>
        )}
      </View>
      {protectedCount > 0 ? (
        <View style={styles.anchorPill}>
          <MaterialCommunityIcons name="lock-outline" size={12} color={COLORS.accent} />
          <Text style={styles.anchorPillText}>{protectedCount}</Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

function WeekView({
  weekStart,
  items,
  onPrev,
  onToday,
  onNext,
  onOpenDate,
}: {
  weekStart: string;
  items: PlanCalendarScheduleItem[];
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onOpenDate: (date: string) => void;
}) {
  const dates = weekDates(weekStart);
  const totalMinutes = items.reduce((sum, item) => sum + item.durationMin, 0);
  const protectedCount = items.filter((item) => item.protectedAnchor).length;

  return (
    <View style={styles.viewStack}>
      <View style={styles.weekNavRow}>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Previous week" style={styles.weekNavButton} onPress={onPrev}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={COLORS.text.secondary} />
          <Text style={styles.weekNavText}>Prev</Text>
        </AnimatedPressable>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Current week" style={styles.weekNavButtonAccent} onPress={onToday}>
          <MaterialCommunityIcons name="calendar-today" size={16} color={COLORS.text.inverse} />
          <Text style={styles.weekNavTextAccent}>Today</Text>
        </AnimatedPressable>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Next week" style={styles.weekNavButton} onPress={onNext}>
          <Text style={styles.weekNavText}>Next</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.text.secondary} />
        </AnimatedPressable>
      </View>

      <Card
        title={`Week of ${formatShortMonthDay(weekStart)}`}
        subtitle={`${formatDuration(totalMinutes)} planned / ${protectedCount} protected anchor${protectedCount === 1 ? '' : 's'}`}
        backgroundTone="planning"
        backgroundScrimColor="rgba(10, 10, 10, 0.76)"
        subtitleLines={1}
      >
        <View style={styles.weekStack}>
          {dates.map((date) => (
            <WeekDayCard
              key={date}
              date={date}
              items={items.filter((item) => item.date === date)}
              onPress={() => onOpenDate(date)}
            />
          ))}
        </View>
      </Card>
    </View>
  );
}

function MonthView({
  currentMonth,
  selectedDate,
  activityDots,
  items,
  onSelectDate,
  onChangeMonth,
  onOpenDay,
}: {
  currentMonth: Date;
  selectedDate: string;
  activityDots: Map<string, Set<string>>;
  items: PlanCalendarScheduleItem[];
  onSelectDate: (date: string) => void;
  onChangeMonth: (date: Date) => void;
  onOpenDay: () => void;
}) {
  return (
    <View style={styles.viewStack}>
      <MonthlyCalendar
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        activityDots={activityDots}
        onSelectDate={onSelectDate}
        onChangeMonth={onChangeMonth}
      />
      <DayAgenda
        selectedDate={selectedDate}
        items={items}
        onOpenDay={onOpenDay}
      />
    </View>
  );
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
              <Text style={styles.errorTitle}>Planning calendar unavailable</Text>
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
    backgroundColor: COLORS.background,
  },
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  headerIconButton: {
    minWidth: TAP_TARGETS.plan.min,
    minHeight: TAP_TARGETS.plan.min,
    alignItems: 'center',
    justifyContent: 'center',
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
  segmentedControl: {
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: 4,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(10, 10, 10, 0.52)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  segmentButton: {
    flex: 1,
    minHeight: TAP_TARGETS.plan.min,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.accent,
  },
  segmentButtonText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  segmentButtonTextActive: {
    color: COLORS.text.inverse,
  },
  setupCard: {
    gap: SPACING.sm,
  },
  setupIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.34)',
  },
  setupTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  setupBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  primaryAction: {
    minHeight: TAP_TARGETS.plan.recommended,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  primaryActionText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  metricTile: {
    flex: 1,
    minHeight: 90,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(245, 245, 240, 0.06)',
    padding: SPACING.sm,
    justifyContent: 'space-between',
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionButton: {
    width: '48%',
    minHeight: TAP_TARGETS.plan.recommended,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.26)',
    backgroundColor: 'rgba(10, 10, 10, 0.44)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  actionButtonText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textAlign: 'center',
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
  viewStack: {
    gap: SPACING.sm,
  },
  weekNavRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  weekNavButton: {
    flex: 1,
    minHeight: TAP_TARGETS.plan.min,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(10, 10, 10, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  weekNavButtonAccent: {
    flex: 1,
    minHeight: TAP_TARGETS.plan.min,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  weekNavText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  weekNavTextAccent: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  weekStack: {
    gap: SPACING.sm,
  },
  weekDayCard: {
    minHeight: 86,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(10, 10, 10, 0.48)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  weekDayCardToday: {
    borderColor: 'rgba(212, 175, 55, 0.46)',
    backgroundColor: 'rgba(212, 175, 55, 0.10)',
  },
  weekDateColumn: {
    width: 58,
  },
  weekDayText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  weekDayTextToday: {
    color: COLORS.accent,
  },
  weekDateText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  todayPill: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    color: COLORS.text.inverse,
    fontSize: 10,
    fontFamily: FONT_FAMILY.extraBold,
    overflow: 'hidden',
  },
  weekDayCopy: {
    flex: 1,
    minWidth: 0,
  },
  weekDayTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  weekDayMeta: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  weekDayNote: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  anchorPill: {
    minWidth: 34,
    minHeight: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: SPACING.xs,
  },
  anchorPillText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.accent,
  },
  emptyDay: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
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
  planEntryRow: {
    minHeight: 64,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(245, 245, 240, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  planEntryIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSecondary,
  },
  planEntryIconLocked: {
    backgroundColor: COLORS.accentLight,
  },
  planEntryCopy: {
    flex: 1,
    minWidth: 0,
  },
  planEntryTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  planEntryMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  planEntryStatus: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  statusDone: {
    color: COLORS.success,
  },
  statusCaution: {
    color: COLORS.warning,
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
