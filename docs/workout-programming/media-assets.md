# Workout Programming Media Assets

Workout-programming exercises support reviewed media metadata through `exercise.media`.
Media hooks are allowed to exist before assets are ready, but they must be honest:
do not add fake URLs or placeholder URLs.

## Media Fields

- `media.videoUrl`: reviewed demo video URL, or `null` while missing.
- `media.imageUrl`: reviewed still image URL, or `null` while missing.
- `media.thumbnailUrl`: reviewed thumbnail URL, or `null` while missing.
- `media.animationUrl`: reviewed animation URL, or `null` while missing.
- `media.altText`: required whenever an image, thumbnail, video, or animation URL exists.
- `media.reviewStatus`: `draft`, `needs_review`, `approved`, or `rejected`.
- `media.missingReason`: short reason while assets are not ready.
- `media.priority`: `low`, `medium`, or `high`.

High-priority exercises should receive a reviewed demo video or animation before
media-rich production surfaces depend on them.

## Audit Commands

Run the normal audit:

```bash
npm run workout:audit-content
```

Run the release gate:

```bash
npm run workout:validate-content -- --strict
npm run workout:audit-content -- --release
```

The report includes:

- production exercises missing media
- beta exercises missing media
- missing media alt text
- unreviewed media
- high-priority exercises without demo assets

Preview/beta exercises can be missing assets if they are safely gated, but the
missing assets remain visible in the audit. Production-eligible exercises require
approved media when release media is required.

## UI Behavior

Generated workout UI shows reviewed media only when a real approved media asset
and alt text are present. If no asset exists, the UI continues to show setup,
execution, cues, safety notes, and substitutions without rendering broken
placeholders.
