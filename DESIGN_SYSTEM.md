# Athleticore OS Design System

This document describes the current visual and interaction rules for Athleticore OS. It is the source of truth for theme usage, UI primitives, and contributor expectations when changing product surfaces.

## Design intent

The app should feel like a focused athlete operating system, not a generic wellness dashboard.

- Dark, stable chrome anchors the experience.
- Layered surfaces carry content without turning every screen into a full-bleed effect.
- Readiness is communicated intentionally through accents and feedback, not by recoloring the whole app.
- Typography and tap targets adapt to the context: planning and reading vs. gym-floor execution.

## Root shell

The root visual shell is assembled in `App.tsx`.

- `APP_CHROME.background` is the base canvas color.
- `AuroraBackground` sits once behind the app and provides slow, atmospheric motion.
- React Navigation uses a transparent background so child screens live on top of the shared shell.
- The bottom tab bar is treated as elevated chrome, not as a per-screen surface.

Contributor rule:

- Do not create new full-screen background systems for individual screens unless the product direction explicitly changes.

## Color system

Theme tokens live in `src/theme/theme.ts`.

### Core chrome and surfaces

- `APP_CHROME.background`: fixed root background.
- `APP_CHROME.accent`: primary chrome accent, especially for active navigation and key actions.
- `COLORS.surface`: default dark translucent surface.
- `COLORS.surfaceElevated`: elevated dark translucent surface.
- `COLORS.surfaceSecondary`: denser supporting surface.
- `COLORS.border` and `COLORS.borderLight`: edge and separation tokens.

### Readiness colors

- `COLORS.readiness.prime`
- `COLORS.readiness.caution`
- `COLORS.readiness.depleted`

These are for readiness-aware UI only.

Contributor rules:

- Do not tint app chrome or whole screens by readiness level.
- Use readiness colors only where the user is explicitly reading readiness, recovery, or prescription state.
- Prefer `useReadinessAccent()` for scoped readiness-aware UI.

### Semantic feedback

Use `SEMANTIC_PALETTE` for informational or coaching semantics that are not direct readiness state:

- `positive`
- `caution`
- `alert`
- `info`

Contributor rule:

- If the UI is communicating meaning like success, reminder, risk, or schedule change, prefer semantic tiers over inventing ad hoc colors.

## Surface system

The preferred surface primitive is `src/components/Card.tsx`.

Available variants:

- `default`
- `elevated`
- `outlined`
- `filled`
- `glass`

Practical guidance:

- Use `default` for most information cards.
- Use `elevated` sparingly for important stacked emphasis.
- Use `outlined` when separation is more important than fill contrast.
- Use `filled` for denser sub-panels or utility groupings.

`GlassCard` is deprecated.

Contributor rules:

- Do not introduce new uses of `GlassCard`.
- Prefer tokenized borders, radii, and shadows from `src/theme/theme.ts`.
- If a new surface need appears, extend `Card` or the theme tokens before creating a one-off visual pattern.

## Typography

The app uses the Outfit family:

- `Outfit_400Regular`
- `Outfit_600SemiBold`
- `Outfit_800ExtraBold`
- `Outfit_900Black`

### Preferred system

Use `TYPOGRAPHY_V2` for all new UI.

- `TYPOGRAPHY_V2.plan`: planning, dashboards, nutrition, replay, and reading-heavy flows.
- `TYPOGRAPHY_V2.focus`: guided workouts, timers, and gym-floor interactions.

### Legacy system

`TYPOGRAPHY` and `TYPOGRAPHY_LEGACY` remain for backward compatibility.

Contributor rules:

- Do not expand legacy typography usage in new files.
- Use `plan` tokens for calm, sentence-first hierarchy.
- Use `focus` tokens when the athlete must read at arm's length or interact under fatigue.

## Spacing, shape, and touch

Core layout tokens:

- `SPACING`
- `RADIUS`
- `SHADOWS`
- `BORDERS`

Interaction-mode and touch tokens:

- `SPACING_FOCUS`
- `TAP_TARGETS`

Contributor rules:

- Use theme spacing and radius tokens instead of hard-coded values when a matching token exists.
- Respect minimum target sizing for focus and gym-floor flows.
- Increase clarity before increasing decoration.

## Interaction modes

Mode state is exposed through `src/context/InteractionModeContext.tsx`.

Important modes:

- `standard`
- `focus`
- `gym-floor`

Current behavior includes:

- bottom navigation hides in gym-floor mode
- workout surfaces use larger, more legible touch targets
- focus typography is used for critical training interactions

Contributor rules:

- Treat workout execution as a different ergonomic context from plan reading.
- When adding new workout actions, verify sizing and legibility in gym-floor mode.

## Motion

Motion should support orientation and feel, not compete with the content.

Current motion language includes:

- slow aurora movement in the root background
- subtle tab feedback and haptics
- restrained entrance and press animations on some card and control surfaces
- reduced visual noise in planning surfaces compared with older UI treatments

Contributor rules:

- Prefer calm, low-frequency motion for ambient layers.
- Prefer concise, functional motion for interactions.
- Avoid decorative motion that reduces readability or makes plan mode feel busy.

## Component-level rules

### App chrome

- Use `APP_CHROME` for nav and root-shell decisions.
- Keep screen backgrounds transparent when they are meant to inherit the shared shell.

### Readiness-aware UI

- Use readiness accents for scores, targeted feedback, and a small set of purpose-built status surfaces.
- Keep readiness usage explicit and local.

### Training and gym-floor UI

- Prefer `TYPOGRAPHY_V2.focus`.
- Respect `TAP_TARGETS.focus` and `TAP_TARGETS.focusPrimary`.
- Keep primary actions obvious and easy to hit while moving or fatigued.

### Planning and review UI

- Prefer `TYPOGRAPHY_V2.plan`.
- Use stronger copy hierarchy and simpler surfaces instead of decorative gradients or extra animation.
- Keep copy action-first. Screen subtitles should stay under 8 words, card subtitles under 6 words, helper text to one short sentence, coach summaries to one sentence, and list/card rows to 2 visible lines.
- Put rationale and education behind details, disclosure, or secondary screens instead of making it required reading on first view.

## File map

- `src/theme/theme.ts`: colors, gradients, typography, spacing, radii, shadows, semantic palette, touch targets.
- `src/theme/ReadinessThemeContext.tsx`: readiness-scoped color context for legacy or bounded consumers.
- `src/theme/useReadinessAccent.ts`: preferred readiness-accent hook for explicit readiness UI.
- `src/components/AuroraBackground.tsx`: shared animated root backdrop.
- `src/components/Card.tsx`: preferred content surface primitive.
- `src/components/GlassCard.tsx`: deprecated legacy surface primitive.
- `src/navigation/TabNavigator.tsx`: tab-shell chrome and active-state behavior.
- `src/context/InteractionModeContext.tsx`: mode switching for focus and gym-floor behavior.

## Contributor checklist

Before shipping UI work, check the following:

- Does the screen inherit the shared chrome correctly?
- Are colors coming from theme tokens instead of one-off values where feasible?
- Is readiness color scoped to explicit readiness meaning?
- Is `TYPOGRAPHY_V2` used for new UI?
- Is `Card` used instead of `GlassCard`?
- Are touch targets appropriate for the interaction mode?
- If the contributor rules changed, did you update this document and the top-level repo docs?
