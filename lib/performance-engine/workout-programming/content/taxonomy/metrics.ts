import type { WorkoutTaxonomyItem } from '../../types.ts';

export const trackingMetrics = [
  {
    "id": "sets_completed",
    "label": "Sets Completed",
    "summary": "Number of working sets completed."
  },
  {
    "id": "reps_completed",
    "label": "Reps Completed",
    "summary": "Completed reps per exercise."
  },
  {
    "id": "load_used",
    "label": "Load Used",
    "summary": "Weight or external load used."
  },
  {
    "id": "target_rpe",
    "label": "Target RPE",
    "summary": "Intended perceived effort."
  },
  {
    "id": "actual_rpe",
    "label": "Actual RPE",
    "summary": "Reported perceived effort."
  },
  {
    "id": "rest_seconds",
    "label": "Rest Seconds",
    "summary": "Rest interval between sets or rounds."
  },
  {
    "id": "tempo",
    "label": "Tempo",
    "summary": "Movement tempo prescription."
  },
  {
    "id": "duration_minutes",
    "label": "Duration Minutes",
    "summary": "Session or block time."
  },
  {
    "id": "heart_rate_zone",
    "label": "Heart Rate Zone",
    "summary": "Aerobic intensity zone."
  },
  {
    "id": "distance",
    "label": "Distance",
    "summary": "Distance covered."
  },
  {
    "id": "rounds_completed",
    "label": "Rounds Completed",
    "summary": "Rounds completed in circuits or intervals."
  },
  {
    "id": "work_seconds",
    "label": "Work Seconds",
    "summary": "Length of work interval."
  },
  {
    "id": "pain_score_before",
    "label": "Pain Before",
    "summary": "Pain score before training."
  },
  {
    "id": "pain_score_after",
    "label": "Pain After",
    "summary": "Pain score after training."
  },
  {
    "id": "movement_quality",
    "label": "Movement Quality",
    "summary": "Self or coach quality rating."
  },
  {
    "id": "breathing_quality",
    "label": "Breathing Quality",
    "summary": "Breath control or downshift quality."
  },
  {
    "id": "range_quality",
    "label": "Range Quality",
    "summary": "Usable range and control quality."
  },
  {
    "id": "symptom_change",
    "label": "Symptom Change",
    "summary": "Whether symptoms improved, stayed, or worsened."
  },
  {
    "id": "completion_status",
    "label": "Completion Status",
    "summary": "Completed, modified, or stopped."
  },
  {
    "id": "readiness_after",
    "label": "Readiness After",
    "summary": "Post-session readiness feel."
  },
  {
    "id": "heart_rate_avg",
    "label": "Average Heart Rate",
    "summary": "Average heart rate if available."
  },
  {
    "id": "pace",
    "label": "Pace",
    "summary": "Running, walking, or machine pace."
  },
  {
    "id": "calories_optional",
    "label": "Calories Optional",
    "summary": "Machine-estimated calories when available."
  },
  {
    "id": "notes",
    "label": "Notes",
    "summary": "Free-text athlete notes."
  },
  {
    "id": "substitution_used",
    "label": "Substitution Used",
    "summary": "Whether the athlete substituted a movement."
  }
] satisfies WorkoutTaxonomyItem[];

export const assessmentMetrics = [
  {
    "id": "session_rpe",
    "label": "Session RPE",
    "summary": "Global session effort."
  },
  {
    "id": "readiness_score",
    "label": "Readiness Score",
    "summary": "Current readiness rating."
  },
  {
    "id": "sleep_quality",
    "label": "Sleep Quality",
    "summary": "Recent sleep quality."
  },
  {
    "id": "soreness",
    "label": "Soreness",
    "summary": "Whole-body or local soreness."
  },
  {
    "id": "pain_location",
    "label": "Pain Location",
    "summary": "Location of reported pain."
  },
  {
    "id": "pain_severity",
    "label": "Pain Severity",
    "summary": "Severity of pain signal."
  },
  {
    "id": "range_of_motion",
    "label": "Range of Motion",
    "summary": "Movement range tolerance."
  },
  {
    "id": "resting_hr",
    "label": "Resting HR",
    "summary": "Resting heart rate."
  },
  {
    "id": "hrv",
    "label": "HRV",
    "summary": "Heart-rate variability when available."
  },
  {
    "id": "body_mass",
    "label": "Body Mass",
    "summary": "Current body mass."
  },
  {
    "id": "hydration_status",
    "label": "Hydration Status",
    "summary": "Hydration and thirst markers."
  },
  {
    "id": "energy_level",
    "label": "Energy Level",
    "summary": "Subjective energy."
  },
  {
    "id": "technical_quality",
    "label": "Technical Quality",
    "summary": "Observed movement quality."
  },
  {
    "id": "breathing_recovery",
    "label": "Breathing Recovery",
    "summary": "Ability to recover breathing."
  },
  {
    "id": "completion_tolerance",
    "label": "Completion Tolerance",
    "summary": "How well the athlete tolerated the prescription."
  }
] satisfies WorkoutTaxonomyItem[];
