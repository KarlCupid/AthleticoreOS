import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { PlanCalendarScheduleItem } from '../../../lib/engine/presentation';
import {
  addDays,
  formatShortMonthDay,
  todayLocalDate,
} from '../../../lib/utils/date';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { MonthlyCalendar } from '../../components/MonthlyCalendar';
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TAP_TARGETS, TYPOGRAPHY_V2 } from '../../theme/theme';

function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatDateLabel(dateStr: string): string {
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

export function DayAgenda({
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

export function WeekView({
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

export function MonthView({
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

const styles = StyleSheet.create({
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
});
