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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {SESSION_LABELS[session]}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>
              Giờ uống
            </Text>
            <Text style={[styles.timeText, { color: theme.text }]}>
              {targetTime}
            </Text>
            <Text style={[styles.windowText, { color: theme.subtext }]}>
              Khung giờ hợp lệ: {validWindow}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>
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
                    <Text style={[styles.instructionText, { color: theme.subtext }]}>
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
              <Text style={[styles.sectionLabel, { color: theme.subtext }]}>
                Cấu hình nhắc nhở
              </Text>
              <View style={[styles.journeyCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.journeyName, { color: theme.text }]}>
                  {journeyConfig.name}
                </Text>
                <Text style={[styles.journeyDetail, { color: theme.subtext }]}>
                  Nhắc {journeyConfig.escalation_intervals.length + 1} lần
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={onEditJourney}
            style={[styles.editButton, { backgroundColor: theme.primary }]}
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
