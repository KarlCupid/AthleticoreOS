import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';

interface UseTimerHapticsOptions {
  remainingSeconds: number | null;
  totalSeconds: number;
}

/**
 * Fires haptic feedback at meaningful rest-timer milestones.
 * Milestones: halfway, 30s, 10s, last-5-countdown (5,4,3,2,1), completion.
 */
export function useTimerHaptics({ remainingSeconds, totalSeconds }: UseTimerHapticsOptions) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Reset fired milestones when a new rest period starts (remaining resets to total)
    if (remainingSeconds === totalSeconds) {
      firedRef.current = new Set();
    }
  }, [totalSeconds]);

  useEffect(() => {
    if (remainingSeconds === null) return;

    const fired = firedRef.current;
    const halfway = Math.floor(totalSeconds / 2);

    // Halfway
    if (remainingSeconds === halfway && !fired.has('half')) {
      fired.add('half');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    // 30 seconds
    if (remainingSeconds === 30 && totalSeconds > 35 && !fired.has('30')) {
      fired.add('30');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    // 10 seconds warning
    if (remainingSeconds === 10 && !fired.has('10')) {
      fired.add('10');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    // Final countdown 5–1
    if (remainingSeconds >= 1 && remainingSeconds <= 5) {
      const key = `tick-${remainingSeconds}`;
      if (!fired.has(key)) {
        fired.add(key);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return;
    }

    // Completion
    if (remainingSeconds === 0 && !fired.has('done')) {
      fired.add('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [remainingSeconds, totalSeconds]);
}
