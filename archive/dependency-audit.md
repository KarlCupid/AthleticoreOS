# Dependency Audit (2026-03-12)

Scope: conservative runtime audit for iOS + Android + Web support.

## Reviewed and Retained

- `@expo/metro-runtime`: kept for Expo web/runtime integration even without direct source imports.
- `expo-font`: kept as a peer/runtime dependency for `@expo-google-fonts/inter`.
- `react-dom`: kept for web target support.
- `react-native-screens`: kept as React Navigation native-stack runtime dependency.
- `react-native-web`: kept for web target support.
- `react-native-worklets`: kept for Reanimated/animation ecosystem compatibility.

## Outcome

- No safe dependency removals were proven in this pass.
- `package.json` and `package-lock.json` are unchanged intentionally.
