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
      <Card title="Risk Drivers" subtitle="Primary cause first, then the contributing factors that shaped the day.">
        <Text style={shared.bodyText}>{day.primaryCause ?? 'No primary cause was identified for this day.'}</Text>
        {day.contributingFactors.length > 0 ? (
          <View style={styles.driverList}>
            {day.contributingFactors.map((factor, index) => (
              <Text key={`${factor}-${index}`} style={shared.detailText}>{`\u2022 ${factor}`}</Text>
            ))}
          </View>
        ) : null}
      </Card>

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

const styles = StyleSheet.create({
  driverList: {
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
});
