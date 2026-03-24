import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SPACING } from '../../../theme/theme';
import { Card } from '../../Card';
import { MetricTile } from '../primitives/MetricTile';
import { FindingBadge } from '../primitives/FindingBadge';
import { shared } from '../styles';
import type { EngineReplayDay } from '../../../../lib/engine/simulation/lab';

interface OverviewTabProps {
  day: EngineReplayDay;
}

export function OverviewTab({ day }: OverviewTabProps) {
  return (
    <>
      <Card title="Findings" subtitle="Invariant checks and notable engine conditions for this day.">
        {day.findings.length > 0 ? (
          <View style={shared.listGap}>
            {day.findings.map((finding, index) => (
              <FindingBadge key={`${finding.severity}-${finding.title}-${index}`} finding={finding} />
            ))}
          </View>
        ) : (
          <Text style={shared.bodyText}>No findings on this day.</Text>
        )}
      </Card>

      <Card title="Session Summary" subtitle={day.workoutTitle}>
        <View style={shared.metricGrid}>
          <MetricTile label="Prescribed Load" value={day.prescribedLoad.toFixed(0)} />
          <MetricTile label="Actual Load" value={day.actualLoad.toFixed(0)} />
          <MetricTile label="Start Weight" value={`${day.bodyWeightStart.toFixed(1)} lbs`} />
          <MetricTile label="End Weight" value={`${day.bodyWeightEnd.toFixed(1)} lbs`} />
        </View>
        <Text style={shared.bodyText}>{day.workoutBlueprint}</Text>
      </Card>
    </>
  );
}
