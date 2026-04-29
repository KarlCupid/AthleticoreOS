# UI Interaction Layout QA Checklist

Manual checklist for the layout reliability pass. Use this when automated visibility testing is unavailable.

## Viewports

- Small phone portrait, about 320-375 px wide.
- Large phone portrait.
- Tablet or wide web viewport.
- iOS or Android software keyboard open on form fields.

## Today

- Today's Mission primary CTA is visible without horizontal overflow.
- Today's Mission secondary CTAs wrap or shrink without clipping.
- Show/hide details remains tappable.
- First-run modal `Check In` and `Not now` are visible and tappable.
- Bottom navigation does not cover the final Today content.

## Training And Plan

- Weekly Plan `Log Session` opens the current day detail instead of a dead alert.
- Weekly Plan final schedule card can scroll above the floating CTA and bottom tabs.
- Workout Summary `Back to Plan` and `Training Home` stay clear of the home indicator.
- Day Detail activity picker opens as a sheet, closes with `Cancel`, and stays inside the viewport.
- Day Detail edit sheet keeps `Save` and `Cancel` reachable with the keyboard open.

## Nutrition And Fuel

- Food Search mode chips do not overflow on small screens.
- Food Detail `Add to ...` or `Save Changes` remains visible after focusing the amount input.
- Custom Food `Save Food` remains reachable with the keyboard open.
- Custom Food bottom content scrolls above the sticky action area.

## Body Mass And Weight Class

- Weight-class setup footer CTA stays above the safe area.
- Weight-class setup form fields can scroll above the footer.
- Step 5 coach notes field does not cover `Activate body-mass support` when the keyboard is open.
- Safety-blocked Step 4 keeps the disabled CTA visible and readable.

## Activity Logging

- Activity Log `Complete Session` can scroll above the keyboard.
- Add Component sheet stays inside the viewport and `Cancel` remains tappable.
- Component picker rows meet the minimum touch target visually.

