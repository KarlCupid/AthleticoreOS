import type { PrescriptionTemplate } from '../../types.ts';

export const flexibilityPrescriptionTemplates = [
  {
    "id": "flexibility_hold",
    "label": "Flexibility Hold",
    "kind": "flexibility",
    "appliesToWorkoutTypeIds": [
      "mobility",
      "recovery"
    ],
    "defaultSets": 2,
    "defaultReps": "20-45 sec/side",
    "defaultRpe": 2,
    "restSeconds": 20,
    "tempo": "relaxed hold",
    "intensityCue": "Hold a mild stretch in a pain-free range and breathe slowly.",
    "effortGuidance": "Never force end range; the hold should soften, not provoke symptoms.",
    "payload": {
      "kind": "flexibility",
      "targetTissues": [
        "hip_flexors",
        "calves",
        "lats",
        "adductors"
      ],
      "targetJoints": [
        "hips",
        "ankles",
        "shoulders",
        "thoracic_spine"
      ],
      "holdTimeSeconds": {
        "min": 20,
        "max": 45,
        "target": 30
      },
      "breathing": "Slow nasal inhale and long relaxed exhale while holding position.",
      "painFreeRange": true,
      "rangeOfMotionIntent": "Improve tolerance to a comfortable end range without forcing tissue."
    }
  }
] satisfies PrescriptionTemplate[];
