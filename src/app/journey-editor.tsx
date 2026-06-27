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

function ScopeOption({
  label,
  isSelected,
  onSelect
}: {
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
