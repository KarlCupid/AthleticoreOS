import React from 'react';
import { Text, View } from 'react-native';

import type { WeeklyPlanEntryRow } from '../../lib/engine/types';
import { todayLocalDate } from '../../lib/utils/date';
import { COLORS, FONT_FAMILY } from '../theme/theme';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface WeeklyPlanGroup {
  date: string;
  dayName: string;
  sessions: WeeklyPlanEntryRow[];
}

export interface WeeklyPlanChartDatum {
  x: string;
  y: number;
  actualDuration: number;
  isRest: boolean;
  isToday: boolean;
}

function dayNameFromDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return DAY_NAMES[date.getDay()];
}

function getSundayOfDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  return sunday.toISOString().split('T')[0];
}

function getWeekDates(startDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00`);
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayLocalDate();
}

export function buildWeeklyPlanGroups(
  entries: WeeklyPlanEntryRow[],
  activeWeekStart: string | null,
): WeeklyPlanGroup[] {
  if (!activeWeekStart) return [];

  const weekDates = getWeekDates(getSundayOfDate(activeWeekStart));
  const entryMap = new Map<string, WeeklyPlanEntryRow[]>();

  for (const entry of entries) {
    entryMap.set(entry.date, [...(entryMap.get(entry.date) ?? []), entry]);
  }

  return weekDates.map((date) => ({
    date,
    dayName: dayNameFromDate(date),
    sessions: entryMap.get(date) ?? [],
  }));
}

export function buildWeeklyChartData(grouped: WeeklyPlanGroup[]): WeeklyPlanChartDatum[] {
  return grouped.map((group) => {
    const duration = group.sessions.reduce((sum, session) => sum + (session.estimated_duration_min || 0), 0);
    return {
      x: group.dayName.slice(0, 3),
      y: duration > 0 ? duration : 2,
      actualDuration: duration,
      isRest: duration === 0,
      isToday: isToday(group.date),
    };
  });
}

export function buildWeeklyLineData(chartData: WeeklyPlanChartDatum[]) {
  return chartData.map((datum) => {
    const pointColor = datum.isRest
      ? 'rgba(255,255,255,0.2)'
      : datum.isToday
        ? COLORS.accent
        : COLORS.surfaceSecondary;

    return {
      value: datum.isRest ? 5 : datum.y,
      dataPointText: datum.isRest ? 'REST' : `${datum.actualDuration}m`,
      label: datum.x.slice(0, 1),
      labelTextStyle: {
        color: datum.isToday ? COLORS.text.primary : COLORS.text.tertiary,
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 11,
      },
      dataPointLabelComponent: () => (
        <View
          style={{
            backgroundColor: datum.isRest ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.4)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            marginBottom: 8,
            alignSelf: 'center',
            borderWidth: datum.isRest ? 1 : 0,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <Text
            style={{
              color: datum.isRest ? COLORS.text.tertiary : (datum.isToday ? COLORS.accent : COLORS.text.secondary),
              fontSize: 10,
              fontFamily: datum.isRest ? FONT_FAMILY.semiBold : FONT_FAMILY.extraBold,
            }}
          >
            {datum.isRest ? 'REST' : `${datum.actualDuration}m`}
          </Text>
        </View>
      ),
      dataPointLabelShiftY: datum.isRest ? -20 : -35,
      showDataPointLabel: true,
      customDataPoint: () => (
        <View
          style={{
            width: datum.isRest ? 6 : 8,
            height: datum.isRest ? 6 : 8,
            backgroundColor: pointColor,
            borderRadius: 4,
            borderWidth: datum.isRest ? 1 : 1.5,
            borderColor: datum.isToday ? COLORS.text.inverse : (datum.isRest ? 'rgba(255,255,255,0.1)' : COLORS.accent),
          }}
        />
      ),
    };
  });
}

export function getWeeklyChartLayout(screenWidth: number) {
  const chartWidth = screenWidth - 32;
  return {
    chartWidth,
    pointSpacing: (chartWidth - 30) / 6,
  };
}
