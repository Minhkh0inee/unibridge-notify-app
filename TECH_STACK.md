# Tech Stack

## Core

| Layer | Library | Version | Purpose |
|---|---|---|---|
| Framework | Expo | ~54 | Build toolchain, native module management |
| Runtime | React Native | 0.81.5 | Cross-platform native UI |
| Language | React | 19.1.0 | UI component model |
| Language | TypeScript | ~5.9 | Static typing |

## Navigation

| Library | Version | Purpose |
|---|---|---|
| expo-router | ~6.0 | File-based routing, tab navigation |
| react-native-screens | ~4.16 | Native screen containers |
| react-native-safe-area-context | ~5.6 | Safe area insets |

## Notifications

| Library | Version | Purpose |
|---|---|---|
| expo-notifications | ~0.32 | Schedule and receive local push notifications |

## Camera & Media

| Library | Version | Purpose |
|---|---|---|
| expo-camera | ~17.0 | Full-screen camera capture for photo verification |
| expo-image-picker | ~17.0 | Alternative image selection |
| expo-image | ~3.0 | Optimized image rendering |
| expo-av | ~16.0 | Audio playback for escalation sound levels |

## Sensors & Feedback

| Library | Version | Purpose |
|---|---|---|
| expo-haptics | ~15.0 | Haptic feedback at escalating intensity |

## Animations

| Library | Version | Purpose |
|---|---|---|
| react-native-reanimated | ~4.1 | Keyframe animations, splash overlay transition |
| react-native-worklets | 0.5.1 | Worklet callbacks for crossing the JS/UI thread boundary |
| react-native-gesture-handler | ~2.28 | Gesture recognition |

## Storage & Backend

| Library | Version | Purpose |
|---|---|---|
| @react-native-async-storage/async-storage | 2.2.0 | Local key-value persistence (scheduled notification IDs, dose logs) |
| @supabase/supabase-js | ^2.47 | Remote database for journeys, medications, schedules, dose events |

## UI Utilities

| Library | Version | Purpose |
|---|---|---|
| @expo/ui | ~0.2.0-beta | Expo's experimental native UI primitives |
| expo-glass-effect | ~0.1 | Glass morphism visual effects |
| expo-symbols | ~1.0 | SF Symbols icon set (iOS) |
| expo-font | ~14.0 | Custom font loading |
| @react-native-community/datetimepicker | 8.4.4 | Native time picker for scheduling |
| react-native-web | ~0.21 | Web rendering target |

## System

| Library | Version | Purpose |
|---|---|---|
| expo-constants | ~18.0 | Device and build constants |
| expo-device | ~8.0 | Device type detection |
| expo-system-ui | ~6.0 | System UI color scheme control |
| expo-status-bar | ~3.0 | Status bar styling |
| expo-splash-screen | ~31.0 | Controlled splash screen hide |
| expo-linking | ~8.0 | Deep link handling |
| expo-web-browser | ~15.0 | In-app browser for OAuth flows |

## Tooling

| Tool | Purpose |
|---|---|
| ESLint + eslint-config-expo | Linting |
| Metro | JavaScript bundler |
| CocoaPods | iOS native dependency manager |
