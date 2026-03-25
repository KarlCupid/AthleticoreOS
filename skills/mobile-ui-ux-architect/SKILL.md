---
name: "mobile-ui-ux-architect"
description: "Design and implement mobile-first screens, flows, and components for iOS, Android, React Native, Expo, Flutter, or other app front ends. Use when Codex needs to create or refine mobile UI/UX, adapt dense web patterns for touch, review layouts for safe areas and keyboard behavior, add loading or empty or error states, or justify a better mobile interaction pattern."
---

# Mobile UI UX Architect

Design for touch, constrained attention, and device context first. Treat mobile as its own interaction model, not a compressed desktop layout.

## Workflow

1. Start by identifying the screen's single primary goal, primary action, and most likely interruption points.
2. Reduce on-screen cognitive load. Prefer progressive disclosure over stacking too much text, too many filters, or too many competing calls to action on one view.
3. Respect platform expectations. Follow iOS Human Interface patterns and Android Material patterns; for cross-platform work, choose the simpler shared behavior and call out any platform-specific exceptions that materially improve usability.
4. Account for real device constraints before finalizing the layout: safe areas, status bars, notches, home indicators, fold or tablet widths, software keyboards, and dark or light mode.
5. Define state coverage as part of the design, not as cleanup work. Always include loading, empty, error, offline, and success feedback states when they apply.
6. Make interaction feedback feel native. Prefer subtle animation, clear pressed states, and haptic feedback suggestions for high-value confirmations.

## Layout Rules

- Keep primary actions reachable within comfortable thumb zones when possible.
- Enforce minimum touch targets of 44x44 pt on iOS or 48x48 dp on Android.
- Prefer one dominant action per screen section. Secondary actions should be visually quieter.
- Break complex tasks into steps, sheets, accordions, or follow-up screens instead of building dense all-in-one layouts.
- Use spacing, grouping, and typography hierarchy to shorten scanning time. Preserve whitespace instead of filling every gap.
- Support dynamic type and text expansion without clipping, overlap, or broken tap targets.

## Accessibility And Resilience

- Ensure logical screen-reader order, clear labels, and strong contrast.
- Avoid gesture-only critical actions unless an accessible visible alternative also exists.
- Handle poor network conditions explicitly with retry affordances, optimistic updates only when safe, and visible sync or failure messaging.
- Use keyboard-aware layouts for forms and chats. Keep the focused field and submit action visible.
- Preserve safe area padding at the top and bottom of the screen, especially for sticky actions, tab bars, and bottom sheets.

## Implementation Guidance

- Produce modular, maintainable UI code with clear component boundaries and sensible state ownership.
- Match the existing design system if one exists; otherwise define a deliberate mobile visual direction instead of defaulting to generic web styling.
- Prefer performant patterns, lightweight motion, and predictable state transitions over visually busy effects.
- Include brief UX reasoning with the output so the tradeoffs are explicit.
- If the user asks for a layout that violates mobile best practices, explain the problem briefly and provide a stronger mobile alternative rather than implementing the weaker pattern unchanged.

## Output Expectations

- Deliver code that is ready to drop into the current stack when the framework is clear.
- Name the loading, empty, error, and success states explicitly when proposing a screen.
- Mention safe area, keyboard, dynamic type, and accessibility handling when those concerns affect the implementation.
- Keep explanations brief and focused on why the chosen interaction reduces friction on mobile.
