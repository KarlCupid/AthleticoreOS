import type { PrescriptionTemplate } from '../../types.ts';

export const recoveryPrescriptionTemplates = [
  {
    "id": "recovery_easy",
    "label": "Easy Recovery Work",
    "kind": "recovery",
    "appliesToWorkoutTypeIds": [
      "recovery"
    ],
    "defaultDurationMinutes": 12,
    "defaultRpe": 2,
    "restSeconds": 0,
    "intensityCue": "Finish feeling better or stop early.",
    "effortGuidance": "Stay clearly below training effort.",
    "payload": {
      "kind": "recovery",
      "intensityCap": {
        "max": 3,
        "unit": "RPE"
      },
      "durationMinutes": {
        "min": 8,
        "max": 25,
        "target": 12
      },
      "breathingStrategy": "Nasal or relaxed breathing with longer exhales.",
      "circulationGoal": "Increase easy blood flow without adding fatigue.",
      "readinessAdjustment": "Shorten or switch to breathing-only if readiness is poor or symptoms rise."
    }
  },
  {
    "id": "breathing_reset",
    "label": "Breathing Reset",
    "kind": "recovery",
    "appliesToWorkoutTypeIds": [
      "recovery",
      "mobility"
    ],
    "defaultDurationMinutes": 4,
    "defaultRpe": 1,
    "restSeconds": 0,
    "intensityCue": "Long exhales and low effort.",
    "effortGuidance": "This should downshift the athlete, not become a training stress.",
    "payload": {
      "kind": "recovery",
      "intensityCap": {
        "max": 2,
        "unit": "RPE"
      },
      "durationMinutes": {
        "min": 2,
        "max": 6,
        "target": 4
      },
      "breathingStrategy": "Slow nasal inhale with a longer relaxed exhale.",
      "circulationGoal": "Lower arousal and restore breathing mechanics.",
      "readinessAdjustment": "Use as the fallback when readiness, pain, or symptoms make training uncertain."
    }
  }
] satisfies PrescriptionTemplate[];
