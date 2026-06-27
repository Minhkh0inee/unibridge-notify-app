# Custom Journey and Calendar Implementation Plan - Phase 2B (UI Layer)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build calendar UI components, screens, and navigation integration for Feature 4.

**Architecture:** React Native components following existing theme patterns. CalendarGrid shows month view with status indicators, DailyAgenda lists sessions with medications, SessionDetailSheet allows journey editing. All wired to contexts from Phase 2A.

**Tech Stack:** Expo SDK 56, React Native, TypeScript, expo-router, existing theme system

**Prerequisites:** Phase 2A must be complete (all contexts implemented and providers integrated).

## Global Constraints

- Expo SDK version: 56.x
- React: 19.2.3
- React Native: 0.85.3
- TypeScript: 6.0.3
- Vietnamese language for user-facing strings
- Minimum touch target: 44x44px per PRD
- Font sizes: 16px minimum for body text, 18-22px for important info
- Follow existing theme system in `src/constants/theme.ts`
- Use path alias `@/*` for `src/*` imports
- Session colors: morning=#FDB44B, noon=#FF8C42, afternoon=#F4A261, evening=#9D84B7, bedtime=#5B7C99

---

## Task 1: Create Session Helper Constants

**Files:**
- Create: `src/constants/sessions.ts`

**Interfaces:**
- Consumes: None
- Produces: `SESSION_COLORS`, `SESSION_LABELS`, `DEFAULT_SESSION_TIMES` constants

- [ ] **Step 1: Create session constants file**

Create `src/constants/sessions.ts`:
```typescript
import type { SessionName } from '@/types/database.types';

export const SESSION_COLORS: Record<SessionName, string> = {
  morning: '#FDB44B',
  noon: '#FF8C42',
  afternoon: '#F4A261',
  evening: '#9D84B7',
  bedtime: '#5B7C99',
};

export const SESSION_LABELS: Record<SessionName, string> = {
  morning: 'Buổi sáng',
  noon: 'Buổi trưa',
  afternoon: 'Buổi chiều',
  evening: 'Buổi tối',
  bedtime: 'Trước khi ngủ',
};

export const DEFAULT_SESSION_TIMES: Record<SessionName, string> = {
  morning: '08:00',
  noon: '12:00',
  afternoon: '17:00',
  evening: '20:00',
  bedtime: '22:30',
};

export const SESSION_ORDER: SessionName[] = ['morning', 'noon', 'afternoon', 'evening', 'bedtime'];
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/sessions.ts
git commit -m "feat: add session helper constants

Define colors, labels, times, and order for medication sessions.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Build MedicationPill Component

**Files:**
- Create: `src/components/calendar/MedicationPill.tsx`

**Interfaces:**
- Consumes: `Medication` type from `src/types/database.types.ts`
- Produces: `MedicationPill` component with props `name: string`, `dosage: string`, `size?: 'small' | 'medium'`

- [ ] **Step 1: Create component directory**

Run:
```bash
mkdir -p src/components/calendar
```

- [ ] **Step 2: Create MedicationPill component**

Create `src/components/calendar/MedicationPill.tsx`:
```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface MedicationPillProps {
  name: string;
  dosage: string;
  size?: 'small' | 'medium';
}

