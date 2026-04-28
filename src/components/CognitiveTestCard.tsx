import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { Card } from './Card';

interface Props {
  baselineMs?: number | null;
  baseline?: number | null;  // alias used by FightWeekProtocolScreen
  onResult: (reactionTimeMs: number) => void;
}

type TestState = 'idle' | 'waiting' | 'ready' | 'done';

const MIN_WAIT_MS = 1000;
const MAX_WAIT_MS = 4000;
const DECLINE_DANGER_PCT = 0.20;
const DECLINE_WARN_PCT = 0.10;

export function CognitiveTestCard({ baselineMs: baselineMsProp, baseline, onResult }: Props) {
  const baselineMs = baselineMsProp ?? baseline ?? null;
  const [state, setState] = useState<TestState>('idle');
  const [result, setResult] = useState<number | null>(null);
  const [falseStart, setFalseStart] = useState(false);

  const readyTime = useRef<number>(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim      = useRef(new Animated.Value(0)).current;

  const startTest = useCallback(() => {
    setResult(null);
    setFalseStart(false);
    setState('waiting');

    const delay = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    timerRef.current = setTimeout(() => {
      readyTime.current = Date.now();
      setState('ready');
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: false }).start();
    }, delay);
  }, [anim]);

  const handleTap = useCallback(() => {
    if (state === 'waiting') {
      // False start
      if (timerRef.current) clearTimeout(timerRef.current);
      setFalseStart(true);
      setState('idle');
      return;
    }
    if (state === 'ready') {
      const elapsed = Date.now() - readyTime.current;
      Animated.timing(anim, { toValue: 0, duration: 100, useNativeDriver: false }).start();
      setResult(elapsed);
      setState('done');
      onResult(elapsed);
    }
  }, [state, anim, onResult]);

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setFalseStart(false);
    anim.setValue(0);
  }, [anim]);

  // Compute decline vs baseline
  const declineStatus = (() => {
    if (!result || !baselineMs) return null;
    const pct = (result - baselineMs) / baselineMs;
    if (pct >= DECLINE_DANGER_PCT) return 'danger';
    if (pct >= DECLINE_WARN_PCT)   return 'warning';
    return 'improved';
  })();

  const bgColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['#6B7280', '#B7D9A8'],
  });

  return (
    <Card
      style={styles.card}
      backgroundTone="bodyMassSupport"
      backgroundScrimColor="rgba(10, 10, 10, 0.76)"
    >
      <Text style={styles.title}>Cognitive Reaction Test</Text>
      <Text style={styles.subtitle}>
        Tap when the circle turns green. Dehydration slows reaction time.
      </Text>

      {baselineMs && (
        <Text style={styles.baselineText}>Baseline: {baselineMs} ms</Text>
      )}

      {/* Test circle */}
      <TouchableOpacity
        onPress={handleTap}
        activeOpacity={0.85}
        disabled={state === 'done'}
        style={styles.circleWrapper}
      >
        <Animated.View style={[styles.circle, { backgroundColor: bgColor }]}>
          <Text style={styles.circleText}>
            {state === 'idle'    ? 'TAP TO START'  :
             state === 'waiting' ? 'WAIT...'        :
             state === 'ready'   ? 'TAP NOW!'       :
             `${result} ms`}
          </Text>
        </Animated.View>
      </TouchableOpacity>

      {/* False start */}
      {falseStart && (
        <View style={styles.falseStartBanner}>
          <Text style={styles.falseStartText}>Too early! Wait for green.</Text>
          <TouchableOpacity onPress={startTest}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Result analysis */}
      {state === 'done' && result !== null && (
        <View style={styles.resultBlock}>
          {declineStatus === 'danger' && (
            <View style={[styles.resultBanner, { backgroundColor: `${COLORS.error}18`, borderColor: `${COLORS.error}44` }]}>
              <Text style={[styles.resultBannerTitle, { color: COLORS.error }]}>⛔ Reaction Severely Slowed</Text>
              <Text style={styles.resultBannerBody}>
                {result} ms — {Math.round(((result - baselineMs!) / baselineMs!) * 100)}% slower than your baseline.
                This indicates significant cognitive impairment from dehydration. Consult your corner.
              </Text>
            </View>
          )}
          {declineStatus === 'warning' && (
            <View style={[styles.resultBanner, { backgroundColor: `${COLORS.warning}18`, borderColor: `${COLORS.warning}44` }]}>
              <Text style={[styles.resultBannerTitle, { color: COLORS.warning }]}>⚠️ Reaction Slowed</Text>
              <Text style={styles.resultBannerBody}>
                {result} ms — {Math.round(((result - baselineMs!) / baselineMs!) * 100)}% slower than baseline.
                Monitor closely and increase rehydration.
              </Text>
            </View>
          )}
          {declineStatus === 'improved' && (
            <View style={[styles.resultBanner, { backgroundColor: `${COLORS.success}18`, borderColor: `${COLORS.success}44` }]}>
              <Text style={[styles.resultBannerTitle, { color: COLORS.success }]}>✅ Reaction Normal</Text>
              <Text style={styles.resultBannerBody}>
                {result} ms — within normal range of baseline ({baselineMs} ms).
              </Text>
            </View>
          )}
          {declineStatus === null && (
            <View style={[styles.resultBanner, { backgroundColor: COLORS.surfaceSecondary, borderColor: COLORS.borderLight }]}>
              <Text style={[styles.resultBannerTitle, { color: COLORS.accent }]}>Result: {result} ms</Text>
              {!baselineMs && (
                <Text style={styles.resultBannerBody}>
                  This result will become your baseline. Complete the test again tomorrow to track changes.
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.retryButton} onPress={reset}>
            <Text style={styles.retryButtonText}>Test Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'idle' && !falseStart && (
        <TouchableOpacity style={styles.startButton} onPress={startTest}>
          <Text style={styles.startButtonText}>Start Test</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  title: { fontFamily: FONT_FAMILY.semiBold, fontSize: 15, color: COLORS.text.primary, marginBottom: 2 },
  subtitle: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.text.secondary, marginBottom: 4 },
  baselineText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
  circleWrapper: { alignItems: 'center', marginVertical: SPACING.lg },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
    color: '#F5F5F0',
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },
  falseStartBanner: {
    backgroundColor: `${COLORS.warning}18`,
    borderWidth: 1,
    borderColor: `${COLORS.warning}44`,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  falseStartText: { fontFamily: FONT_FAMILY.regular, fontSize: 13, color: COLORS.warning },
  retryText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: COLORS.accent },
  resultBlock: { gap: SPACING.sm },
  resultBanner: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  resultBannerTitle: { fontFamily: FONT_FAMILY.semiBold, fontSize: 14, marginBottom: 4 },
  resultBannerBody: { fontFamily: FONT_FAMILY.regular, fontSize: 13, color: COLORS.text.secondary },
  retryButton: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  retryButtonText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: COLORS.text.primary },
  startButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  startButtonText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 15, color: COLORS.text.inverse },
});
