Add "Prepare & Carry Medication" feature to the existing codebase.

CONTEXT:

- Journey, Medication, DoseLog types in src/data/types.ts
- getActiveJourney(), logDose() in src/data/storage.ts
- Existing notifications module at src/notifications/notifications.ts
- Theme: Colors, Spacing, FontSizes, Primary from src/constants/theme.ts
- ThemedText, ThemedView available

PART 1 — Add to src/data/types.ts:
Add a new type:
export interface CarryLog {
date: string; // "YYYY-MM-DD"
confirmedAt: string; // ISO 8601
}

Add storage functions to src/data/storage.ts:
export async function saveCarryLog(log: CarryLog): Promise<void>
export async function getTodayCarryLog(): Promise<CarryLog | null>
// key: 'carry_logs'

PART 2 — Create src/components/carry-reminder-card.tsx:
A card component shown on the Dashboard each morning.

LOGIC:

- Receive props: journey: Journey, onConfirmed: () => void
- Calculate "doses to carry today": for each Medication, find reminderTimes
  that fall between 09:00–21:00 (i.e. out-of-home hours, user likely outside)
- If no doses to carry → return null (don't render)
- Check getTodayCarryLog() on mount → if already confirmed today, return null

UI:

- Card with backgroundElement color, rounded corners, Spacing.three padding
- Header: "🎒 Bag Check" in FontSizes.lg, bold
- Subtext: "These doses need to travel with you today:"
- List each medication name + dosage + time for out-of-home doses
- Large confirm button: "✓ Packed in my bag" in Primary color
- On press:
  - saveCarryLog({ date: today, confirmedAt: new Date().toISOString() })
  - call onConfirmed()
  - card animates out (use Animated.timing opacity 0 over 300ms then unmount)

PART 3 — Schedule preparation notifications in src/notifications/notifications.ts:
Add function scheduleCarryReminders(journey: Journey):

- Cancel any existing carry reminder notifications first
  (tag them with identifier prefix 'carry-')
- Schedule recurring daily notification at 21:00:
  identifier: 'carry-evening'
  title: "🌙 Prep for tomorrow"
  body: "Pack your midday meds into your bag tonight so you don't forget!"
  trigger: { hour: 21, minute: 0, repeats: true }
- Schedule recurring daily notification at 07:00:
  identifier: 'carry-morning'  
  title: "☀️ Bag check!"
  body: "Don't forget to pack your meds before you head out today."
  trigger: { hour: 7, minute: 0, repeats: true }
- Call this function from CreateJourneyScreen after saveJourney()

PART 4 — Integrate into Dashboard (src/screens/dashboard.tsx):

- Import CarryReminderCard
- Add state: const [carryConfirmed, setCarryConfirmed] = useState(false)
- Check getTodayCarryLog() on mount → set carryConfirmed if found
- Render CarryReminderCard just below the header, above the medication list:
  {!carryConfirmed && journey && (
  <CarryReminderCard
  journey={journey}
  onConfirmed={() => setCarryConfirmed(true)}
  />
  )}

IMPLEMENTATION NOTES:

- Use useTheme from '@/hooks/use-theme' for colors
- Use Spacing, FontSizes, Primary from '@/constants/theme'
- "Out of home hours" = reminderTimes where time >= "09:00" && time <= "21:00"
- Date helpers: use existing src/utils/date.ts if it has date utilities,
  otherwise use new Date().toISOString().split('T')[0] for today's date string
- No external libraries
- Export default CarryReminderCard
