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

This is an **Expo SDK 56** app using **expo-router** for file-based routing. All source lives in `src/`, with routes under `src/app/` and the app entry point set to `expo-router/entry` in package.json.

**Path aliases** (`tsconfig.json`):
- `@/*` → `src/*`
- `@/assets/*` → `assets/*`

**Routing** (`src/app/`): `_layout.tsx` is the root layout — it seeds data and schedules all notifications on mount, then renders `AnimatedSplashOverlay` + `AppTabs`. Tab screens are `index.tsx` (Home) and `explore.tsx`. Tabs use `expo-router/unstable-native-tabs` (`NativeTabs`) on native; `src/components/app-tabs.web.tsx` is the web-specific version.

**Theming** (`src/constants/theme.ts`): Central source for `Colors` (light/dark token map), `Fonts` (platform-specific font stacks), `Spacing` (named numeric scale), and layout constants (`BottomTabInset`, `MaxContentWidth`). The `useTheme()` hook in `src/hooks/use-theme.ts` returns the active color set. Platform-specific hook overrides use `.web.ts` / `.ts` file pairs (e.g., `use-color-scheme`).

**Components** (`src/components/`): Themed primitives (`ThemedText`, `ThemedView`) consume `useTheme()` directly. `AnimatedIcon` / `AnimatedSplashOverlay` use `react-native-reanimated` Keyframes and `react-native-worklets` for the splash transition — `scheduleOnRN` is used to call React state setters from worklet callbacks.

**Experiments enabled** (`app.json`): `typedRoutes` (type-safe `href` props) and `reactCompiler` (React 19 compiler).

**Web output**: Static (`"output": "static"` in `app.json`). CSS is in `src/global.css`, imported via `src/constants/theme.ts`.

**iOS native project** is pre-generated under `ios/` with CocoaPods already installed (Pods directory present). Bundle ID: `com.minhkhoi09012003.unibridge-notify-app`.

## Domain Model (`src/data/types.ts`)

```
Journey
  ├── id, name
  ├── medications: Medication[]
  │     ├── id, name, dosage
  │     └── reminderTimes: string[]  // ISO 24h "HH:MM"
  └── escalationConfig: EscalationConfig
        ├── startGentleSeconds  // delay before first escalation
        ├── stepSeconds         // interval between escalation levels
        └── requirePhotoToStop  // if true, Ignore button is disabled

DoseLog  { medicationId, scheduledTime, actionTakenAt, photoUri?, status }
CarryLog { date: "YYYY-MM-DD", confirmedAt }
```

All data is persisted via `@react-native-async-storage/async-storage` (see `src/data/storage.ts`). `src/data/schedule.ts` contains pure functions that derive `ScheduledDose[]` from a `Journey` + today's `DoseLog[]` — these are the display units consumed by the Home screen.

## Notification → Reminder Flow

The path from a scheduled push notification to the `EscalatingReminder` modal involves three layers:

1. **`src/notifications/notifications.ts`** — Schedules daily `expo-notifications` triggers per medication/time pair. Stores scheduled IDs in AsyncStorage (`medication_notification_ids_v1`) so they can be cancelled before rescheduling. Also handles carry reminders (7pm + 9am daily) and snooze (5-minute `TIME_INTERVAL` trigger). Android channel + iOS notification category with "Open Reminder" / "Remind in 5 min" actions are set up here.

2. **`src/notifications/use-notification-observer.ts`** — `useNotificationObserver()` is called once in `_layout.tsx`. It registers an `addNotificationResponseReceivedListener`, deduplicates responses, handles snooze action, then calls `publishReminderIntent()` and navigates to `/`.

3. **`src/notifications/reminder-intent.ts`** — In-memory pub/sub bus (module-level singleton). `publishReminderIntent()` sets a pending intent and fires all listeners. The Home screen subscribes via `subscribeToReminderIntents()` and opens the `EscalatingReminder` modal when an intent arrives.

## Escalating Reminder System (`src/components/escalating-reminder/`)

The `EscalatingReminder` is a full-screen modal with three severity levels (0=blue, 1=yellow, 2=red) that escalate via timers driven by `EscalationConfig`:

- **`use-escalation.ts`**: Manages chained `setTimeout` timers for level progression, looping `expo-av` sound per level, and pulsing `expo-haptics` at escalating intensity/frequency. `cleanup()` must be called on dismiss to stop audio and clear intervals.
- **`escalation-levels.ts`**: Static config per level — text, colors, sound sources, haptic style.
- **`camera-capture.tsx`**: Full-screen camera view using `expo-camera`.
- **`escalating-reminder.tsx`**: Orchestrates view modes: `reminder → camera → verifying → verification-failed | verification-error → success`. Photo confirmation calls the backend; on failure the user can retake or confirm manually.

## Backend Integration

**`src/services/medication-verification.ts`** sends a base64-encoded photo to:
```
POST https://unibrige-be-production.up.railway.app/verify-medication
Body: { base64Image: string }
Response: { containsMedication: boolean, confidence: "high" | "medium" | "low" }
```
A 15-second `AbortController` timeout is applied. The dose is only logged as `taken` if `containsMedication === true` and `confidence !== 'low'`; otherwise `verification-failed` view is shown.
