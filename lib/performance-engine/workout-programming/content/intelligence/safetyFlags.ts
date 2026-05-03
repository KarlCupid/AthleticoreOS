import type { WorkoutSafetyFlag } from '../../types.ts';

export const safetyFlags = [
  {
    "id": "red_flag_symptoms",
    "label": "Red-Flag Symptoms",
    "severity": "block",
    "summary": "Symptoms that require stopping hard training.",
    "blocksHardTraining": true,
    "contraindicationTags": [
      "red_flag_symptoms"
    ]
  },
  {
    "id": "acute_chest_pain",
    "label": "Acute Chest Pain",
    "severity": "block",
    "summary": "Chest pain blocks workout generation.",
    "blocksHardTraining": true,
    "contraindicationTags": [
      "acute_chest_pain"
    ]
  },
  {
    "id": "fainting",
    "label": "Fainting",
    "severity": "block",
    "summary": "Fainting blocks workout generation.",
    "blocksHardTraining": true,
    "contraindicationTags": [
      "fainting"
    ]
  },
  {
    "id": "severe_dizziness",
    "label": "Severe Dizziness",
    "severity": "block",
    "summary": "Severe dizziness blocks hard training.",
    "blocksHardTraining": true,
    "contraindicationTags": [
      "severe_dizziness"
    ]
  },
  {
    "id": "acute_neurological_symptoms",
    "label": "Acute Neurological Symptoms",
    "severity": "block",
    "summary": "Neurological symptoms block training.",
    "blocksHardTraining": true,
    "contraindicationTags": [
      "acute_neurological_symptoms"
    ]
  },
  {
    "id": "poor_readiness",
    "label": "Poor Readiness",
    "severity": "restriction",
    "summary": "Poor readiness caps intensity.",
    "blocksHardTraining": true,
    "contraindicationTags": []
  },
  {
    "id": "unknown_readiness",
    "label": "Unknown Readiness",
    "severity": "caution",
    "summary": "Missing readiness is unknown, not safe.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "knee_caution",
    "label": "Knee Caution",
    "severity": "restriction",
    "summary": "Avoid knee-irritating movements and jumps.",
    "blocksHardTraining": false,
    "contraindicationTags": [
      "knee_caution",
      "no_jumping"
    ]
  },
  {
    "id": "back_caution",
    "label": "Back Caution",
    "severity": "restriction",
    "summary": "Avoid high spinal load and sloppy hinges.",
    "blocksHardTraining": false,
    "contraindicationTags": [
      "back_caution"
    ]
  },
  {
    "id": "shoulder_caution",
    "label": "Shoulder Caution",
    "severity": "restriction",
    "summary": "Avoid painful pressing and aggressive overhead work.",
    "blocksHardTraining": false,
    "contraindicationTags": [
      "shoulder_caution"
    ]
  },
  {
    "id": "wrist_caution",
    "label": "Wrist Caution",
    "severity": "caution",
    "summary": "Avoid wrist-loaded positions if painful.",
    "blocksHardTraining": false,
    "contraindicationTags": [
      "wrist_caution"
    ]
  },
  {
    "id": "no_jumping",
    "label": "No Jumping",
    "severity": "restriction",
    "summary": "Jump and land patterns are removed.",
    "blocksHardTraining": false,
    "contraindicationTags": [
      "no_jumping"
    ]
  },
  {
    "id": "no_running",
    "label": "No Running",
    "severity": "restriction",
    "summary": "Running patterns are removed.",
    "blocksHardTraining": false,
    "contraindicationTags": [
      "no_running"
    ]
  },
  {
    "id": "no_overhead_pressing",
    "label": "No Overhead Pressing",
    "severity": "restriction",
    "summary": "Overhead pressing is replaced with shoulder-friendly pressing or prehab.",
    "blocksHardTraining": false,
    "contraindicationTags": [
      "shoulder_caution"
    ]
  },
  {
    "id": "no_floor_work",
    "label": "No Floor Work",
    "severity": "restriction",
    "summary": "Floor-based exercises are replaced with standing, seated, or supported options.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "limited_space",
    "label": "Limited Space",
    "severity": "info",
    "summary": "Lane, carry, crawl, and broad open-space exercises are replaced.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "low_impact_required",
    "label": "Low Impact Required",
    "severity": "restriction",
    "summary": "Moderate and high impact work is replaced with low-impact alternatives.",
    "blocksHardTraining": false,
    "contraindicationTags": [
      "no_jumping"
    ]
  },
  {
    "id": "high_fatigue",
    "label": "High Fatigue",
    "severity": "restriction",
    "summary": "High fatigue state biases lower complexity and lower session stress.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "low_energy",
    "label": "Low Energy",
    "severity": "caution",
    "summary": "Intensity and volume should be conservative.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "poor_sleep",
    "label": "Poor Sleep",
    "severity": "caution",
    "summary": "Reduce hard work if poor sleep is present.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "high_soreness",
    "label": "High Soreness",
    "severity": "restriction",
    "summary": "Reduce volume and avoid high eccentric load.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "illness_caution",
    "label": "Illness Caution",
    "severity": "restriction",
    "summary": "Use recovery until symptoms improve.",
    "blocksHardTraining": true,
    "contraindicationTags": []
  },
  {
    "id": "under_fueled",
    "label": "Under-Fueled",
    "severity": "restriction",
    "summary": "Avoid hard conditioning and high-volume work.",
    "blocksHardTraining": true,
    "contraindicationTags": []
  },
  {
    "id": "hydration_caution",
    "label": "Hydration Caution",
    "severity": "caution",
    "summary": "Keep intensity modest and monitor symptoms.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "new_athlete",
    "label": "New Athlete",
    "severity": "caution",
    "summary": "Use beginner prescriptions and conservative progression.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "equipment_limited",
    "label": "Equipment Limited",
    "severity": "info",
    "summary": "Select bodyweight or available-equipment substitutions.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "time_limited",
    "label": "Time Limited",
    "severity": "info",
    "summary": "Reduce optional slots before main work.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "pain_increased_last_session",
    "label": "Pain Increased Last Session",
    "severity": "restriction",
    "summary": "Regress or substitute the aggravating pattern.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  },
  {
    "id": "post_competition_recovery",
    "label": "Post-Competition Recovery",
    "severity": "restriction",
    "summary": "Bias recovery and mobility.",
    "blocksHardTraining": true,
    "contraindicationTags": []
  },
  {
    "id": "coach_review_needed",
    "label": "Coach Review Needed",
    "severity": "caution",
    "summary": "Generate conservative output and ask for review.",
    "blocksHardTraining": false,
    "contraindicationTags": []
  }
] satisfies WorkoutSafetyFlag[];
