# Remaining User Screens Command Rebuild

These mockups extend the refreshed Today, Train, and Plan direction to the remaining user-facing surfaces. The shared rule is a command-screen foundation: textured domain background, dark safety overlay, pearl/gold hierarchy, glass cards, one clear primary action per section, and minimum 44 pt touch targets.

## Fuel Home

Primary goal: log or review fuel without turning the screen into a spreadsheet.

```
FUEL / Today's fuel
[Quick log | Tracker]

[Fuel command card]
  headline from guided fueling
  3 tiles: Energy, Protein, Water
  actions: Log food | Scan | Body mass

[Performance context card]
[Fuel focus]
[Log next rail]
[Hydration]
[Details toggle]
```

States: loading skeletons, refresh error with retry, quick and detailed modes, missing target values shown as pending rather than zero, safety warnings before macro details.

## Food Logging Flow

Primary goal: move from search/scan/manual entry to a logged food with minimal typing.

```
[Textured fuel background]
Back / Add to meal
[Search input + barcode]
[Mode chips]
[Grouped results]

Food detail:
[Food identity]
[Serving selector]
[Nutrition preview]
[Favorite toggle]
[Sticky add button]
```

States: recent-first empty state, offline/search error retry, invalid food route recovery, keyboard-aware custom food entry, camera permission fallback.

## Body-Mass And Weight-Class

Primary goal: keep body-mass support safety-first while preserving continuity with Fuel.

```
[Body-mass command background]
[Phase/countdown hero]
[Safety-guided coaching card]
[Performance context]
[Trend]
[Timeline]
[Actions]
```

States: no active plan, active plan, safety blocked, history empty, setup evaluation blocked, fight-week monitoring, post weigh-in recovery, invalid recovery route.

## Me And Account

Primary goal: make profile, setup, and account controls feel like part of the operating system, not an admin dump.

```
ME / Profile & settings
[Athlete identity card]
[Stats mosaic]
[Performance context]
[Planning setup]
[Training environment]
[Nutrition & recovery]
[Setup guide]
[Account]
```

States: loading, unauthenticated/empty snapshot retry, inline edit, account actions, support/legal links, destructive delete confirmation.
