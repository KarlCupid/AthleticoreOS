import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY_V2,
  TAP_TARGETS,
} from '../../theme/theme';

// ---------------------------------------------------------------------------
// Timer modes
// ---------------------------------------------------------------------------

export type TimerMode =
  | 'countdown'   // rest timer, counting down to 0
  | 'countup'     // AMRAP, counting up
  | 'interval';   // EMOM/Tabata, work/rest phases

interface BaseTimerProps {
  /** Whether the timer is actively running */
  running: boolean;
  /** Called when timer reaches 0 (countdown) or cycle ends (interval) */
  onComplete?: () => void;
  /** Mode-specific controls */
  onSkip?: () => void;
  onExtend?: (additionalSec: number) => void;
  /** Display size variant */
  size?: 'inline' | 'prominent';
}

// ---------------------------------------------------------------------------
// Countdown timer (rest between sets)
// ---------------------------------------------------------------------------

interface CountdownTimerProps extends BaseTimerProps {
  mode: 'countdown';
  /** Total seconds to count down from */
  totalSeconds: number;
  /** Optional label above the timer */
  label?: string;
}

// ---------------------------------------------------------------------------
// Countup timer (AMRAP)
// ---------------------------------------------------------------------------

interface CountupTimerProps extends BaseTimerProps {
  mode: 'countup';
  /** Optional time cap in seconds */
  timeCap?: number | undefined;
  /** Optional label */
  label?: string | undefined;
}

// ---------------------------------------------------------------------------
// Interval timer (EMOM, Tabata)
// ---------------------------------------------------------------------------

interface IntervalTimerProps extends BaseTimerProps {
  mode: 'interval';
  /** Work interval in seconds */
  workSeconds: number;
  /** Rest interval in seconds */
  restSeconds: number;
  /** Total rounds */
  totalRounds: number;
  /** Current round (1-based) */
  currentRound: number;
  /** Format label (EMOM, Tabata, etc.) */
  formatLabel?: string;
}

export type TimerDisplayProps = CountdownTimerProps | CountupTimerProps | IntervalTimerProps;

// ---------------------------------------------------------------------------
// Shared time formatting
// ---------------------------------------------------------------------------

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(Math.abs(totalSeconds) / 60);
  const secs = Math.abs(totalSeconds) % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// TimerDisplay
// ---------------------------------------------------------------------------

export function TimerDisplay(props: TimerDisplayProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCompletedRef = useRef(false);

  // Run the tick
  useEffect(() => {
    if (props.running) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [props.running]);

  // Reset on prop changes
  useEffect(() => {
    setElapsed(0);
    hasCompletedRef.current = false;
  }, [
    props.mode,
    props.mode === 'countdown' ? props.totalSeconds : null,
    props.mode === 'countup' ? props.timeCap ?? null : null,
    props.mode === 'interval' ? props.currentRound : null,
  ]);

  const isInline = props.size === 'inline';

  // ── Countdown ──
  if (props.mode === 'countdown') {
    const remaining = Math.max(0, props.totalSeconds - elapsed);
    const isUrgent = remaining <= 10 && remaining > 0;

    if (remaining === 0 && elapsed > 0 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      props.onComplete?.();
    }

    const progress = props.totalSeconds > 0
      ? 1 - remaining / props.totalSeconds
      : 1;

    return (
      <View style={[styles.container, isInline && styles.containerInline]}>
        {props.label && <Text style={styles.label}>{props.label}</Text>}
        <Text style={[
          isInline ? styles.timeInline : styles.timeProminent,
          isUrgent && styles.timeUrgent,
        ]}>
          {formatTime(remaining)}
        </Text>
        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        {/* Controls */}
        {(props.onSkip || props.onExtend) && (
          <View style={styles.controls}>
            {props.onSkip && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Skip timer"
                accessibilityHint="Skips the current timer interval."
                onPress={props.onSkip}
                style={styles.controlBtn}
              >
                <Text style={styles.controlText}>Skip</Text>
              </TouchableOpacity>
            )}
            {props.onExtend && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Add 30 seconds"
                accessibilityHint="Extends the current timer interval."
                onPress={() => props.onExtend!(30)}
                style={styles.controlBtn}
              >
                <Text style={styles.controlText}>+30s</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  // ── Countup (AMRAP) ──
  if (props.mode === 'countup') {
    const progress = props.timeCap
      ? Math.min(1, elapsed / props.timeCap)
      : 0;

    if (props.timeCap && elapsed >= props.timeCap && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      props.onComplete?.();
    }

    return (
      <View style={[styles.container, isInline && styles.containerInline]}>
        {props.label && <Text style={styles.label}>{props.label}</Text>}
        <Text style={isInline ? styles.timeInline : styles.timeProminent}>
          {formatTime(elapsed)}
        </Text>
        {props.timeCap && (
          <>
            <Text style={styles.capLabel}>of {formatTime(props.timeCap)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
          </>
        )}
      </View>
    );
  }

  // ── Interval (EMOM / Tabata) ──
  const cycleDuration = props.workSeconds + props.restSeconds;
  const cycleElapsed = elapsed % cycleDuration;
  const isWorkPhase = cycleElapsed < props.workSeconds;
  const phaseRemaining = isWorkPhase
    ? props.workSeconds - cycleElapsed
    : props.restSeconds - (cycleElapsed - props.workSeconds);

  return (
    <View style={[
      styles.container,
      isInline && styles.containerInline,
      isWorkPhase ? styles.workPhase : styles.restPhase,
    ]}>
      {props.formatLabel && (
        <Text style={styles.formatBadge}>{props.formatLabel}</Text>
      )}
      <Text style={styles.phaseLabel}>
        {isWorkPhase ? 'WORK' : 'REST'}
      </Text>
      <Text style={[
        isInline ? styles.timeInline : styles.timeProminent,
        !isWorkPhase && styles.timeRest,
      ]}>
        {formatTime(phaseRemaining)}
      </Text>
      <Text style={styles.roundLabel}>
        Round {props.currentRound} of {props.totalRounds}
      </Text>
      {/* Round blocks */}
      <View style={styles.roundBlocks}>
        {Array.from({ length: props.totalRounds }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.roundBlock,
              i < props.currentRound - 1 && styles.roundBlockDone,
              i === props.currentRound - 1 && styles.roundBlockCurrent,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSecondary,
  },
  containerInline: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeProminent: {
    ...TYPOGRAPHY_V2.focus.target,
    color: COLORS.text.primary,
  },
  timeInline: {
    ...TYPOGRAPHY_V2.plan.headline,
    color: COLORS.text.primary,
  },
  timeUrgent: {
    color: COLORS.readiness.depleted,
  },
  timeRest: {
    color: COLORS.text.secondary,
  },
  capLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
  },
  controls: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  controlBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: TAP_TARGETS.plan.min,
    justifyContent: 'center',
  },
  controlText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  // Interval mode
  workPhase: {
    backgroundColor: COLORS.accentLight,
  },
  restPhase: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  phaseLabel: {
    ...TYPOGRAPHY_V2.focus.display,
    color: COLORS.text.primary,
    letterSpacing: 2,
  },
  formatBadge: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roundLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  roundBlocks: {
    flexDirection: 'row',
    gap: 3,
    flexWrap: 'wrap',
  },
  roundBlock: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  roundBlockDone: {
    backgroundColor: COLORS.accent,
  },
  roundBlockCurrent: {
    backgroundColor: COLORS.readiness.caution,
  },
});
