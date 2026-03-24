import React from 'react';
import { View } from 'react-native';
import { Card } from '../../Card';
import { MetricTile } from '../primitives/MetricTile';
import { shared } from '../styles';
import { formatPhase } from '../helpers';
import type { EngineReplayDay } from '../../../../lib/engine/simulation/lab';
import type { MetricTone } from '../styles';

interface FuelTabProps {
  day: EngineReplayDay;
}

function calorieTone(actual: number, prescribed: number): MetricTone {
  const gap = actual - prescribed;
  if (Math.abs(gap) <= 50) return 'good';
  if (gap > 200 || gap < -200) return 'warning';
  return 'default';
}

function macroTone(actual: number, prescribed: number): MetricTone {
  if (prescribed === 0) return 'default';
  const ratio = actual / prescribed;
  if (ratio >= 0.9 && ratio <= 1.1) return 'good';
  if (ratio < 0.7 || ratio > 1.3) return 'warning';
  return 'default';
}

export function FuelTab({ day }: FuelTabProps) {
  return (
    <Card title="Nutrition & Hydration" subtitle="Prescribed targets vs simulated actual intake.">
      <View style={shared.metricGrid}>
        <MetricTile label="Prescribed" value={`${day.prescribedCalories} kcal`} />
        <MetricTile label="Actual" value={`${day.actualCalories} kcal`} tone={calorieTone(day.actualCalories, day.prescribedCalories)} />
        <MetricTile label="Water" value={`${day.waterTargetOz} oz`} />
        <MetricTile label="Sodium" value={day.sodiumTargetMg != null ? `${day.sodiumTargetMg} mg` : '--'} />
      </View>
      <View style={shared.metricGrid}>
        <MetricTile label="Protein" value={`${day.actualProtein} / ${day.prescribedProtein}g`} tone={macroTone(day.actualProtein, day.prescribedProtein)} />
        <MetricTile label="Carbs" value={`${day.actualCarbs} / ${day.prescribedCarbs}g`} tone={macroTone(day.actualCarbs, day.prescribedCarbs)} />
        <MetricTile label="Fat" value={`${day.actualFat} / ${day.prescribedFat}g`} tone={macroTone(day.actualFat, day.prescribedFat)} />
        <MetricTile label="Cut Phase" value={formatPhase(day.cutPhase)} />
      </View>
    </Card>
  );
}
