import type { EquipmentType } from '../../types.ts';

export const equipmentTypes = [
  {
    "id": "bodyweight",
    "label": "Bodyweight",
    "category": "bodyweight",
    "summary": "No external load required."
  },
  {
    "id": "dumbbells",
    "label": "Dumbbells",
    "category": "free_weight",
    "summary": "Pair or single dumbbell loading."
  },
  {
    "id": "kettlebell",
    "label": "Kettlebell",
    "category": "free_weight",
    "summary": "Kettlebell ballistic and strength loading."
  },
  {
    "id": "barbell",
    "label": "Barbell",
    "category": "free_weight",
    "summary": "Barbell lifts and landmine setups."
  },
  {
    "id": "squat_rack",
    "label": "Squat Rack",
    "category": "machine",
    "summary": "Rack support for loaded squats and presses."
  },
  {
    "id": "bench",
    "label": "Bench",
    "category": "accessory",
    "summary": "Flat or adjustable bench."
  },
  {
    "id": "pull_up_bar",
    "label": "Pull-Up Bar",
    "category": "accessory",
    "summary": "Vertical pulling station."
  },
  {
    "id": "cable_machine",
    "label": "Cable Machine",
    "category": "machine",
    "summary": "Adjustable cable station."
  },
  {
    "id": "resistance_band",
    "label": "Resistance Band",
    "category": "accessory",
    "summary": "Band resistance or assistance."
  },
  {
    "id": "medicine_ball",
    "label": "Medicine Ball",
    "category": "accessory",
    "summary": "Throws, slams, and trunk power."
  },
  {
    "id": "jump_rope",
    "label": "Jump Rope",
    "category": "accessory",
    "summary": "Rope skipping and foot rhythm."
  },
  {
    "id": "assault_bike",
    "label": "Assault Bike",
    "category": "cardio",
    "summary": "Fan bike for low-impact intervals."
  },
  {
    "id": "rowing_machine",
    "label": "Rowing Machine",
    "category": "cardio",
    "summary": "Low-impact rowing ergometer."
  },
  {
    "id": "treadmill",
    "label": "Treadmill",
    "category": "cardio",
    "summary": "Indoor running and walking."
  },
  {
    "id": "stationary_bike",
    "label": "Stationary Bike",
    "category": "cardio",
    "summary": "Bike ergometer or spin bike."
  },
  {
    "id": "elliptical",
    "label": "Elliptical",
    "category": "cardio",
    "summary": "Low-impact elliptical trainer for steady aerobic work."
  },
  {
    "id": "pool",
    "label": "Pool",
    "category": "cardio",
    "summary": "Pool access for swimming or water-based aerobic work."
  },
  {
    "id": "sled",
    "label": "Sled",
    "category": "accessory",
    "summary": "Pushing, dragging, and low-eccentric conditioning."
  },
  {
    "id": "battle_rope",
    "label": "Battle Rope",
    "category": "accessory",
    "summary": "Upper-body conditioning rope."
  },
  {
    "id": "trx",
    "label": "TRX",
    "category": "accessory",
    "summary": "Suspension trainer."
  },
  {
    "id": "foam_roller",
    "label": "Foam Roller",
    "category": "accessory",
    "summary": "Soft-tissue recovery support."
  },
  {
    "id": "mat",
    "label": "Mat",
    "category": "accessory",
    "summary": "Floor-work comfort."
  },
  {
    "id": "plyo_box",
    "label": "Plyo Box",
    "category": "accessory",
    "summary": "Box jumps, step-ups, and supports."
  },
  {
    "id": "leg_press",
    "label": "Leg Press",
    "category": "machine",
    "summary": "Machine leg press."
  },
  {
    "id": "lat_pulldown",
    "label": "Lat Pulldown",
    "category": "machine",
    "summary": "Vertical pull machine."
  },
  {
    "id": "open_space",
    "label": "Open Space",
    "category": "space",
    "summary": "Room for carries, crawling, and circuits."
  },
  {
    "id": "track_or_road",
    "label": "Track or Road",
    "category": "space",
    "summary": "Outdoor running or walking surface."
  }
] satisfies EquipmentType[];
