# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm start          # Start Expo dev server (Metro bundler)
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in browser
npm run lint       # Run ESLint via expo lint
npm run reset-project  # Move starter code to app-example/, create blank app/
```

## Architecture

This is a **medication adherence app** built with **Expo SDK 56** and **expo-router** (file-based routing). All source lives in `src/`, with routes under `src/app/` and the app entry point set to `expo-router/entry` in package.json.

**Path aliases** (`tsconfig.json`):
- `@/*` → `src/*`
- `@/assets/*` → `assets/*`

**Routing** (`src/app/`): `_layout.tsx` is the root layout — it wraps everything in `ThemeProvider` and renders `AnimatedSplashOverlay` + `AppTabs`. Tab screens are `index.tsx` (Home) and `explore.tsx`. Tabs use `expo-router/unstable-native-tabs` (`NativeTabs`) on native; `src/components/app-tabs.web.tsx` is the web-specific version.

**Theming** (`src/constants/theme.ts`): Central source for `Colors` (light/dark token map), `Fonts` (platform-specific font stacks), `Spacing` (named numeric scale), and layout constants (`BottomTabInset`, `MaxContentWidth`). The `useTheme()` hook in `src/hooks/use-theme.ts` returns the active color set. Platform-specific hook overrides use `.web.ts` / `.ts` file pairs (e.g., `use-color-scheme`).

**Components** (`src/components/`): Themed primitives (`ThemedText`, `ThemedView`) consume `useTheme()` directly. `AnimatedIcon` / `AnimatedSplashOverlay` use `react-native-reanimated` Keyframes and `react-native-worklets` for the splash transition — `scheduleOnRN` is used to call React state setters from worklet callbacks.

**Experiments enabled** (`app.json`): `typedRoutes` (type-safe `href` props) and `reactCompiler` (React 19 compiler).

**Web output**: Static (`"output": "static"` in `app.json`). CSS is in `src/global.css`, imported via `src/constants/theme.ts`.

**iOS native project** is pre-generated under `ios/` with CocoaPods already installed (Pods directory present). Bundle ID: `com.minhkhoi09012003.unibridge-notify-app`.

## Domain: Escalating Reminder System

The core feature is `src/components/escalating-reminder/`. When a medication notification fires and the user opens the app, an `EscalatingReminder` modal appears and visually/audibly escalates if dismissed.

**Escalation levels** (`escalation-levels.ts`): Three levels (0 = gentle/blue, 1 = warning/yellow, 2 = urgent/red), each with distinct background color, sound volume, and haptic pattern. Sound files live in `assets/sounds/`. `TEST_ADVANCE_LEVEL_ON_IGNORE = true` (dev flag — tapping "Ignore" cycles through levels instead of dismissing; **set to `false`** after testing escalation manually).

**`useEscalation` hook**: Drives level progression via chained `setTimeout` based on `EscalationConfig.startGentleSeconds` and `stepSeconds`. Also runs a haptic pulse interval and loads/plays an audio loop per level using `expo-av`. The `cleanup()` function stops timers, haptics, and audio — call it before dismissing the modal.

**View modes inside `EscalatingReminder`**: `reminder` → `camera` → `verifying` → `verification-failed` / `verification-error` / `success`. The "Photo confirm" flow captures a photo with `CameraCapture`, then calls `verifyMedicationPhoto()`. If `requirePhotoToStop` is true on the journey's `EscalationConfig`, the "Ignore" button is disabled.

## Data Layer

**Types** (`src/data/types.ts`): `Journey` → `Medication[]` + `EscalationConfig`. A `DoseLog` records each taken/ignored dose with optional `photoUri`.

**Storage** (`src/data/storage.ts`): All persistence uses `@react-native-async-storage/async-storage`. Keys: `active_journey`, `all_journeys`, `dose_logs`, `seeded_v1`. `getWeeklyLogs()` filters logs to the past 7 days.

**Seed data** (`src/data/seed.ts`): `seedIfNeeded()` runs once on app launch (called from `HomeScreen`) and populates two preset journeys (HP and Asthma). The HP journey sets `requirePhotoToStop: false`; the Asthma journey sets it to `true`.

## Notification Pipeline

**Scheduling** (`src/notifications/notifications.ts`): `scheduleJourneyNotificationsAsync()` cancels existing notifications then schedules daily `CalendarTrigger` notifications for every `medication.reminderTimes` entry. IDs are persisted to AsyncStorage (`medication_notification_ids_v1`) so they can be cancelled on reschedule. The category registers two actions: **Open Reminder** and **Remind in 5 min** (snooze).

**Observer** (`src/notifications/use-notification-observer.ts`): `useNotificationObserver()` is called in `_layout.tsx`. It listens for notification responses, handles snooze via `snoozeMedicationNotificationAsync()`, and calls `publishReminderIntent()` to trigger the modal.

**Reminder intent bus** (`src/notifications/reminder-intent.ts`): A module-level pub/sub bridge. `publishReminderIntent()` stores the intent and fans it out to all subscribers. `HomeScreen` subscribes with `subscribeToReminderIntents()` and resolves the `medicationId` against the active journey to open the modal. Call `clearPendingReminderIntent()` after consuming to prevent re-triggering on remount.

## Medication Verification API

**`src/services/medication-verification.ts`**: POSTs a photo to `POST /verify-medication` as `multipart/form-data`. The base URL is `EXPO_PUBLIC_API_BASE_URL` (env var); falls back to `http://<metro-host>:3000` in dev, or `http://localhost:3000`. Response must include `containsMedication: boolean` and `confidence: "high" | "medium" | "low"`. A `low` confidence result is treated as failure. Timeout is 15 seconds.
