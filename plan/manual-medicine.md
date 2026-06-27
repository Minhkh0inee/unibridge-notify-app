You are working on a React Native + Expo project (TypeScript).
Same codebase context as above (types, storage, theme).

TASK: Create src/screens/create-journey.tsx — a form screen to manually
create a Journey and save it as the active journey.

FORM STRUCTURE (multi-step, 3 steps):

STEP 1 — Journey Info:

- Text input: Journey name (e.g. "HP Treatment", "Asthma")
- Number input: Duration in days (default 14)
- Escalation config toggles:
  - "Require photo to stop reminder" → boolean toggle (default true)
  - "Escalation interval" → segmented options: 1 min / 3 min / 5 min
    (maps to startGentleSeconds: 60/180/300, stepSeconds: same value)
- Next button → goes to Step 2

STEP 2 — Add Medications:

- Show list of medications added so far (starts empty)
- "Add Medication" button → opens an inline form:
  - Text input: medication name
  - Text input: dosage (e.g. "500mg", "1 tablet")
  - Add reminder times: a "+" button adds a time slot
    - Each time slot shows a time picker (use @react-native-community/datetimepicker
      if available, otherwise a simple HH:MM text input)
    - Each time slot has a delete "×" button
  - "Save Medication" button → adds to list, closes inline form
- Each medication card in the list shows name, dosage, times, with a delete button
- Validation: at least 1 medication required to proceed
- Next button → goes to Step 3

STEP 3 — Review & Confirm:

- Show summary of everything:
  - Journey name + duration
  - Escalation settings
  - List of all medications with their reminder times
- "Start Journey" button:
  - Generates UUIDs for journey.id and each medication.id
    (use Math.random().toString(36) if no uuid library)
  - Calls saveJourney(journey) from storage
  - Schedules notifications for each reminderTime using the existing
    notifications module at src/notifications/notifications.ts
  - Navigates back to Dashboard (use router.replace('/') from expo-router)
- "Back" button → goes back to Step 2

NAVIGATION BETWEEN STEPS:

- Show step indicator at top: "Step 1 of 3", "Step 2 of 3", "Step 3 of 3"
- Hardware back button / swipe back → goes to previous step (not previous screen)
- Handle with useState for currentStep

IMPLEMENTATION NOTES:

- Use useTheme from '@/hooks/use-theme' for colors
- Use Spacing, FontSizes, Primary, BottomTabInset from '@/constants/theme'
- KeyboardAvoidingView wrapping the form (behavior='padding' on iOS)
- ScrollView inside each step
- Validate before allowing Next:
  - Step 1: journey name not empty
  - Step 2: at least 1 medication, each medication has name + at least 1 reminder time
- Show validation errors inline (red text below the relevant input)
- No external form libraries — plain useState only
- Export default CreateJourneyScreen
