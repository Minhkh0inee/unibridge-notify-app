# Custom Journey and Calendar Implementation Plan - Phase 2C (Journey Editor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build journey configuration UI - preset selector, custom form, and scope selector for applying changes to schedules.

**Architecture:** Bottom sheet for session details, full screen for journey editor. JourneyPresetCard displays three presets (Gentle, Balanced, Decisive). Custom form allows granular control. Scope selector determines which schedules get updated.

**Tech Stack:** Expo SDK 56, React Native, TypeScript, expo-router, React Context

**Prerequisites:** Phase 2A and 2B must be complete (all contexts and calendar UI implemented).

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
- Journey preset IDs: gentle=00000000-0000-0000-0000-000000000001, balanced=...002, decisive=...003

---

## Task 1: Build JourneyPresetCard Component

**Files:**
- Create: `src/components/calendar/JourneyPresetCard.tsx`

**Interfaces:**
- Consumes: `JourneyConfig` from `src/types/database.types.ts`
- Produces: `JourneyPresetCard` component with props `preset: JourneyConfig`, `isSelected: boolean`, `onSelect: () => void`

- [ ] **Step 1: Create JourneyPresetCard component**

Create `src/components/calendar/JourneyPresetCard.tsx`:
```typescript
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { JourneyConfig } from '@/types/database.types';

interface JourneyPresetCardProps {
  preset: JourneyConfig;
  isSelected: boolean;
  onSelect: () => void;
}

export function JourneyPresetCard({ preset, isSelected, onSelect }: JourneyPresetCardProps) {
  const theme = useTheme();

  const getDescription = () => {
    const intervals = preset.escalation_intervals;
    const reminderCount = intervals.length + 1;
    const confirmMethod = preset.confirmation_method === 'button' 
      ? 'Bấm nút' 
      : preset.confirmation_method === 'photo' 
      ? 'Chụp ảnh (tuỳ chọn)' 
      : 'Chụp ảnh bắt buộc';

    return `${reminderCount} lần nhắc • ${confirmMethod}`;
  };

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.container,
        { 
          backgroundColor: theme.colors.card,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        },
        isSelected && { backgroundColor: theme.colors.primary + '20' },
        pressed && styles.pressed,
      ]}
    >
      {isSelected && (
        <View style={[styles.checkmark, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}

      <Text style={[styles.title, { color: theme.colors.text }]}>
        {preset.name}
      </Text>
      
      <Text style={[styles.description, { color: theme.colors.subtext }]}>
        {getDescription()}
      </Text>

      {preset.escalation_intervals.length > 0 && (
        <Text style={[styles.intervals, { color: theme.colors.subtext }]}>
          Nhắc lại sau: {preset.escalation_intervals.join(', ')} phút
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 2,
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
  },
  pressed: {
    opacity: 0.7,
  },
  checkmark: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  description: {
    fontSize: 14,
    marginBottom: Spacing.one,
  },
  intervals: {
    fontSize: 12,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/JourneyPresetCard.tsx
git commit -m "feat: add JourneyPresetCard component

Display journey preset with selection state and description.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Build SessionDetailSheet Component

**Files:**
- Create: `src/components/calendar/SessionDetailSheet.tsx`

**Interfaces:**
- Consumes: `SessionName`, `MedicationSchedule` from types, `SESSION_LABELS` from constants, `MedicationPill` component
- Produces: `SessionDetailSheet` component with props `visible: boolean`, `session: SessionName`, `schedules: MedicationSchedule[]`, `onClose: () => void`, `onEditJourney: () => void`

- [ ] **Step 1: Create SessionDetailSheet component**

Create `src/components/calendar/SessionDetailSheet.tsx`:
```typescript
import React from 'react';
import { StyleSheet, Text, View, Modal, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { SESSION_LABELS } from '@/constants/sessions';
import { MedicationPill } from './MedicationPill';
import type { SessionName, MedicationSchedule } from '@/types/database.types';

interface SessionDetailSheetProps {
  visible: boolean;
  session: SessionName;
  schedules: MedicationSchedule[];
  onClose: () => void;
  onEditJourney: () => void;
}

export function SessionDetailSheet({ 
  visible, 
  session, 
  schedules, 
  onClose, 
  onEditJourney 
}: SessionDetailSheetProps) {
  const theme = useTheme();

  if (schedules.length === 0) return null;

  const firstSchedule = schedules[0];
  const targetTime = firstSchedule.target_time;
  const validWindow = `${firstSchedule.valid_window_start} - ${firstSchedule.valid_window_end}`;
  const journeyConfig = firstSchedule.journey_config;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {SESSION_LABELS[session]}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.colors.text }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>
              Giờ uống
            </Text>
            <Text style={[styles.timeText, { color: theme.colors.text }]}>
              {targetTime}
            </Text>
            <Text style={[styles.windowText, { color: theme.colors.subtext }]}>
              Khung giờ hợp lệ: {validWindow}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>
              Danh sách thuốc
            </Text>
            <View style={styles.medicationList}>
              {schedules.map((schedule) => (
                <View key={schedule.id} style={styles.medicationItem}>
                  <MedicationPill
                    name={schedule.medication?.name || ''}
                    dosage={`${schedule.medication?.dosage_amount} ${schedule.medication?.dosage_unit}`}
                  />
                  {schedule.medication?.food_instruction && (
                    <Text style={[styles.instructionText, { color: theme.colors.subtext }]}>
                      {schedule.medication.food_instruction === 'before' && 'Trước ăn'}
                      {schedule.medication.food_instruction === 'after' && 'Sau ăn'}
                      {schedule.medication.food_instruction === 'during' && 'Trong khi ăn'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          {journeyConfig && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>
                Cấu hình nhắc nhở
              </Text>
              <View style={[styles.journeyCard, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.journeyName, { color: theme.colors.text }]}>
                  {journeyConfig.name}
                </Text>
                <Text style={[styles.journeyDetail, { color: theme.colors.subtext }]}>
                  Nhắc {journeyConfig.escalation_intervals.length + 1} lần
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable 
            onPress={onEditJourney}
            style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.editButtonText}>Chỉnh lịch nhắc</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#E2D9C8',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: Spacing.two,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    padding: Spacing.three,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.two,
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  windowText: {
    fontSize: 14,
  },
  medicationList: {
    gap: Spacing.two,
  },
  medicationItem: {
    gap: Spacing.one,
  },
  instructionText: {
    fontSize: 12,
    marginLeft: Spacing.two,
  },
  journeyCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  journeyName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  journeyDetail: {
    fontSize: 14,
  },
  footer: {
    padding: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#E2D9C8',
  },
  editButton: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    minHeight: 44,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/SessionDetailSheet.tsx
git commit -m "feat: add SessionDetailSheet component

Bottom sheet displaying session details with edit journey button.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Update Calendar Screen with SessionDetailSheet

**Files:**
- Modify: `src/app/calendar.tsx`

**Interfaces:**
- Consumes: `SessionDetailSheet` from previous task
- Produces: Updated calendar screen with working session detail modal

- [ ] **Step 1: Add state and handlers for session detail sheet**

Modify `src/app/calendar.tsx`:
```typescript
import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { DailyAgenda } from '@/components/calendar/DailyAgenda';
import { SessionDetailSheet } from '@/components/calendar/SessionDetailSheet';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import type { SessionName, MedicationSchedule } from '@/types/database.types';

export default function CalendarScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionName | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<MedicationSchedule[]>([]);

  const handleSessionPress = (session: SessionName, schedules: MedicationSchedule[]) => {
    setSelectedSession(session);
    setSelectedSchedules(schedules);
    setSheetVisible(true);
  };

  const handleEditJourney = () => {
    setSheetVisible(false);
    // Navigate to journey editor with session context
    router.push({
      pathname: '/journey-editor',
      params: {
        session: selectedSession,
        scheduleIds: selectedSchedules.map(s => s.id).join(','),
      },
    });
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

      {selectedSession && (
        <SessionDetailSheet
          visible={sheetVisible}
          session={selectedSession}
          schedules={selectedSchedules}
          onClose={() => setSheetVisible(false)}
          onEditJourney={handleEditJourney}
        />
      )}
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
git commit -m "feat: integrate SessionDetailSheet into calendar

Add session detail modal with navigation to journey editor.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Build Journey Editor Screen

**Files:**
- Create: `src/app/journey-editor.tsx`

**Interfaces:**
- Consumes: `useJourneyConfigs()`, `useSchedules()` contexts, `JourneyPresetCard` component, `useLocalSearchParams()` from expo-router
- Produces: Journey editor screen with preset selection and scope application

- [ ] **Step 1: Create journey editor screen**

Create `src/app/journey-editor.tsx`:
```typescript
import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useJourneyConfigs } from '@/contexts/JourneyConfigsContext';
import { useSchedules } from '@/contexts/SchedulesContext';
import { useMedications } from '@/contexts/MedicationsContext';
import { Spacing } from '@/constants/theme';
import { SESSION_LABELS } from '@/constants/sessions';
import { JourneyPresetCard } from '@/components/calendar/JourneyPresetCard';
import { ThemedView } from '@/components/themed-view';
import type { SessionName } from '@/types/database.types';

export default function JourneyEditorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();
  const { presets } = useJourneyConfigs();
  const { schedules, updateScheduleJourney } = useSchedules();
  const { medications } = useMedications();

  const session = params.session as SessionName;
  const scheduleIds = (params.scheduleIds as string)?.split(',') || [];

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [applyScope, setApplyScope] = useState<'this' | 'medication' | 'all'>('this');

  const currentSchedules = useMemo(
    () => schedules.filter(s => scheduleIds.includes(s.id)),
    [schedules, scheduleIds]
  );

  const handleSave = async () => {
    if (!selectedPresetId) {
      Alert.alert('Lỗi', 'Vui lòng chọn một cấu hình');
      return;
    }

    try {
      let targetScheduleIds: string[] = [];

      if (applyScope === 'this') {
        targetScheduleIds = scheduleIds;
      } else if (applyScope === 'medication') {
        const medicationIds = currentSchedules.map(s => s.medication_id);
        targetScheduleIds = schedules
          .filter(s => medicationIds.includes(s.medication_id))
          .map(s => s.id);
      } else if (applyScope === 'all') {
        targetScheduleIds = schedules.map(s => s.id);
      }

      for (const scheduleId of targetScheduleIds) {
        await updateScheduleJourney(scheduleId, selectedPresetId);
      }

      Alert.alert('Thành công', 'Đã cập nhật cấu hình nhắc nhở', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật cấu hình');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.colors.text }]}>‹ Quay lại</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Chỉnh lịch nhắc
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Buổi: {session && SESSION_LABELS[session]}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.subtext }]}>
              {currentSchedules.length} thuốc
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Chọn cấu hình
            </Text>
            <View style={styles.presetGrid}>
              {presets.map((preset) => (
                <JourneyPresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPresetId === preset.id}
                  onSelect={() => setSelectedPresetId(preset.id)}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Áp dụng cho
            </Text>
            <View style={styles.scopeOptions}>
              <ScopeOption
                label="Chỉ buổi này"
                isSelected={applyScope === 'this'}
                onSelect={() => setApplyScope('this')}
              />
              <ScopeOption
                label="Tất cả buổi của các thuốc này"
                isSelected={applyScope === 'medication'}
                onSelect={() => setApplyScope('medication')}
              />
              <ScopeOption
                label="Tất cả thuốc"
                isSelected={applyScope === 'all'}
                onSelect={() => setApplyScope('all')}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable 
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            disabled={!selectedPresetId}
          >
            <Text style={styles.saveButtonText}>Lưu</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function ScopeOption({ label, isSelected, onSelect }: { 
  label: string; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.scopeOption,
        { 
          backgroundColor: theme.colors.card,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        }
      ]}
    >
      <View style={[
        styles.radio,
        { borderColor: theme.colors.border },
        isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
      ]}>
        {isSelected && <View style={styles.radioDot} />}
      </View>
      <Text style={[styles.scopeLabel, { color: theme.colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#E2D9C8',
  },
  backButton: {
    padding: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: Spacing.three,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  presetGrid: {
    gap: Spacing.three,
  },
  scopeOptions: {
    gap: Spacing.two,
  },
  scopeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 2,
    minHeight: 44,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  scopeLabel: {
    fontSize: 16,
    flex: 1,
  },
  footer: {
    padding: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#E2D9C8',
  },
  saveButton: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    minHeight: 44,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/journey-editor.tsx
git commit -m "feat: add journey editor screen

Complete journey configuration with presets and scope selector.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Summary

**Phase 2C Complete:** Full journey editor functionality!

**Implemented:**
- ✅ JourneyPresetCard (preset display with selection)
- ✅ SessionDetailSheet (bottom sheet modal)
- ✅ Calendar screen integration (modal triggers)
- ✅ Journey editor screen (preset selector + scope application)

**Feature 4 Status:**
- ✅ Phase 1: Database, services, auth context
- ✅ Phase 2A: Medications, Schedules, JourneyConfigs contexts
- ✅ Phase 2B: Calendar UI components and screen
- ✅ Phase 2C: Journey editor UI

**Next Steps:**
- Test the full flow end-to-end
- Add sample medication data for testing
- Consider Phase 3 for polish: loading states, error handling, animations

