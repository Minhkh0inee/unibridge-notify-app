# UniBridge Notify

A medication adherence app built with Expo that uses escalating notifications and AI-powered photo verification to ensure medications are never missed.

---

## Problem Statement

Medication non-adherence is one of the most persistent challenges in chronic illness management. Patients forget doses, dismiss reminders too easily, or have no accountable way to confirm they actually took their medication — not just silenced an alert. Caregivers and clinicians have limited visibility into real-time adherence, and standard reminder apps treat a dismissed notification the same as a taken dose.

---

## Solution Overview

UniBridge Notify replaces passive reminders with an **escalating accountability loop**:

1. A push notification fires at the scheduled medication time.
2. If the user doesn't respond, the reminder escalates in urgency — changing color, intensifying sound, and increasing haptic feedback across three severity levels.
3. To dismiss the reminder, the user takes a **photo of their medication**. An AI backend verifies the image contains the correct medication before logging the dose as taken.
4. If photo verification is required (`requirePhotoToStop`), the Ignore button is disabled — the only way out is proof.
5. All dose outcomes (taken, skipped, photo URI) are stored locally and surfaced on the Home screen.

This creates a closed loop: notify → escalate → verify → log.

---

## Features

- **Scheduled Medication Reminders** — Daily push notifications per medication/time pair, scoped to a named Journey
- **Escalating Urgency** — Three-level escalation (blue → yellow → red) with progressively louder sound and stronger haptics
- **Snooze** — "Remind in 5 min" action available directly from the notification
- **AI Photo Verification** — Camera capture sent to a vision backend; dose only logged as `taken` on high/medium confidence match
- **Carry Confirmation** — 7pm + 9am daily reminders to confirm medication is physically on hand
- **Dose History** — Full log of taken/skipped doses with timestamps and optional photo proof
- **Journey Management** — Group medications under a configurable journey with per-journey escalation settings
- **Configurable Escalation** — Set delay before first escalation, step interval between levels, and whether photo is required to dismiss
- **Cross-platform** — iOS, Android, and web (static export)

---

## Documentation

| File | Contents |
|---|---|
| [SETUP.md](./SETUP.md) | Installation, environment variables, iOS pod setup |
| [RUN.md](./RUN.md) | Dev server commands, platform-specific run notes |
| [USER_GUIDE.md](./USER_GUIDE.md) | How to use the app — screens, reminders, photo verification |
| [TECH_STACK.md](./TECH_STACK.md) | Full library list with versions and purpose |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Directory structure, data flow, notification pipeline, state machines |
