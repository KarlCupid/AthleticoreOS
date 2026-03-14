"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalReadinessState = getGlobalReadinessState;
/**
 * @ANTI-WIRING:
 * Antigravity needs to call this function on Dashboard mount (or when checkin
 * data changes) and pass the returned ReadinessState into
 * ReadinessThemeContext.setReadiness() so the entire app's accent color
 * reflects the athlete's current global readiness level.
 *
 * UI Parameters Expected:
 *   - sleep: number (1-5, from today's Daily_Checkins.sleep_quality)
 *   - readiness: number (1-5, from today's Daily_Checkins.readiness)
 *   - acwr: number (yesterday's ACWRResult.ratio from calculateACWR)
 *
 * Returns: ReadinessState ('Prime' | 'Caution' | 'Depleted')
 *
 * This is a pure, synchronous, deterministic function. No side effects.
 */
function getGlobalReadinessState({ sleep, readiness, acwr, weightPenalty, }) {
    // Apply weight penalty to readiness score
    const adjustedReadiness = Math.max(1, readiness - (weightPenalty ?? 0));
    // Depleted — checked first (most severe)
    if (adjustedReadiness === 1 || acwr >= 1.5) {
        return 'Depleted';
    }
    // Caution — moderate risk indicators
    if (sleep <= 2 || adjustedReadiness <= 2 || (acwr >= 1.31 && acwr <= 1.49)) {
        return 'Caution';
    }
    // Prime — all signals green
    if (sleep > 3 && adjustedReadiness > 3 && acwr <= 1.3) {
        return 'Prime';
    }
    // Fallback: middle-ground values (e.g. sleep=3, readiness=3, acwr<=1.3)
    // that don't satisfy Prime's strict thresholds default to Caution.
    return 'Caution';
}
