# Manual UI Smoke Test

Use this checklist when validating responsive layout, keyboard behavior, and safe-area coverage. Preserve the existing Athleticore visual style; this pass is only for reachability, clipping, and blocked controls.

## Viewports

- Small phone portrait: 320 x 568.
- Common phone portrait: 375 x 667.
- Large phone portrait: 390 x 844.
- Phone landscape: 667 x 375.
- Tablet portrait, if supported: 768 x 1024.
- Desktop/web, if supported: 1280 x 800.

## Global Checks

- No screen has horizontal scrolling from cards, long copy, or action rows.
- Bottom navigation never covers the final primary CTA or submit button.
- Sticky headers do not cover the first actionable control.
- Long athlete names, emails, fight names, phase names, and explanation text wrap inside their containers.
- Loading, empty, and error states keep retry/cancel actions visible.
- Modal, drawer, and bottom-sheet content can scroll when taller than the viewport.
- Close, cancel, destructive, and secondary actions remain visible and tappable.
- Touch targets for important actions are at least 44 px tall.

## Core Flows

- Today: open the dashboard with long Today Mission explanations and risk text. Confirm the mission CTA, secondary actions, details toggle, phase transition CTA, quick actions, and first-run modal buttons remain visible and tappable on every viewport.
- Today: open the first-run modal on a short viewport. Confirm the modal scrolls, "Check In" is reachable, and "Not now" closes it.
- Plan: run the fight opportunity setup with a long opponent/event name and long optional details. Confirm the form scrolls, advanced controls wrap, and the final CTA is above the bottom nav/safe area.
- Plan: open the weekly plan/calendar day detail with multiple long activities. Confirm activity actions wrap, are 44 px tall, and are not blocked by the readiness gate.
- Train: open a scheduled training session and workout summary. Confirm primary log/finish CTAs are reachable at the bottom of long content.
- Fuel: open nutrition home, food search, custom food, and food detail with the keyboard open. Confirm submit buttons stay reachable or can be reached by scrolling.
- Fuel: open weight-class/body-mass setup with long safety messages. Confirm next/evaluate/activate CTAs remain visible and copy wraps without horizontal overflow.
- Log: open readiness/check-in forms with the keyboard open. Confirm submit remains reachable and validation/error copy does not hide the submit action.
- Me: edit base weight, target weight, and fight date on small phone and landscape. Confirm Save and Cancel remain visible above the keyboard and long email/profile text wraps.

## Pass Criteria

- The user can complete each intended flow without rotating the device, dismissing overlays by force, or guessing at hidden controls.
- The final actionable control on every scrollable screen has enough bottom padding to clear safe area and bottom navigation.
- Every modal/sheet either fits or scrolls, and every visible active control responds to tap/click.
