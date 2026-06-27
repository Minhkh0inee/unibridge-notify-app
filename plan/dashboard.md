You are working on a React Native + Expo project (TypeScript).
Here is the existing codebase context:

FILE: src/data/types.ts

- DoseStatus = 'taken' | 'ignored' | 'pending'
- Medication: { id, name, dosage, reminderTimes: string[] (e.g. ["08:00","20:00"]) }
- Journey: { id, name, medications: Medication[], escalationConfig: EscalationConfig }
- DoseLog: { medicationId, scheduledTime, actionTakenAt, photoUri?, status }

FILE: src/data/storage.ts

- getActiveJourney(): Promise<Journey | null>
- getWeeklyLogs(): Promise<DoseLog[]>
- logDose(log: DoseLog): Promise<void>

FILE: src/constants/theme.ts

- Colors.light / Colors.dark (text, background, backgroundElement, backgroundSelected, textSecondary)
- Primary = '#208AEF'
- Spacing: { half:2, one:4, two:8, three:16, four:24, five:32, six:64 }
- FontSizes: { xs:10, sm:12, md:14, lg:16, xl:20, xxl:24 }
- BottomTabInset: ios=50, android=80

EXISTING COMPONENTS available to import:

- ThemedText from '@/components/themed-text'
- ThemedView from '@/components/themed-view'

TASK: Create src/screens/dashboard.tsx — a Dashboard screen with:

1. HEADER
   - Show active Journey name (e.g. "HP Treatment")
   - Show progress: "Day X / 14" — calculate X as number of unique days
     that have at least 1 DoseLog with status="taken", based on getWeeklyLogs()
   - Show streak: consecutive days with all doses taken (🔥 N days)

2. TODAY'S MEDICATION LIST
   - For each Medication in the active Journey, show a card with:
     - Medication name + dosage
     - Each reminderTime listed as a row
     - Status badge per time slot:
       - "taken" → green badge ✓
       - "ignored" → red badge ✗
       - "pending" → grey badge (upcoming or missed based on current time)
     - If current time has passed the reminderTime and status is still pending
       → show as "missed" (orange badge)
   - Match DoseLog to Medication by: medicationId === medication.id
     AND scheduledTime === reminderTime AND actionTakenAt date === today

3. KILL THE BACTERIA PROGRESS BAR
   - Total doses today = sum of all reminderTimes across all medications
   - Completed doses today = DoseLogs today with status="taken"
   - Progress = completed / total (0.0 to 1.0)
   - Show as a horizontal bar, color Primary (#208AEF) fill on grey background
   - Label: "X of Y doses completed today"
   - Add a small mascot emoji that changes:
     0–33% = 😰, 34–66% = 😐, 67–99% = 💪, 100% = 🎉

4. TEST BUTTON (for demo only)
   - A button at the bottom "🔔 Test Reminder" that navigates to
     the EscalatingReminder screen
   - Import EscalatingReminder from '@/components/escalating-reminder'

IMPLEMENTATION NOTES:

- Use useEffect + useState to load data from getActiveJourney() and getWeeklyLogs()
- Use useCallback + useFocusEffect (from expo-router) to refresh on screen focus
- Use useTheme from '@/hooks/use-theme' for colors
- Use Spacing, FontSizes, Primary, BottomTabInset from '@/constants/theme'
- ScrollView with paddingBottom = BottomTabInset
- No external UI libraries — plain StyleSheet only
- Handle loading state (show ActivityIndicator while fetching)
- Handle empty state (no active journey → show "No active journey. Create one below.")
- Export default DashboardScreen
