# Architecture

## Overview

UniBridge Notify is an **Expo SDK 54** app using **expo-router** for file-based routing. All source lives in `src/`, with routes under `src/app/`. The entry point is `expo-router/entry` (set in `package.json`).

Web output is **static** (`"output": "static"` in `app.json`). Native iOS project is pre-generated under `ios/`.

---

## Directory Structure

```
src/
├── app/                      # Routes (expo-router file-based)
│   ├── _layout.tsx           # Root layout
│   ├── index.tsx             # Home screen (tab)
│   ├── explore.tsx           # Schedule/calendar screen (tab)
│   ├── insights.tsx          # Insights screen (tab)
│   ├── add.tsx               # Add medication screen
│   └── scan.tsx              # Scan prescription screen
│
├── components/
│   ├── escalating-reminder/  # Full-screen reminder modal system
│   │   ├── escalating-reminder.tsx   # Orchestrator (view state machine)
│   │   ├── use-escalation.ts         # Timer, audio, haptic management
│   │   ├── escalation-levels.ts      # Per-level static config
│   │   ├── camera-capture.tsx        # Camera view
│   │   └── index.ts
│   ├── app-tabs.tsx          # Native tab bar (iOS/Android)
│   ├── app-tabs.web.tsx      # Web-specific tab bar override
│   ├── medication-card.tsx   # Dose status card
│   ├── carry-reminder-card.tsx
│   ├── progress-ring.tsx
│   ├── mascot.tsx
│   └── themed-text.tsx / themed-view.tsx
│
├── data/
│   ├── types.ts              # Domain types
│   ├── storage.ts            # AsyncStorage persistence
│   ├── supabase-storage.ts   # Supabase queries
│   ├── schedule.ts           # Pure functions: Journey + logs → ScheduledDose[]
│   └── calendar.ts           # Calendar/agenda helpers
│
├── notifications/
│   ├── notifications.ts              # Schedule/cancel triggers
│   ├── use-notification-observer.ts  # Response listener
│   └── reminder-intent.ts            # In-memory pub/sub bus
│
├── services/
│   └── medication-verification.ts    # AI photo verification API call
│
├── hooks/
│   ├── use-theme.ts          # Active color set
│   ├── use-active-journey.ts # Journey + logs loader
│   ├── use-calendar.ts       # Week/agenda state
│   └── use-color-scheme.ts   # Platform-specific (.web.ts override)
│
├── lib/
│   └── auth.ts               # Supabase anonymous session
│
└── constants/
    └── theme.ts              # Colors, Fonts, Spacing tokens + global CSS import
```

---

## Screens

| Route | Screen | Description |
|---|---|---|
| `/` | Home | Progress ring, next dose card, today's dose list, Test Lab |
| `/explore` | Schedule | Weekly calendar + period cards (Morning/Noon/Afternoon/Evening/Bedtime) |
| `/insights` | Insights | Weekly adherence stats, bar chart, smart tip |
| `/add` | Add Medication | Multi-medication form with period schedule picker |
| `/scan` | Scan Prescription | Camera-based prescription import |

---

## Domain Model

```
Journey
├── id, name
├── medications: Medication[]
│     ├── id, name, dosage
│     └── reminderTimes: string[]   // "HH:MM" (24h)
└── escalationConfig: EscalationConfig
      ├── startGentleSeconds        // delay before first escalation
      ├── stepSeconds               // interval between levels
      └── requirePhotoToStop        // disables Ignore button when true

DoseLog  { medicationId, scheduledTime, actionTakenAt, photoUri?, status }
CarryLog { date: "YYYY-MM-DD", confirmedAt }
```

`src/data/schedule.ts` derives `ScheduledDose[]` from a `Journey` + today's `DoseLog[]`. These are the display units consumed by the Home and Schedule screens.

---

## Data Flow

```
Supabase (remote)
  └── supabase-storage.ts     read/write journeys, medications, dose events

AsyncStorage (local)
  └── storage.ts              notification IDs, dose logs, carry logs

Both feeds into:
  └── use-active-journey.ts   → journey + logs
        └── schedule.ts       → ScheduledDose[]
              └── HomeScreen, ScheduleScreen
```

---

## Notification → Reminder Flow

```
1. notifications.ts
   Schedules daily expo-notifications triggers per medication/time.
   Stores scheduled IDs in AsyncStorage under "medication_notification_ids_v1".
   Also schedules carry reminders (7pm + 9am) and snooze (5-min interval).
   Sets up Android channel and iOS category with two actions:
     - "Open Reminder" → deep link
     - "Remind in 5 min" → snooze action identifier

2. use-notification-observer.ts  (mounted once in _layout.tsx)
   Registers addNotificationResponseReceivedListener.
   Deduplicates responses by notificationId.
   Handles snooze action inline.
   Calls publishReminderIntent() then navigates to /.

3. reminder-intent.ts  (module-level singleton)
   In-memory pub/sub: publishReminderIntent() sets a pending intent
   and fires all subscribers. HomeScreen subscribes via
   subscribeToReminderIntents() and opens EscalatingReminder on arrival.
```

---

## Escalating Reminder State Machine

```
reminder
  │  user taps "I've taken it"
  ▼
camera
  │  photo captured
  ▼
verifying
  ├── containsMedication && confidence !== 'low'  →  success
  ├── !containsMedication || confidence === 'low'  →  verification-failed
  └── network/timeout error  →  verification-error

verification-failed / verification-error
  ├── "Retake"  →  camera
  └── "Confirm manually"  →  success (logged without photo proof)
```

Escalation levels progress via chained `setTimeout` timers in `use-escalation.ts`:

| Level | Color | Audio | Haptic |
|---|---|---|---|
| 0 | Blue | Gentle loop | Light |
| 1 | Yellow | Moderate loop | Medium |
| 2 | Red | Urgent loop | Heavy repeating |

`cleanup()` must be called on dismiss to stop audio and clear timers.

---

## Theming

`src/constants/theme.ts` is the single source of truth for:
- `Colors` — light/dark token map
- `Fonts` — platform-specific font stacks (sans, mono)
- `Spacing` — named numeric scale
- Layout constants: `BottomTabInset`, `MaxContentWidth`, `MobileFrameWidth`

`useTheme()` in `src/hooks/use-theme.ts` returns the active color set based on system color scheme.

Platform-specific overrides use `.web.ts` / `.ts` file pairs (e.g., `use-color-scheme.web.ts`).

---

## Backend Integration

```
POST https://unibrige-be-production.up.railway.app/verify-medication
Body:     { base64Image: string }
Response: { containsMedication: boolean, confidence: "high" | "medium" | "low" }
Timeout:  15 seconds (AbortController)
```

Supabase is used for persistent storage of journeys, medications, and dose schedules. Anonymous sessions are provisioned on first launch via `src/lib/auth.ts`.

---

## Experiments Enabled

Configured in `app.json` under `"experiments"`:

| Flag | Effect |
|---|---|
| `typedRoutes` | Type-safe `href` props via expo-router |
| `reactCompiler` | React 19 compiler (auto-memoization) |

---

## Path Aliases

Configured in `tsconfig.json`:

```
@/*        → src/*
@/assets/* → assets/*
```
