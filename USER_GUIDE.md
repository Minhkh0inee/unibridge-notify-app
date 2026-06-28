# User Guide

## Overview

UniBridge Notify helps you track and confirm your daily medications through scheduled reminders, escalating alerts, and AI-powered photo verification.

---

## Home Screen

When you open the app you land on the Home screen. It shows:

- **Daily progress** — a progress ring and count of doses completed vs. total for today
- **Next dose card** — the upcoming medication, its scheduled time, and two actions: **Taken** and **Details**
- **Quick actions** — shortcuts to Add Medication, Scan Prescription, View Schedule, and Carry Reminder
- **Today's dose list** — all medications scheduled for today with their status

---

## Adding a Medication

1. Tap **Add Medication** from the quick actions grid, or tap the **+** button.
2. Fill in the medication details for each drug in the dose:
   - **Name** — e.g. Amoxicillin 500mg
   - **Form** — e.g. Capsule, Tablet, Liquid
   - **Dosage** — e.g. 1 tablet, 5ml
   - **Instructions** — Before meal / After meal / With meal / Before sleep
3. To add more medications taken at the same time, tap **Add medication to dose**.
4. Set which **periods** apply (Morning / Noon / Afternoon / Evening) by toggling the checkboxes. Tap a time badge to adjust the exact hour.
5. Tap **Save dose** to confirm. Notifications will be scheduled automatically.

> You can also tap **Scan Prescription** (top-right of the add screen) to import medication details from a prescription image.

---

## Responding to a Reminder

When a scheduled time arrives, a push notification appears. You can:

| Action | Result |
|--------|--------|
| Tap **Open Reminder** | Opens the full-screen reminder modal |
| Tap **Remind in 5 min** | Snoozes and reschedules in 5 minutes |

### Inside the Reminder Modal

The modal has three escalating urgency levels if left unacknowledged:

| Level | Color | Sound & Haptic |
|-------|-------|----------------|
| 0 | Blue | Gentle sound, light vibration |
| 1 | Yellow | Moderate sound, medium vibration |
| 2 | Red | Urgent sound, strong repeating vibration |

To dismiss the reminder, tap **I've taken it** to proceed to photo verification.

---

## Photo Verification

After tapping **I've taken it**:

1. The camera opens. Point it at your medication (pill, bottle, blister pack).
2. Tap the shutter button to capture.
3. The image is sent to the AI verification backend.
   - If the medication is detected with high or medium confidence → the dose is logged as **taken** and a success screen is shown.
   - If detection fails or confidence is low → a **Verification failed** screen appears. You can **Retake** the photo or **Confirm manually** to log the dose without photo proof.

> If your journey is configured with **Photo required to stop**, the Ignore button is disabled — the only way to dismiss the reminder is through photo verification.

---

## Carry Confirmation

The app sends a reminder at **7 pm** and **9 am** to confirm you have your medication with you. Tap the notification to confirm carry for the day.

---

## Viewing Your Schedule

Tap **View Schedule** from the quick actions or navigate to the **Schedule** tab to see all upcoming and past doses across days.

---

## Insights

The **Insights** tab shows adherence trends and dose history over time.

---

## Test Lab

The Home screen includes a **TEST LAB** panel for verifying notifications work on your device:

| Button | What it does |
|--------|-------------|
| **Open Reminder** | Opens the reminder modal directly without a notification |
| **Test Medication** | Schedules a test notification firing in ~10 seconds |
| **Test Carry** | Schedules a test carry reminder firing in ~10 seconds |

Background the app after scheduling a test notification to see it arrive.
