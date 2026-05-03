import type { WorkoutTaxonomyItem } from '../../types.ts';

export const movementPatterns = [
  {
    "id": "squat",
    "label": "Squat",
    "summary": "Knee-dominant lower-body pattern."
  },
  {
    "id": "hinge",
    "label": "Hinge",
    "summary": "Hip-dominant posterior-chain pattern."
  },
  {
    "id": "lunge",
    "label": "Lunge",
    "summary": "Split-stance and single-leg knee-dominant work."
  },
  {
    "id": "horizontal_push",
    "label": "Horizontal Push",
    "summary": "Pressing away from the torso."
  },
  {
    "id": "vertical_push",
    "label": "Vertical Push",
    "summary": "Pressing overhead."
  },
  {
    "id": "horizontal_pull",
    "label": "Horizontal Pull",
    "summary": "Rowing toward the torso."
  },
  {
    "id": "vertical_pull",
    "label": "Vertical Pull",
    "summary": "Pulling down or up vertically."
  },
  {
    "id": "carry",
    "label": "Carry",
    "summary": "Loaded locomotion and trunk bracing."
  },
  {
    "id": "anti_extension",
    "label": "Anti-Extension",
    "summary": "Resist spinal extension."
  },
  {
    "id": "anti_rotation",
    "label": "Anti-Rotation",
    "summary": "Resist rotation under load."
  },
  {
    "id": "trunk_flexion",
    "label": "Trunk Flexion",
    "summary": "Controlled spinal flexion or anterior trunk work."
  },
  {
    "id": "rotation",
    "label": "Rotation",
    "summary": "Controlled trunk and hip rotation."
  },
  {
    "id": "locomotion",
    "label": "Locomotion",
    "summary": "Walking, running, cycling, rowing, or similar cyclic work."
  },
  {
    "id": "jump_land",
    "label": "Jump/Land",
    "summary": "Jumping and landing mechanics."
  },
  {
    "id": "crawl",
    "label": "Crawl",
    "summary": "Quadruped locomotion and coordination."
  },
  {
    "id": "shoulder_prehab",
    "label": "Shoulder Prehab",
    "summary": "Scapular and rotator cuff support."
  },
  {
    "id": "hip_mobility",
    "label": "Hip Mobility",
    "summary": "Hip range and control."
  },
  {
    "id": "thoracic_mobility",
    "label": "Thoracic Mobility",
    "summary": "Upper-back rotation and extension."
  },
  {
    "id": "ankle_mobility",
    "label": "Ankle Mobility",
    "summary": "Ankle range and calf capacity."
  },
  {
    "id": "breathing",
    "label": "Breathing",
    "summary": "Down-regulation and breath mechanics."
  },
  {
    "id": "balance",
    "label": "Balance",
    "summary": "Static or dynamic balance control."
  }
] satisfies WorkoutTaxonomyItem[];
