import React, { useState, useEffect } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing, Colors, Primary } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addMedicationToActiveJourney } from '@/data/storage';
import { scheduleMedicationNotifications } from '@/utils/notifications';
import type { Medication } from '@/data/types';

// Units selection
const UNITS = ['Viên', 'Gói', 'ml', 'Giọt', 'Lần xịt', 'Khác'];

// Form-ready instructions
const INSTRUCTIONS = [
  { value: 'before_meal', label: 'Trước ăn' },
  { value: 'after_meal', label: 'Sau ăn' },
  { value: 'during_meal', label: 'Trong khi ăn' },
  { value: 'none', label: 'Không xác định' },
] as const;

// Default session configuration
const DEFAULT_SESSIONS = [
  { id: 'morning', label: 'Sáng', defaultTime: '08:00' },
  { id: 'noon', label: 'Trưa', defaultTime: '12:00' },
  { id: 'afternoon', label: 'Chiều', defaultTime: '17:00' },
  { id: 'evening', label: 'Tối', defaultTime: '20:00' },
  { id: 'bedtime', label: 'Trước khi ngủ', defaultTime: '22:30' },
];

// Local date YYYY-MM-DD
function getLocalDateString(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Add days helper
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}

// Calculate diff in days helper
function diffInDays(startStr: string, endStr: string): number {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  // Set times to midnight to avoid DST issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export default function AddMedicationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + Spacing.four,
  };

  // Form Fields
  const [name, setName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState('');
  const [qty, setQty] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState('Viên');
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [duration, setDuration] = useState('7');
  const [endDate, setEndDate] = useState(addDays(getLocalDateString(), 7));
  const [instruction, setInstruction] = useState<'before_meal' | 'after_meal' | 'during_meal' | 'none'>('none');
  const [doctor, setDoctor] = useState('');
  const [clinic, setClinic] = useState('');
  const [purpose, setPurpose] = useState('');
  const [recheckDate, setRecheckDate] = useState('');
  const [notes, setNotes] = useState('');

  // Scheduling state
  const [scheduleMode, setScheduleMode] = useState<'session' | 'custom'>('session');
  
  // Session checks and custom times
  const [checkedSessions, setCheckedSessions] = useState<Record<string, boolean>>({
    morning: true,
  });
  const [sessionTimes, setSessionTimes] = useState<Record<string, string>>({
    morning: '08:00',
    noon: '12:00',
    afternoon: '17:00',
    evening: '20:00',
    bedtime: '22:30',
  });

  const [customTimes, setCustomTimes] = useState<string[]>(['08:00']);

  // Sync Duration -> End Date
  const handleDurationChange = (val: string) => {
    setDuration(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0 && startDate) {
      setEndDate(addDays(startDate, parsed));
    }
  };

  // Sync End Date -> Duration
  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val && val.length === 10) {
      const days = diffInDays(startDate, val);
      if (days >= 0) {
        setDuration(String(days));
      }
    }
  };

  // Keep End Date updated if Start Date changes
  useEffect(() => {
    const parsed = parseInt(duration, 10);
    if (!isNaN(parsed) && parsed >= 0 && startDate) {
      setEndDate(addDays(startDate, parsed));
    }
  }, [startDate]);

  // Session Time Updates
  const handleSessionTimeChange = (id: string, time: string) => {
    setSessionTimes((prev) => ({ ...prev, [id]: time }));
  };

  const toggleSession = (id: string) => {
    setCheckedSessions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Custom Time Handlers
  const handleCustomTimeChange = (index: number, val: string) => {
    const next = [...customTimes];
    next[index] = val;
    setCustomTimes(next);
  };

  const addCustomTime = () => {
    setCustomTimes((prev) => [...prev, '12:00']);
  };

  const removeCustomTime = (index: number) => {
    const next = customTimes.filter((_, idx) => idx !== index);
    setCustomTimes(next);
  };

  // Validation & Save
  const handleSave = async () => {
    // 1. Tên thuốc không được để trống
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên thuốc.');
      return;
    }

    // 2. Liều lượng phải lớn hơn 0
    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert('Sai định dạng', 'Liều dùng mỗi lần phải là một số lớn hơn 0 (ví dụ: 1, 1.5).');
      return;
    }

    // 3. Phải có ít nhất một thời điểm uống
    let selectedTimes: string[] = [];
    if (scheduleMode === 'session') {
      DEFAULT_SESSIONS.forEach((s) => {
        if (checkedSessions[s.id]) {
          selectedTimes.push(sessionTimes[s.id] || s.defaultTime);
        }
      });
    } else {
      selectedTimes = customTimes.filter((t) => t.trim().length > 0);
    }

    // Filter to HH:MM format matching standard
    const validTimes = selectedTimes
      .map((t) => t.trim())
      .filter((t) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t));

    if (validTimes.length === 0) {
      Alert.alert('Thiếu lịch uống', 'Vui lòng thiết lập ít nhất một thời điểm uống đúng định dạng (HH:MM).');
      return;
    }

    // 4. Ngày kết thúc không được trước ngày bắt đầu
    if (endDate && startDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        Alert.alert('Sai lịch', 'Ngày kết thúc không được trước ngày bắt đầu.');
        return;
      }
    }

    // Check duplicate reminder times for warnings
    const duplicates = validTimes.filter((item, index) => validTimes.indexOf(item) !== index);
    if (duplicates.length > 0) {
      Alert.alert(
        'Cảnh báo lịch trùng',
        `Có một số thời điểm uống thuốc bị trùng lặp: ${duplicates.join(', ')}. Bạn có chắc chắn muốn lưu không?`,
        [
          { text: 'Chỉnh lại', style: 'cancel' },
          { text: 'Tiếp tục lưu', onPress: () => performSave(validTimes) },
        ]
      );
    } else {
      await performSave(validTimes);
    }
  };

  const performSave = async (times: string[]) => {
    // Generate UUID
    const medId = `med-manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newMedication: Medication = {
      id: medId,
      name: name.trim(),
      activeIngredient: activeIngredient.trim() || undefined,
      dosage: dosage.trim() || `${qty} ${selectedUnit}`,
      form: form.trim() || undefined,
      quantityPerDose: qty.trim(),
      unit: selectedUnit || undefined,
      instruction: instruction,
      reminderTimes: times,
      startDate: startDate,
      endDate: endDate || undefined,
      doctorOrClinic: doctor.trim() ? `${doctor.trim()} - ${clinic.trim()}`.replace(/ - $/, '') : undefined,
      notes: notes.trim() || undefined,
      purpose: purpose.trim() || undefined,
      recheckDate: recheckDate.trim() || undefined,
      dataSource: 'manual',
      status: 'active',
    };

    try {
      await addMedicationToActiveJourney(newMedication);
      await scheduleMedicationNotifications(newMedication);
      Alert.alert('Thành công', 'Xong rồi! Mình sẽ nhắc bạn từ lần uống tiếp theo.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu thuốc vào lịch.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Navbar */}
        <View style={styles.navbar}>
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
            onPress={() => router.back()}>
            <SymbolView
              tintColor={theme.text}
              name={{ ios: 'chevron.backward', android: 'arrow_back', web: 'arrow-left' } as any}
              size={24}
            />
          </Pressable>
          <ThemedText type="smallBold" style={styles.navbarTitle}>
            Thêm thuốc mới
          </ThemedText>
          <View style={styles.navBtn} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
          showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerDesc}>
            <ThemedText style={styles.descText} themeColor="textSecondary">
              Điền những gì bạn biết trước nhé. Bạn luôn có thể chỉnh lại sau.
            </ThemedText>
          </View>

          {/* Form */}
          <ThemedView type="backgroundElement" style={styles.formCard}>
            
            {/* Required Info */}
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">THÔNG TIN CƠ BẢN</ThemedText>
            </View>

            <View style={styles.formGroup}>
              <ThemedText type="code" themeColor="textSecondary">TÊN THUỐC *</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                value={name}
                onChangeText={setName}
                placeholder="Nhập tên thuốc (ví dụ: Panadol)"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1.5 }]}>
                <ThemedText type="code" themeColor="textSecondary">LIỀU DÙNG MỖI LẦN *</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={qty}
                  onChangeText={setQty}
                  placeholder="e.g. 1"
                  keyboardType="numeric"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 2.5 }]}>
                <ThemedText type="code" themeColor="textSecondary">ĐƠN VỊ *</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitRow}>
                  {UNITS.map((unit) => (
                    <Pressable
                      key={unit}
                      style={[
                        styles.unitChip,
                        selectedUnit === unit && { backgroundColor: Primary },
                        { borderColor: theme.backgroundSelected },
                      ]}
                      onPress={() => setSelectedUnit(unit)}>
                      <Text style={[styles.unitChipText, selectedUnit === unit && styles.unitChipTextActive]}>
                        {unit}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText type="code" themeColor="textSecondary">HÀM LƯỢNG (e.g. 500mg)</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={dosage}
                  onChangeText={setDosage}
                  placeholder="e.g. 500mg"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText type="code" themeColor="textSecondary">DẠNG BÀO CHẾ</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={form}
                  onChangeText={setForm}
                  placeholder="Viên nén, siro, sủi..."
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>

            {/* Time Settings */}
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">LỊCH TRÌNH & THỜI GIAN</ThemedText>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1.2 }]}>
                <ThemedText type="code" themeColor="textSecondary">NGÀY BẮT ĐẦU</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText type="code" themeColor="textSecondary">THỜI LƯỢNG (NGÀY)</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={duration}
                  onChangeText={handleDurationChange}
                  keyboardType="numeric"
                  placeholder="e.g. 7"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1.2 }]}>
                <ThemedText type="code" themeColor="textSecondary">NGÀY KẾT THÚC</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={endDate}
                  onChangeText={handleEndDateChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>

            {/* Schedule config mode toggles */}
            <View style={styles.formGroup}>
              <ThemedText type="code" themeColor="textSecondary">CÁCH THIẾT LẬP LỊCH UỐNG *</ThemedText>
              <View style={styles.modeToggleRow}>
                <Pressable
                  style={[
                    styles.modeToggleBtn,
                    scheduleMode === 'session' && { backgroundColor: Primary },
                    { borderColor: theme.backgroundSelected },
                  ]}
                  onPress={() => setScheduleMode('session')}>
                  <Text style={[styles.modeToggleText, scheduleMode === 'session' && styles.unitChipTextActive]}>
                    Theo buổi trong ngày
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modeToggleBtn,
                    scheduleMode === 'custom' && { backgroundColor: Primary },
                    { borderColor: theme.backgroundSelected },
                  ]}
                  onPress={() => setScheduleMode('custom')}>
                  <Text style={[styles.modeToggleText, scheduleMode === 'custom' && styles.unitChipTextActive]}>
                    Theo giờ cụ thể
                  </Text>
                </Pressable>
              </View>
            </View>

            {scheduleMode === 'session' ? (
              /* Session Selection Layout */
              <View style={styles.sessionSection}>
                {DEFAULT_SESSIONS.map((session) => {
                  const isChecked = !!checkedSessions[session.id];
                  return (
                    <View key={session.id} style={styles.sessionRow}>
                      <Pressable
                        style={styles.sessionLeft}
                        onPress={() => toggleSession(session.id)}>
                        <SymbolView
                          tintColor={isChecked ? Primary : theme.textSecondary}
                          name={isChecked ? ({ ios: 'checkmark.square.fill', android: 'check_box', web: 'check-square' } as any) : ({ ios: 'square', android: 'check_box_outline_blank', web: 'square' } as any)}
                          size={22}
                        />
                        <ThemedText type="smallBold" style={styles.sessionLabel}>
                          Buổi {session.label}
                        </ThemedText>
                      </Pressable>

                      {isChecked && (
                        <View style={styles.sessionTimeContainer}>
                          <TextInput
                            style={[
                              styles.timeInput,
                              { color: theme.text, borderColor: theme.backgroundSelected },
                            ]}
                            value={sessionTimes[session.id]}
                            onChangeText={(val) => handleSessionTimeChange(session.id, val)}
                            placeholder="HH:MM"
                            placeholderTextColor={theme.textSecondary}
                            maxLength={5}
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              /* Custom Specific Time Layout */
              <View style={styles.customSection}>
                {customTimes.map((time, index) => (
                  <View key={index} style={styles.customTimeRow}>
                    <TextInput
                      style={[
                        styles.input,
                        { color: theme.text, borderColor: theme.backgroundSelected, flex: 1 },
                      ]}
                      value={time}
                      onChangeText={(val) => handleCustomTimeChange(index, val)}
                      placeholder="HH:MM (e.g. 08:00)"
                      placeholderTextColor={theme.textSecondary}
                      maxLength={5}
                    />
                    {customTimes.length > 1 && (
                      <Pressable
                        style={styles.removeTimeBtn}
                        onPress={() => removeCustomTime(index)}>
                        <SymbolView
                          tintColor="#DC3545"
                          name={{ ios: 'minus.circle.fill', android: 'remove_circle', web: 'minus-circle' } as any}
                          size={24}
                        />
                      </Pressable>
                    )}
                  </View>
                ))}
                <Pressable
                  style={[styles.addTimeBtn, { borderColor: theme.backgroundSelected }]}
                  onPress={addCustomTime}>
                  <SymbolView
                    tintColor={Primary}
                    name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'plus-circle' } as any}
                    size={20}
                  />
                  <Text style={[styles.addTimeText, { color: Primary }]}>Thêm mốc giờ</Text>
                </Pressable>
              </View>
            )}

            {/* Optional Info */}
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">THÔNG TIN THÊM (TÙY CHỌN)</ThemedText>
            </View>

            <View style={styles.formGroup}>
              <ThemedText type="code" themeColor="textSecondary">UỐNG TRƯỚC HOẶC SAU ĂN</ThemedText>
              <View style={styles.chipGrid}>
                {INSTRUCTIONS.map((inst) => (
                  <Pressable
                    key={inst.value}
                    style={[
                      styles.instructionChip,
                      instruction === inst.value && { backgroundColor: Primary },
                      { borderColor: theme.backgroundSelected },
                    ]}
                    onPress={() => setInstruction(inst.value)}>
                    <Text style={[styles.unitChipText, instruction === inst.value && styles.unitChipTextActive]}>
                      {inst.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText type="code" themeColor="textSecondary">TÊN BÁC SĨ</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={doctor}
                  onChangeText={setDoctor}
                  placeholder="Bác sĩ điều trị"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText type="code" themeColor="textSecondary">NƠI KHÁM</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={clinic}
                  onChangeText={setClinic}
                  placeholder="Bệnh viện, phòng khám"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText type="code" themeColor="textSecondary">MỤC ĐÍCH SỬ DỤNG</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={purpose}
                  onChangeText={setPurpose}
                  placeholder="Ví dụ: Hạ huyết áp"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText type="code" themeColor="textSecondary">NGÀY TÁI KHÁM (YYYY-MM-DD)</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={recheckDate}
                  onChangeText={setRecheckDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <ThemedText type="code" themeColor="textSecondary">GHI CHÚ</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  { color: theme.text, borderColor: theme.backgroundSelected },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ghi chú thêm về đơn thuốc này..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </ThemedView>

          {/* Action CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
            ]}
            onPress={handleSave}>
            <Text style={styles.saveButtonText}>Lưu vào lịch</Text>
          </Pressable>

        </ScrollView>
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
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  navBtn: {
    padding: Spacing.one,
    minWidth: 40,
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  headerDesc: {
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.one,
  },
  descText: {
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionHeader: {
    marginTop: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    paddingBottom: Spacing.one,
  },
  formGroup: {
    gap: Spacing.one,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  unitRow: {
    gap: Spacing.two,
    paddingVertical: 2,
  },
  unitChip: {
    borderWidth: 1,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  unitChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60646C',
  },
  unitChipTextActive: {
    color: '#ffffff',
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modeToggleBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60646C',
  },
  sessionSection: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sessionLabel: {
    fontSize: 15,
  },
  sessionTimeContainer: {
    width: 80,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    fontSize: 14,
    textAlign: 'center',
  },
  customSection: {
    gap: Spacing.two,
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  removeTimeBtn: {
    padding: Spacing.one,
  },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  addTimeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  instructionChip: {
    width: '47%',
    borderWidth: 1,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  saveButton: {
    backgroundColor: Primary,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
