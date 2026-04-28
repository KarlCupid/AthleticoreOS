# Athleticore OS Repo Guidance

These instructions are durable guidance for Codex and other coding agents working in this repository.

## Product Posture

Athleticore OS is still fully in development. Do not preserve weak legacy code out of backward-compatibility concerns when it conflicts with the target product architecture.

The target product is a continuous athlete operating system. The athlete journey starts at sign-up and keeps evolving through onboarding, build phases, fight opportunities, camps, competition weeks, recovery phases, readiness changes, nutrition trends, body-mass trends, and risk signals. Phase changes are transitions, not restarts.

Training, nutrition, tracking, readiness, phase logic, body mass, and risk should be harmonized through one performance state. Every major recommendation should be explainable.

## Architecture Principles

- Prefer clean replacement over compatibility shims when old code conflicts with the new architecture.
- Do not keep duplicate systems.
- Do not leave old scheduling, nutrition, tracking, body-mass, or phase logic active beside new systems.
- Do not create shallow wrappers around bad legacy logic.
- Update call sites instead of preserving old APIs unnecessarily.
- Rewrite or replace tests that enforce obsolete behavior.
- Remove unused imports, stale helpers, and dead branches.
- Treat missing data as unknown, not zero.
- Protected workouts are non-negotiable anchors.
- Phase changes are transitions, not restarts.
- The athlete journey is continuous from sign-up onward.
- Do not create unsafe body-mass or weight-class recommendations.
- Done means relevant tests pass and legacy code directly superseded by the change is removed.

## Target Engine Direction

New product work should move toward the architecture described in:

- `docs/athleticore-product-vision.md`
- `docs/performance-engine-architecture.md`
- `docs/performance-engine-migration-plan.md`

The long-term system should center on:

- Athlete Journey Engine
- Unified Performance Engine
- `AthleteJourneyState`
- `PerformanceState`
- Phase Controller
- Fight Opportunity Engine
- Adaptive Training Engine
- Nutrition and Fueling Engine
- Food Logging Reliability Layer
- Tracking and Readiness Engine
- Body Mass and Weight-Class Management Engine
- Risk and Safety Engine
- Explanation Engine

Existing pure calculation modules may be reused when they are strong, tested, and compatible with the target architecture. Existing service orchestration should usually be treated as transitional unless it already expresses the target domain clearly.

## Safety Rules

Body-mass and weight-class features must be safety first. Never infer that missing weight, intake, hydration, menstrual-cycle, sleep, symptom, or readiness data means the athlete is safe. Missing data is unknown and should reduce confidence, increase caution, or trigger a prompt for more information.

Do not recommend aggressive dehydration, extreme calorie restriction, or any protocol that ignores under-fueling, REDs-style risk, illness, injury, dizziness, fainting, acute pain, or other safety flags.

If safety data conflicts with performance goals, safety wins.

## Protected Workouts

Protected workouts, especially boxing practice, sparring, coach-led sessions, and other fixed commitments, are schedule anchors. Adaptive planning may work around them, reduce supporting load, adjust fueling, or alter recovery recommendations, but it should not silently remove or move protected anchors.

## Tests and Verification

Relevant tests must pass before considering a change done. Prefer focused tests while developing and broader validation before handoff.

Known repo commands:

- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:clean`
- `npm run test:engine`
- `npm run quality`

When replacing legacy behavior, update or remove tests that only protect obsolete behavior. Add characterization tests before risky migrations when the current behavior must be preserved temporarily.

## Cleanup Standard

When a new engine path replaces an old path, remove the directly superseded legacy code in the same change whenever practical. Do not leave unused alternate code paths, stale helpers, old imports, dead branches, or duplicate persistence flows behind.