export function MedicationPill({ name, dosage, size = 'medium' }: MedicationPillProps) {
  const theme = useTheme();
  const isSmall = size === 'small';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <Text 
        style={[
          styles.name, 
          { color: theme.colors.text },
          isSmall && styles.nameSmall
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text 
        style={[
          styles.dosage, 
          { color: theme.colors.subtext },
          isSmall && styles.dosageSmall
        ]}
      >
        {dosage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
  nameSmall: {
    fontSize: 12,
  },
  dosage: {
    fontSize: 12,
  },
  dosageSmall: {
    fontSize: 10,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/MedicationPill.tsx
git commit -m "feat: add MedicationPill component

Create compact medication display chip with name and dosage.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Build SessionCard Component

**Files:**
- Create: `src/components/calendar/SessionCard.tsx`

**Interfaces:**
- Consumes: `SessionName` from `src/types/database.types.ts`, `MedicationSchedule` from contexts, `SESSION_COLORS`, `SESSION_LABELS` from `src/constants/sessions.ts`, `MedicationPill` from previous task
- Produces: `SessionCard` component with props `session: SessionName`, `schedules: MedicationSchedule[]`, `onPress: () => void`

- [ ] **Step 1: Create SessionCard component**

Create `src/components/calendar/SessionCard.tsx`:
```typescript
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { SESSION_COLORS, SESSION_LABELS } from '@/constants/sessions';
import { MedicationPill } from './MedicationPill';
import type { SessionName, MedicationSchedule } from '@/types/database.types';

interface SessionCardProps {
  session: SessionName;
  schedules: MedicationSchedule[];
  onPress: () => void;
}

export function SessionCard({ session, schedules, onPress }: SessionCardProps) {
  const theme = useTheme();
  const sessionColor = SESSION_COLORS[session];
  const sessionLabel = SESSION_LABELS[session];

  if (schedules.length === 0) return null;

  const targetTime = schedules[0]?.target_time || '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.colors.card, borderLeftColor: sessionColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.sessionBadge}>
          <Text style={[styles.sessionLabel, { color: sessionColor }]}>
            {sessionLabel}
          </Text>
        </View>
        <Text style={[styles.time, { color: theme.colors.text }]}>
          {targetTime}
        </Text>
      </View>

      <View style={styles.medications}>
        {schedules.map((schedule) => (
          <MedicationPill
            key={schedule.id}
            name={schedule.medication?.name || ''}
            dosage={`${schedule.medication?.dosage_amount} ${schedule.medication?.dosage_unit}`}
            size="small"
          />
        ))}
      </View>

      {schedules[0]?.journey_config && (
        <Text style={[styles.journeyLabel, { color: theme.colors.subtext }]}>
          {schedules[0].journey_config.name}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sessionBadge: {
    flex: 1,
  },
  sessionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    fontSize: 18,
    fontWeight: '700',
  },
  medications: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  journeyLabel: {
    fontSize: 12,
    marginTop: Spacing.one,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/SessionCard.tsx
git commit -m "feat: add SessionCard component

Display session with time, medications, and journey config.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Build DailyAgenda Component

**Files:**
- Create: `src/components/calendar/DailyAgenda.tsx`

**Interfaces:**
- Consumes: `useSchedules()` from contexts, `SESSION_ORDER` from constants, `SessionCard` from previous task
- Produces: `DailyAgenda` component with props `date: Date`, `onSessionPress: (session: SessionName, schedules: MedicationSchedule[]) => void`

- [ ] **Step 1: Create DailyAgenda component**

Create `src/components/calendar/DailyAgenda.tsx`:
```typescript
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSchedules } from '@/contexts/SchedulesContext';
import { Spacing } from '@/constants/theme';
import { SESSION_ORDER, SESSION_LABELS } from '@/constants/sessions';
import { SessionCard } from './SessionCard';
import type { SessionName, MedicationSchedule } from '@/types/database.types';

interface DailyAgendaProps {
  date: Date;
  onSessionPress: (session: SessionName, schedules: MedicationSchedule[]) => void;
}

export function DailyAgenda({ date, onSessionPress }: DailyAgendaProps) {
  const theme = useTheme();
  const { getSchedulesForDate } = useSchedules();

  const schedulesForDate = useMemo(
    () => getSchedulesForDate(date),
    [date, getSchedulesForDate]
  );

  const schedulesBySession = useMemo(() => {
    const grouped: Record<SessionName, MedicationSchedule[]> = {
      morning: [],
      noon: [],
      afternoon: [],
      evening: [],
      bedtime: [],
    };

    schedulesForDate.forEach((schedule) => {
      grouped[schedule.session_name].push(schedule);
    });

    return grouped;
  }, [schedulesForDate]);

  const hasAnySchedules = schedulesForDate.length > 0;

  if (!hasAnySchedules) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.subtext }]}>
          Không có lịch uống thuốc hôm nay
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {SESSION_ORDER.map((session) => {
        const schedules = schedulesBySession[session];
        if (schedules.length === 0) return null;

        return (
          <SessionCard
            key={session}
            session={session}
            schedules={schedules}
            onPress={() => onSessionPress(session, schedules)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/DailyAgenda.tsx
git commit -m "feat: add DailyAgenda component

Display sessions grouped by time with empty state.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Build DayCell Component

**Files:**
- Create: `src/components/calendar/DayCell.tsx`

**Interfaces:**
- Consumes: Theme colors
- Produces: `DayCell` component with props `day: number`, `isToday: boolean`, `isSelected: boolean`, `hasSchedules: boolean`, `isDisabled: boolean`, `onPress: () => void`

- [ ] **Step 1: Create DayCell component**

Create `src/components/calendar/DayCell.tsx`:
```typescript
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface DayCellProps {
  day: number;
  isToday: boolean;
  isSelected: boolean;
  hasSchedules: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

export function DayCell({ 
  day, 
  isToday, 
  isSelected, 
  hasSchedules, 
  isDisabled, 
  onPress 
}: DayCellProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.container,
        isSelected && { backgroundColor: theme.colors.primary },
        isToday && !isSelected && { borderWidth: 2, borderColor: theme.colors.primary },
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.dayText,
          { color: isDisabled ? theme.colors.subtext : theme.colors.text },
          isSelected && { color: '#FFFFFF' },
        ]}
      >
        {day}
      </Text>
      {hasSchedules && !isDisabled && (
        <View style={[styles.indicator, { backgroundColor: isSelected ? '#FFFFFF' : theme.colors.primary }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Spacing.two,
    position: 'relative',
  },
  pressed: {
    opacity: 0.6,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 6,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/DayCell.tsx
git commit -m "feat: add DayCell component

Individual calendar day with selection and schedule indicator.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Build CalendarGrid Component

**Files:**
- Create: `src/components/calendar/CalendarGrid.tsx`

**Interfaces:**
- Consumes: `useSchedules()` from contexts, `DayCell` from previous task
- Produces: `CalendarGrid` component with props `selectedDate: Date`, `onDateSelect: (date: Date) => void`

- [ ] **Step 1: Create CalendarGrid component**

Create `src/components/calendar/CalendarGrid.tsx`:
```typescript
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSchedules } from '@/contexts/SchedulesContext';
import { Spacing } from '@/constants/theme';
import { DayCell } from './DayCell';

interface CalendarGridProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function CalendarGrid({ selectedDate, onDateSelect }: CalendarGridProps) {
  const theme = useTheme();
  const { getSchedulesForDate } = useSchedules();
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const { days, monthLabel } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const monthLabel = new Intl.DateTimeFormat('vi-VN', { 
      month: 'long', 
      year: 'numeric' 
    }).format(currentMonth);

    const daysArray: (Date | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      daysArray.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(new Date(year, month, day));
    }

    return { days: daysArray, monthLabel };
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goToPreviousMonth} style={styles.navButton}>
          <Text style={[styles.navText, { color: theme.colors.text }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.colors.text }]}>
          {monthLabel}
        </Text>
        <Pressable onPress={goToNextMonth} style={styles.navButton}>
          <Text style={[styles.navText, { color: theme.colors.text }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
          <Text key={day} style={[styles.weekdayText, { color: theme.colors.subtext }]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.emptyCell} />;
          }

          const dateStr = date.toDateString();
          const isToday = dateStr === today.toDateString();
          const isSelected = dateStr === selectedDate.toDateString();
          const hasSchedules = getSchedulesForDate(date).length > 0;
          const isDisabled = false;

          return (
            <DayCell
              key={date.getTime()}
              day={date.getDate()}
              isToday={isToday}
              isSelected={isSelected}
              hasSchedules={hasSchedules}
              isDisabled={isDisabled}
              onPress={() => onDateSelect(date)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  navButton: {
    padding: Spacing.two,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    fontSize: 28,
    fontWeight: '300',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.two,
  },
  weekdayText: {
    width: 44,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  emptyCell: {
    width: 44,
    height: 44,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/CalendarGrid.tsx
git commit -m "feat: add CalendarGrid component

Month view calendar with navigation and schedule indicators.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Build Calendar Screen

**Files:**
- Create: `src/app/calendar.tsx`

**Interfaces:**
- Consumes: `CalendarGrid`, `DailyAgenda` components, `useAuth()` context
- Produces: Calendar screen with month view and daily agenda

- [ ] **Step 1: Create calendar screen**

Create `src/app/calendar.tsx`:
```typescript
import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { DailyAgenda } from '@/components/calendar/DailyAgenda';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import type { SessionName, MedicationSchedule } from '@/types/database.types';

export default function CalendarScreen() {
  const { user, isLoading: authLoading, signInAnonymously } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleSessionPress = (session: SessionName, schedules: MedicationSchedule[]) => {
    console.log('Session pressed:', session, schedules);
    // TODO: Open SessionDetailSheet (Phase 2C)
  };

  if (authLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={styles.messageText}>
          Đang kết nối...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CalendarGrid
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
        
        <View style={styles.divider} />
        
        <DailyAgenda
          date={selectedDate}
          onSessionPress={handleSessionPress}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingBottom: BottomTabInset,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2D9C8',
    marginVertical: Spacing.two,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/calendar.tsx
git commit -m "feat: add calendar screen

Combine CalendarGrid and DailyAgenda with auth check.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Add Calendar Tab to Navigation

**Files:**
- Modify: `src/components/app-tabs.tsx`

**Interfaces:**
- Consumes: Calendar screen from previous task
- Produces: Tab navigation with Calendar tab added

- [ ] **Step 1: Read current app-tabs file**

Run:
```bash
cat src/components/app-tabs.tsx
```

Expected: See current tab structure

- [ ] **Step 2: Add calendar tab**

Modify `src/components/app-tabs.tsx` to add Calendar tab between Home and Explore:

```typescript
// Add calendar import at top
import Calendar from '@/app/calendar';

// In the tabs configuration, add:
<NativeTabs.Screen
  name="calendar"
  options={{
    title: 'Lịch thuốc',
    tabBarIcon: ({ color }) => (
      <TabBarIcon name="calendar-outline" color={color} />
    ),
  }}
>
  {() => <Calendar />}
</NativeTabs.Screen>
```

Note: Exact integration depends on existing tab structure. Place between index and explore tabs.

- [ ] **Step 3: Commit**

```bash
git add src/components/app-tabs.tsx
git commit -m "feat: add calendar tab to navigation

Add Lịch thuốc tab between Home and Explore.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Summary

**Phase 2B Complete:** Calendar UI fully functional!

**Implemented:**
- ✅ Session constants and helpers
- ✅ MedicationPill, SessionCard, DailyAgenda components
- ✅ DayCell, CalendarGrid components  
- ✅ Calendar screen with month view and daily agenda
- ✅ Navigation integration (Calendar tab)

**Still Needed - Phase 2C (Journey Editor):**
- SessionDetailSheet (bottom sheet modal)
- JourneyPresetCard components
- JourneyConfigForm component
- Journey editor screen
- Scope selector for applying journey changes

**Current Status:** Users can now view calendar, see schedules by day/session. Next phase adds journey customization UI.

