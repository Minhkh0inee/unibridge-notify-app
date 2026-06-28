import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { BottomTabInset, Fonts, MobileFrameWidth } from '@/constants/theme';
import {
  createDoseMedicationsWithSchedules,
  getActiveJourneys,
} from '@/data/supabase-storage';
import { useTheme } from '@/hooks/use-theme';
import { ensureAnonymousSession } from '@/lib/auth';

type SchedulePeriod = 'morning' | 'noon' | 'afternoon' | 'evening';

interface DraftMedication {
  id: string;
  name: string;
  formType: string;
  dosage: string;
  instruction: string;
}

const instructions = ['Trước ăn', 'Sau ăn', 'Cùng bữa ăn', 'Trước khi ngủ'];

function createEmptyMedication(id: string): DraftMedication {
  return {
    id,
    name: '',
    formType: 'Viên nang',
    dosage: '1 viên',
    instruction: 'Sau ăn',
  };
}

function timeStringToDate(value: string): Date {
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function dateToTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getTimeWindow(value: string): { start: string; end: string } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;

  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (minutes === 0 || minutes === 23 * 60 + 59) return null;

  const formatMinutes = (total: number) =>
    `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

  return {
    start: formatMinutes(Math.max(0, minutes - 60)),
    end: formatMinutes(Math.min(23 * 60 + 59, minutes + 60)),
  };
}

export default function AddMedicationScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [medications, setMedications] = useState<DraftMedication[]>([
    {
      ...createEmptyMedication('medication-1'),
      name: 'Amoxicillin 500mg',
    },
  ]);
  const [morningTime, setMorningTime] = useState('08:00');
  const [noonTime, setNoonTime] = useState('12:00');
  const [afternoonTime, setAfternoonTime] = useState('15:00');
  const [eveningTime, setEveningTime] = useState('20:00');
  const [enabledPeriods, setEnabledPeriods] = useState<Record<SchedulePeriod, boolean>>({
    morning: true,
    noon: true,
    afternoon: true,
    evening: true,
  });
  const [selectedPeriod, setSelectedPeriod] = useState<SchedulePeriod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeOptions: {
    period: SchedulePeriod;
    label: string;
    value: string;
    setValue: (value: string) => void;
  }[] = [
    { period: 'morning', label: 'Sáng', value: morningTime, setValue: setMorningTime },
    { period: 'noon', label: 'Trưa', value: noonTime, setValue: setNoonTime },
    {
      period: 'afternoon',
      label: 'Chiều',
      value: afternoonTime,
      setValue: setAfternoonTime,
    },
    { period: 'evening', label: 'Tối', value: eveningTime, setValue: setEveningTime },
  ];
  const activeTimeOption = timeOptions.find((item) => item.period === selectedPeriod);

  function updateMedication(id: string, updates: Partial<DraftMedication>) {
    setMedications((current) =>
      current.map((medication) =>
        medication.id === id ? { ...medication, ...updates } : medication
      )
    );
  }

  function addMedication() {
    setMedications((current) => [
      ...current,
      createEmptyMedication(`medication-${Date.now()}`),
    ]);
  }

  function removeMedication(id: string) {
    setMedications((current) => current.filter((medication) => medication.id !== id));
  }

  function togglePeriod(period: SchedulePeriod) {
    setEnabledPeriods((current) => ({
      ...current,
      [period]: !current[period],
    }));
    if (selectedPeriod === period) {
      setSelectedPeriod(null);
    }
  }

  function handleTimeChange(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'dismissed') {
      setSelectedPeriod(null);
      return;
    }

    if (date && activeTimeOption) {
      activeTimeOption.setValue(dateToTimeString(date));
    }

    if (Platform.OS === 'android') {
      setSelectedPeriod(null);
    }
  }

  const handleContinue = async () => {
    if (isSubmitting) return;

    const invalidMedicationIndex = medications.findIndex(
      (medication) => !medication.name.trim() || !medication.dosage.trim()
    );
    if (invalidMedicationIndex >= 0) {
      Alert.alert(
        'Thiếu thông tin',
        `Vui lòng nhập tên thuốc và số lượng cho thuốc ${invalidMedicationIndex + 1}.`
      );
      return;
    }

    const allTimeEntries: {
      period: SchedulePeriod;
      label: string;
      value: string;
    }[] = [
      { period: 'morning', label: 'Sáng', value: morningTime },
      { period: 'noon', label: 'Trưa', value: noonTime },
      { period: 'afternoon', label: 'Chiều', value: afternoonTime },
      { period: 'evening', label: 'Tối', value: eveningTime },
    ];
    const timeEntries = allTimeEntries.filter(
      (entry) => enabledPeriods[entry.period]
    );
    if (timeEntries.length === 0) {
      Alert.alert('Chưa chọn cữ uống', 'Vui lòng chọn ít nhất một buổi để đặt lịch.');
      return;
    }
    const invalidTime = timeEntries.find((entry) => !getTimeWindow(entry.value));
    if (invalidTime) {
      Alert.alert(
        'Giờ chưa hợp lệ',
        `Giờ ${invalidTime.label.toLowerCase()} cần có định dạng HH:MM và nằm trong khoảng 00:01–23:58.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await ensureAnonymousSession();
      if (!session.success || !session.userId) {
        throw new Error(session.error ?? 'Không thể xác thực người dùng.');
      }

      const journeys = await getActiveJourneys();
      const journey = journeys[0];
      if (!journey) {
        throw new Error('Bạn chưa có hành trình điều trị đang hoạt động.');
      }

      await createDoseMedicationsWithSchedules({
        userId: session.userId,
        journeyId: journey.id,
        medications: medications.map((medication) => ({
          name: medication.name.trim(),
          dosage: medication.dosage.trim(),
          instructions: medication.instruction,
        })),
        schedules: timeEntries.map((entry) => {
          const window = getTimeWindow(entry.value);
          if (!window) throw new Error(`Giờ ${entry.label.toLowerCase()} không hợp lệ.`);
          return {
            period: entry.period,
            targetTime: entry.value.trim(),
            windowStart: window.start,
            windowEnd: window.end,
          };
        }),
      });

      Alert.alert(
        'Đã tạo lịch cho liều thuốc',
        `${medications.length} loại thuốc đã được thêm vào cùng các cữ uống.`,
        [{ text: 'Xong', onPress: () => router.back() }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu thuốc.';
      Alert.alert('Lưu thất bại', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16) + 12, paddingBottom: insets.bottom + BottomTabInset + 132 },
      ]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <AppIcon name="back" color={theme.text} size={16} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Thông tin thuốc</Text>
        </View>
        <Pressable onPress={() => router.push('/scan')} style={styles.scanLink}>
          <AppIcon name="scan" color={theme.primary} size={15} />
          <Text style={[styles.scanText, { color: theme.primary }]}>Quét đơn</Text>
        </Pressable>
      </View>

      <View style={styles.progressRow}>
        {[0, 1, 2, 3, 4].map((step) => (
          <View key={step} style={[styles.progressStep, { backgroundColor: step === 0 ? theme.primary : theme.border }]} />
        ))}
      </View>

      <View style={[styles.callout, { backgroundColor: theme.primarySoft, borderColor: `${theme.primary}22` }]}>
        <View style={[styles.calloutIcon, { backgroundColor: theme.primary }]}>
          <AppIcon name="pill" color={theme.primaryForeground} size={20} />
        </View>
        <Text style={[styles.calloutText, { color: theme.text }]}>
          Ghi chú lại thuốc để Mèo nhắc bạn đúng giờ nha.
        </Text>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Thuốc trong liều</Text>
          <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>
            {medications.length} loại thuốc uống cùng cữ
          </Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.countText, { color: theme.primary }]}>{medications.length}</Text>
        </View>
      </View>

      <View style={styles.medicationList}>
        {medications.map((medication, index) => (
          <View
            key={medication.id}
            style={[
              styles.medicationCard,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <View style={styles.medicationCardHeader}>
              <View style={[styles.medicationNumber, { backgroundColor: theme.primary }]}>
                <Text style={[styles.medicationNumberText, { color: theme.primaryForeground }]}>
                  {index + 1}
                </Text>
              </View>
              <Text style={[styles.medicationCardTitle, { color: theme.text }]}>
                Thuốc {index + 1}
              </Text>
              {medications.length > 1 && (
                <Pressable
                  accessibilityLabel={`Xóa thuốc ${index + 1}`}
                  onPress={() => removeMedication(medication.id)}
                  style={[styles.removeButton, { borderColor: theme.border }]}>
                  <Text style={[styles.removeButtonText, { color: theme.textSecondary }]}>Xóa</Text>
                </Pressable>
              )}
            </View>

            <Field label="Tên thuốc">
              <TextInput
                value={medication.name}
                onChangeText={(name) => updateMedication(medication.id, { name })}
                placeholder="VD: Amoxicillin 500mg"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
              />
            </Field>

      <View style={styles.twoCols}>
        <Field label="Dạng thuốc">
          <TextInput
            value={formType}
            onChangeText={setFormType}
            placeholder="VD: Viên nang"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
          />
        </Field>
        <Field label="Liều lượng">
          <TextInput
            value={dosage}
            onChangeText={setDosage}
            placeholder="VD: 1 viên"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
          />
        </Field>
      </View>

      <Field label="Cách uống">
        <View style={styles.chips}>
          {instructions.map((chip) => {
            const isSelected = selectedInstruction === chip;
            return (
              <Pressable
                key={chip}
                onPress={() => setSelectedInstruction(chip)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.text : theme.backgroundElement,
                    borderColor: isSelected ? theme.text : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: isSelected ? theme.background : theme.text }]}>{chip}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Giờ uống">
        <View style={[styles.timeList, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {timeOptions.map((option, index) => {
            const isEnabled = enabledPeriods[option.period];
            return (
            <View
              key={option.period}
              style={[
                styles.timeRow,
                index > 0 && { borderTopColor: theme.border, borderTopWidth: 1 },
                !isEnabled && styles.timeRowDisabled,
              ]}>
              <Pressable
                accessibilityLabel={`${isEnabled ? 'Bỏ chọn' : 'Chọn'} buổi ${option.label.toLowerCase()}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isEnabled }}
                onPress={() => togglePeriod(option.period)}
                style={styles.periodToggleArea}>
                <View
                  style={[
                    styles.periodCheckbox,
                    {
                      backgroundColor: isEnabled ? theme.primary : 'transparent',
                      borderColor: isEnabled ? theme.primary : theme.border,
                    },
                  ]}>
                  {isEnabled && (
                    <AppIcon name="check" color={theme.primaryForeground} size={13} />
                  )}
                </View>
                <AppIcon
                  name="clock"
                  color={isEnabled ? theme.primary : theme.textSecondary}
                  size={16}
                />
                <Text
                  style={[
                    styles.timeText,
                    { color: isEnabled ? theme.text : theme.textSecondary },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Chọn giờ buổi ${option.label.toLowerCase()}`}
                accessibilityRole="button"
                disabled={!isEnabled}
                onPress={() => setSelectedPeriod(option.period)}
                style={({ pressed }) => [
                  styles.timeBadge,
                  {
                    backgroundColor: isEnabled ? theme.primarySoft : theme.background,
                    borderColor: isEnabled ? `${theme.primary}33` : theme.border,
                  },
                  pressed && styles.timeRowPressed,
                ]}>
                <Text
                  style={[
                    styles.timeValue,
                    { color: isEnabled ? theme.primary : theme.textSecondary },
                  ]}>
                  {option.value}
                </Text>
              </Pressable>
            </View>
          )})}
          {activeTimeOption && (
            <View style={[styles.pickerPanel, { borderTopColor: theme.border }]}>
              <DateTimePicker
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour
                locale="vi-VN"
                mode="time"
                onChange={handleTimeChange}
                value={timeStringToDate(activeTimeOption.value)}
              />
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={() => setSelectedPeriod(null)}
                  style={[styles.pickerDone, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.pickerDoneText, { color: theme.primaryForeground }]}>
                    Xong
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Field>

      <Pressable
        disabled={isSubmitting}
        onPress={handleContinue}
        style={[
          styles.saveButton,
          { backgroundColor: theme.text },
          isSubmitting && styles.saveButtonDisabled,
        ]}>
        {isSubmitting ? (
          <ActivityIndicator color={theme.background} />
        ) : (
          <Text style={[styles.saveText, { color: theme.background }]}>
            Lưu liều thuốc
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    alignSelf: 'center',
    maxWidth: MobileFrameWidth,
    paddingHorizontal: 20,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  back: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 2,
  },
  scanLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  scanText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 22,
    marginTop: 16,
  },
  progressStep: {
    borderRadius: 4,
    flex: 1,
    height: 6,
  },
  callout: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    padding: 16,
  },
  calloutIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  calloutText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  field: {
    gap: 8,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 50,
    paddingHorizontal: 15,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionCaption: {
    fontSize: 11,
    marginTop: 2,
  },
  countBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    minWidth: 30,
  },
  countText: {
    fontSize: 13,
    fontWeight: '800',
  },
  medicationList: {
    gap: 12,
  },
  medicationCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  medicationCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  medicationNumber: {
    alignItems: 'center',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  medicationNumberText: {
    fontSize: 12,
    fontWeight: '900',
  },
  medicationCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 9,
  },
  removeButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  removeButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  twoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addMedicationButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 12,
    paddingVertical: 14,
  },
  addMedicationText: {
    fontSize: 13,
    fontWeight: '800',
  },
  timeList: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  periodHint: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  timeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    padding: 15,
  },
  timeRowDisabled: {
    opacity: 0.55,
  },
  timeRowPressed: {
    opacity: 0.65,
  },
  periodToggleArea: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  periodCheckbox: {
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeValue: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '800',
  },
  timeBadge: {
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickerPanel: {
    alignItems: 'center',
    borderTopWidth: 1,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  pickerDone: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 12,
    paddingVertical: 11,
  },
  pickerDoneText: {
    fontSize: 14,
    fontWeight: '800',
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 16,
    minHeight: 50,
    marginTop: 8,
    justifyContent: 'center',
    paddingVertical: 15,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '800',
  },
});
