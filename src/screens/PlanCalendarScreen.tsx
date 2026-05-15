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
import { ANIMATION, COLORS, FONT_FAMILY, RADIUS, SPACING, TAP_TARGETS, TYPOGRAPHY_V2 } from '../theme/theme';

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

function formatWeekRange(weekStart: string): string {
  return `${formatShortMonthDay(weekStart)} - ${formatShortMonthDay(addDays(weekStart, 6))}`;
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return 'Time not set';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatRailDuration(minutes: number, itemCount: number): string {
  if (itemCount === 0) return 'Rest';
  if (minutes <= 0) return `${itemCount} item${itemCount === 1 ? '' : 's'}`;
  return formatDuration(minutes);
}

function iconForScheduleItem(item: PlanCalendarScheduleItem): keyof typeof MaterialCommunityIcons.glyphMap {
  const raw = `${item.activityType ?? ''} ${item.sessionType ?? ''} ${item.dotType}`.toLowerCase();
  if (item.protectedAnchor || raw.includes('boxing') || raw.includes('sparring')) return 'boxing-glove';
  if (raw.includes('running') || raw.includes('road')) return 'shoe-print';
  if (raw.includes('conditioning')) return 'timer-sand';
  if (raw.includes('recovery') || raw.includes('rest')) return 'spa-outline';
  if (item.generatedWorkout || raw.includes('strength') || raw.includes('sc')) return 'dumbbell';
  return 'calendar-clock';
}

function colorForScheduleItem(item: PlanCalendarScheduleItem): string {
  if (item.status === 'completed') return COLORS.success;
  if (item.status === 'skipped' || item.status === 'rescheduled' || item.status === 'modified') return COLORS.warning;
  if (item.protectedAnchor) return COLORS.accent;
  if ((item.intensity ?? 0) >= 8) return COLORS.error;
  if ((item.dotType ?? '').includes('recovery') || item.activityType === 'active_recovery' || item.activityType === 'rest') return COLORS.success;
  return COLORS.text.secondary;
}

function tintForScheduleItem(item: PlanCalendarScheduleItem): string {
  if (item.status === 'completed') return 'rgba(183, 217, 168, 0.16)';
  if (item.status === 'skipped' || item.status === 'rescheduled' || item.status === 'modified') return 'rgba(212, 175, 55, 0.16)';
  if (item.protectedAnchor) return COLORS.accentLight;
  if ((item.intensity ?? 0) >= 8) return 'rgba(217, 130, 126, 0.16)';
  if ((item.dotType ?? '').includes('recovery') || item.activityType === 'active_recovery' || item.activityType === 'rest') {
    return 'rgba(183, 217, 168, 0.12)';
  }
  return COLORS.surfaceSecondary;
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

function WeekRailDay({
  date,
  items,
  onPress,
}: {
  date: string;
  items: PlanCalendarScheduleItem[];
  onPress: () => void;
}) {
  const label = formatShortDay(date);
  const dayNumber = new Date(`${date}T12:00:00`).getDate();
  const isToday = date === todayLocalDate();
  const plannedMinutes = items.reduce((sum, item) => sum + item.durationMin, 0);
  const protectedCount = items.filter((item) => item.protectedAnchor).length;
  const itemCount = items.length;
  const dotItems = items.slice(0, 4);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${label.day} ${label.date}, ${itemCount} scheduled item${itemCount === 1 ? '' : 's'}`}
      accessibilityState={{ selected: isToday }}
      style={[
        styles.weekRailDay,
        itemCount > 0 && styles.weekRailDayLoaded,
        isToday && styles.weekRailDayToday,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.weekRailDayText, isToday && styles.weekRailDayTextToday]}>{label.day}</Text>
      <Text style={styles.weekRailDateText}>{dayNumber}</Text>
      <View style={styles.weekRailDots}>
        {dotItems.length > 0 ? dotItems.map((item) => (
          <View
            key={item.id}
            style={[styles.weekRailDot, { backgroundColor: colorForScheduleItem(item) }]}
          />
        )) : <View style={styles.weekRailRestDot} />}
      </View>
      <Text style={styles.weekRailMeta} numberOfLines={1}>{formatRailDuration(plannedMinutes, itemCount)}</Text>
      {protectedCount > 0 ? (
        <View style={styles.weekRailAnchor}>
          <MaterialCommunityIcons name="lock-outline" size={11} color={COLORS.accent} />
          <Text style={styles.weekRailAnchorText}>{protectedCount}</Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

function WeekAgendaItem({ item }: { item: PlanCalendarScheduleItem }) {
  const intensity = item.intensity ? `RPE ${item.intensity}` : null;
  const timing = [item.startTime, formatDuration(item.durationMin), intensity].filter(Boolean).join(' / ');

  return (
    <View style={[styles.weekAgendaItem, item.protectedAnchor && styles.weekAgendaItemAnchor]}>
      <View style={[styles.weekAgendaItemIcon, { backgroundColor: tintForScheduleItem(item) }]}>
        <MaterialCommunityIcons
          name={iconForScheduleItem(item)}
          size={17}
          color={colorForScheduleItem(item)}
        />
      </View>
      <View style={styles.weekAgendaItemCopy}>
        <Text style={styles.weekAgendaItemTitle} numberOfLines={2}>{item.label}</Text>
        <View style={styles.weekAgendaMetaRow}>
          <Text style={styles.weekAgendaItemMeta} numberOfLines={1}>{timing}</Text>
          {item.protectedAnchor ? (
            <View style={styles.weekAgendaAnchorLabel}>
              <MaterialCommunityIcons name="lock-outline" size={10} color={COLORS.accent} />
              <Text style={styles.weekAgendaAnchorText}>Anchor</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text
        style={[
          styles.weekAgendaStatus,
          item.status === 'completed' && styles.statusDone,
          (item.status === 'skipped' || item.status === 'rescheduled' || item.status === 'modified') && styles.statusCaution,
        ]}
        numberOfLines={1}
      >
        {item.statusLabel}
      </Text>
    </View>
  );
}

function WeekAgendaDay({
  date,
  items,
  isLast,
  onPress,
}: {
  date: string;
  items: PlanCalendarScheduleItem[];
  isLast: boolean;
  onPress: () => void;
}) {
  const label = formatShortDay(date);
  const isToday = date === todayLocalDate();
  const hasItems = items.length > 0;
  const plannedMinutes = items.reduce((sum, item) => sum + item.durationMin, 0);
  const protectedCount = items.filter((item) => item.protectedAnchor).length;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${label.day} ${label.date} schedule`}
      style={styles.weekAgendaDay}
      onPress={onPress}
    >
      <View style={styles.weekTimeline}>
        <View style={[
          styles.weekTimelineNode,
          hasItems && styles.weekTimelineNodeLoaded,
          isToday && styles.weekTimelineNodeToday,
        ]}>
          <Text style={[styles.weekTimelineNodeText, isToday && styles.weekTimelineNodeTextToday]}>
            {new Date(`${date}T12:00:00`).getDate()}
          </Text>
        </View>
        {!isLast ? <View style={styles.weekTimelineLine} /> : null}
      </View>

      <View style={[styles.weekAgendaBody, isToday && styles.weekAgendaBodyToday]}>
        <View style={styles.weekAgendaHeader}>
          <View style={styles.weekAgendaTitleGroup}>
            <Text style={[styles.weekAgendaDayTitle, isToday && styles.weekAgendaDayTitleToday]}>
              {isToday ? 'Today' : label.day}
            </Text>
            <Text style={styles.weekAgendaDayMeta}>
              {hasItems
                ? `${formatRailDuration(plannedMinutes, items.length)} / ${items.length} item${items.length === 1 ? '' : 's'}`
                : label.date}
            </Text>
          </View>
          {protectedCount > 0 ? (
            <View style={styles.weekAgendaProtectedChip}>
              <MaterialCommunityIcons name="lock-outline" size={12} color={COLORS.accent} />
              <Text style={styles.weekAgendaProtectedText}>{protectedCount} anchor{protectedCount === 1 ? '' : 's'}</Text>
            </View>
          ) : null}
        </View>

        {hasItems ? (
          <View style={styles.weekAgendaItems}>
            {items.map((item) => (
              <WeekAgendaItem key={item.id} item={item} />
            ))}
          </View>
        ) : (
          <View style={styles.weekAgendaRest}>
            <MaterialCommunityIcons name="spa-outline" size={17} color={COLORS.text.tertiary} />
            <View style={styles.weekAgendaRestCopy}>
              <Text style={styles.weekAgendaRestTitle}>Recovery margin</Text>
              <Text style={styles.weekAgendaRestMeta}>No scheduled load</Text>
            </View>
          </View>
        )}
      </View>
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
  const itemsByDate = new Map(dates.map((date) => [date, items.filter((item) => item.date === date)]));
  const totalMinutes = items.reduce((sum, item) => sum + item.durationMin, 0);
  const protectedCount = items.filter((item) => item.protectedAnchor).length;
  const scheduledDays = dates.filter((date) => (itemsByDate.get(date)?.length ?? 0) > 0).length;

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
        variant="glass"
        backgroundTone="planning"
        backgroundScrimColor="rgba(10, 10, 10, 0.76)"
      >
        <View style={styles.weekSummaryHeader}>
          <View style={styles.weekSummaryCopy}>
            <Text style={styles.weekSummaryKicker}>Weekly schedule</Text>
            <Text style={styles.weekSummaryTitle}>{formatWeekRange(weekStart)}</Text>
          </View>
          <View style={styles.weekSummaryStats}>
            <View style={styles.weekSummaryStat}>
              <Text style={styles.weekSummaryStatValue}>{scheduledDays}/7</Text>
              <Text style={styles.weekSummaryStatLabel}>Days</Text>
            </View>
            <View style={styles.weekSummaryStat}>
              <Text style={styles.weekSummaryStatValue}>{formatRailDuration(totalMinutes, items.length)}</Text>
              <Text style={styles.weekSummaryStatLabel}>Planned</Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekRail}
        >
          {dates.map((date) => (
            <WeekRailDay
              key={date}
              date={date}
              items={itemsByDate.get(date) ?? []}
              onPress={() => onOpenDate(date)}
            />
          ))}
        </ScrollView>

        <View style={styles.weekAgenda}>
          <View style={styles.weekAgendaHeaderRow}>
            <Text style={styles.weekAgendaSectionTitle}>Agenda</Text>
            <View style={styles.weekAgendaHeaderChip}>
              <MaterialCommunityIcons name="lock-outline" size={12} color={COLORS.accent} />
              <Text style={styles.weekAgendaHeaderChipText}>
                {protectedCount} anchor{protectedCount === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
          {dates.map((date, index) => (
            <WeekAgendaDay
              key={date}
              date={date}
              items={itemsByDate.get(date) ?? []}
              isLast={index === dates.length - 1}
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
  weekSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  weekSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  weekSummaryKicker: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
    textTransform: 'uppercase',
  },
  weekSummaryTitle: {
    marginTop: SPACING.xs,
    ...TYPOGRAPHY_V2.plan.headline,
    color: COLORS.text.primary,
  },
  weekSummaryStats: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  weekSummaryStat: {
    minWidth: 68,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(245, 245, 240, 0.06)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  weekSummaryStatValue: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  weekSummaryStatLabel: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  weekRail: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  weekRailDay: {
    width: 74,
    minHeight: 112,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(10, 10, 10, 0.50)',
    padding: SPACING.sm,
    justifyContent: 'space-between',
  },
  weekRailDayLoaded: {
    backgroundColor: 'rgba(245, 245, 240, 0.07)',
  },
  weekRailDayToday: {
    borderColor: 'rgba(212, 175, 55, 0.50)',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  weekRailDayText: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  weekRailDayTextToday: {
    color: COLORS.accent,
  },
  weekRailDateText: {
    fontSize: 21,
    lineHeight: 27,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  weekRailDots: {
    minHeight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  weekRailDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekRailRestDot: {
    width: 16,
    height: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
  },
  weekRailMeta: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
  weekRailAnchor: {
    alignSelf: 'flex-start',
    minHeight: 22,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 6,
  },
  weekRailAnchorText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.accent,
  },
  weekAgenda: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  weekAgendaHeaderRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  weekAgendaSectionTitle: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  weekAgendaHeaderChip: {
    minHeight: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  weekAgendaHeaderChipText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  weekAgendaDay: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  weekTimeline: {
    width: 34,
    alignItems: 'center',
  },
  weekTimelineNode: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(10, 10, 10, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekTimelineNodeLoaded: {
    borderColor: 'rgba(245, 245, 240, 0.28)',
    backgroundColor: 'rgba(245, 245, 240, 0.10)',
  },
  weekTimelineNodeToday: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  weekTimelineNodeText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.secondary,
  },
  weekTimelineNodeTextToday: {
    color: COLORS.text.inverse,
  },
  weekTimelineLine: {
    flex: 1,
    minHeight: SPACING.md,
    width: 1,
    backgroundColor: COLORS.borderLight,
  },
  weekAgendaBody: {
    flex: 1,
    minWidth: 0,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(10, 10, 10, 0.42)',
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  weekAgendaBodyToday: {
    borderColor: 'rgba(212, 175, 55, 0.38)',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  weekAgendaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  weekAgendaTitleGroup: {
    flex: 1,
    minWidth: 0,
  },
  weekAgendaDayTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  weekAgendaDayTitleToday: {
    color: COLORS.accent,
  },
  weekAgendaDayMeta: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  weekAgendaProtectedChip: {
    minHeight: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  weekAgendaProtectedText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  weekAgendaItems: {
    gap: SPACING.xs,
  },
  weekAgendaItem: {
    minHeight: 58,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(245, 245, 240, 0.055)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  weekAgendaItemAnchor: {
    borderColor: 'rgba(212, 175, 55, 0.30)',
  },
  weekAgendaItemIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekAgendaItemCopy: {
    flex: 1,
    minWidth: 0,
  },
  weekAgendaItemTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  weekAgendaMetaRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  weekAgendaItemMeta: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  weekAgendaAnchorLabel: {
    minHeight: 20,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  weekAgendaAnchorText: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  weekAgendaStatus: {
    maxWidth: 64,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  weekAgendaRest: {
    minHeight: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(245, 245, 240, 0.035)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  weekAgendaRestCopy: {
    flex: 1,
    minWidth: 0,
  },
  weekAgendaRestTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  weekAgendaRestMeta: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
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
