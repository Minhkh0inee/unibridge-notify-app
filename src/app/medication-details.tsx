import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing, Colors, Primary } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getActiveJourney,
  updateMedicationInActiveJourney,
  deleteMedicationFromActiveJourney,
  readDoseLogs,
} from '@/data/storage';
import {
  scheduleMedicationNotifications,
  cancelMedicationNotifications,
} from '@/utils/notifications';
import type { Medication, DoseLog } from '@/data/types';

const UNIT_OPTIONS = ['Viên', 'Gói', 'ml', 'Giọt', 'Lần xịt', 'Khác'];

// Helper to format instruction code to Vietnamese
function getInstructionLabel(instruction?: string): string {
  switch (instruction) {
    case 'before_meal':
      return 'Trước ăn';
    case 'after_meal':
      return 'Sau ăn';
    case 'during_meal':
      return 'Trong khi ăn';
    case 'none':
    default:
      return 'Không xác định';
  }
}

// Helper to format date string to DD/MM/YYYY
function formatDateDMY(dateStr?: string): string {
  if (!dateStr) return 'Chưa đặt';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function MedicationDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const medId = Array.isArray(id) ? id[0] : id;
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + Spacing.four,
  };

  const [medication, setMedication] = useState<Medication | null>(null);
  const [historyLogs, setHistoryLogs] = useState<DoseLog[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formIngredient, setFormIngredient] = useState('');
  const [formDosage, setFormDosage] = useState('');
  const [formForm, setFormForm] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formUnit, setFormUnit] = useState('Viên');
  const [formInstruction, setFormInstruction] = useState<'before_meal' | 'after_meal' | 'during_meal' | 'none'>('none');
  const [formTimes, setFormTimes] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formDoctor, setFormDoctor] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formRecheck, setFormRecheck] = useState('');
  const [formSource, setFormSource] = useState<'manual' | 'ocr'>('manual');

  // Load medication details
  const loadMedicationDetails = useCallback(async () => {
    if (!medId) return;
    try {
      const journey = await getActiveJourney();
      const med = journey?.medications.find((m) => m.id === medId);
      if (med) {
        setMedication(med);
        // Initialize form states
        setFormName(med.name || '');
        setFormIngredient(med.activeIngredient || '');
        setFormDosage(med.dosage || '');
        setFormForm(med.form || '');
        setFormQty(String(med.quantityPerDose || ''));
        setFormUnit(med.unit || 'Viên');
        setFormInstruction(med.instruction || 'none');
        setFormTimes((med.reminderTimes || []).join(', '));
        setFormStart(med.startDate || '');
        setFormEnd(med.endDate || '');
        setFormDoctor(med.doctorOrClinic || '');
        setFormNotes(med.notes || '');
        setFormPurpose(med.purpose || '');
        setFormRecheck(med.recheckDate || '');
        setFormSource(med.dataSource || 'manual');
      }

      // Fetch logs
      const allLogs = await readDoseLogs();
      const filteredLogs = allLogs
        .filter((l) => l.medicationId === medId)
        .sort((a, b) => b.actionTakenAt.localeCompare(a.actionTakenAt));
      setHistoryLogs(filteredLogs);
    } catch (e) {
      console.error('Error loading medication details:', e);
    }
  }, [medId]);

  useEffect(() => {
    loadMedicationDetails();
  }, [loadMedicationDetails]);

  if (!medication) {
    return (
      <ThemedView style={styles.errorContainer}>
        <SymbolView
          tintColor={theme.textSecondary}
          name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'exclamation-triangle' } as any}
          size={48}
        />
        <ThemedText style={styles.errorText}>Không tìm thấy thông tin thuốc.</ThemedText>
        <Pressable
          style={[styles.btn, { backgroundColor: Primary }]}
          onPress={() => router.back()}>
          <Text style={styles.btnText}>Quay lại</Text>
        </Pressable>
      </ThemedView>
    );
  }

  // Handle saving edits
  const handleSaveEdits = async () => {
    if (!formName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thuốc');
      return;
    }

    // Parse reminder times
    const timesArray = formTimes
      .split(',')
      .map((t) => t.trim())
      .filter((t) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t));

    if (timesArray.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập ít nhất một giờ uống đúng định dạng (HH:MM)');
      return;
    }

    const updatedMedication: Medication = {
      ...medication,
      name: formName.trim(),
      activeIngredient: formIngredient.trim() || undefined,
      dosage: formDosage.trim(),
      form: formForm.trim() || undefined,
      quantityPerDose: formQty.trim() || undefined,
      unit: formUnit || undefined,
      instruction: formInstruction,
      reminderTimes: timesArray,
      startDate: formStart.trim() || undefined,
      endDate: formEnd.trim() || undefined,
      doctorOrClinic: formDoctor.trim() || undefined,
      notes: formNotes.trim() || undefined,
      purpose: formPurpose.trim() || undefined,
      recheckDate: formRecheck.trim() || undefined,
      dataSource: formSource,
    };

    try {
      await updateMedicationInActiveJourney(updatedMedication);
      await scheduleMedicationNotifications(updatedMedication);
      setIsEditing(false);
      await loadMedicationDetails();
      Alert.alert('Thành công', 'Đã cập nhật thông tin thuốc');
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu thay đổi');
    }
  };

  // Action: Toggle Pause / Resume
  const handleTogglePause = async () => {
    const isPaused = medication.status === 'paused';
    const newStatus = isPaused ? 'active' : 'paused';
    
    try {
      const updatedMed: Medication = {
        ...medication,
        status: newStatus,
      };
      await updateMedicationInActiveJourney(updatedMed);
      await scheduleMedicationNotifications(updatedMed);
      await loadMedicationDetails();
      Alert.alert(
        'Thành công',
        newStatus === 'paused' ? 'Đã tạm dừng lịch uống thuốc' : 'Đã tiếp tục lịch uống thuốc'
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể thay đổi trạng thái');
    }
  };

  // Action: End Medication Journey
  const handleEndMedication = () => {
    Alert.alert(
      'Kết thúc liệu trình',
      `Bạn có chắc chắn muốn kết thúc liệu trình thuốc ${medication.name}? Thuốc này sẽ không hiển thị trên dashboard nữa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Kết thúc',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedMed: Medication = {
                ...medication,
                status: 'ended',
              };
              await updateMedicationInActiveJourney(updatedMed);
              await cancelMedicationNotifications(medication.id);
              router.back();
            } catch (e) {
              console.error(e);
              Alert.alert('Lỗi', 'Không thể kết thúc liệu trình');
            }
          },
        },
      ]
    );
  };

  // Action: Delete Medication
  const handleDeleteMedication = () => {
    Alert.alert(
      'Xóa thuốc',
      `Bạn có chắc chắn muốn xóa vĩnh viễn thuốc ${medication.name} khỏi danh sách?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMedicationFromActiveJourney(medication.id);
              await cancelMedicationNotifications(medication.id);
              router.back();
            } catch (e) {
              console.error(e);
              Alert.alert('Lỗi', 'Không thể xóa thuốc');
            }
          },
        },
      ]
    );
  };

  // Helper to map date to readable logs
  const formatActionTime = (isoString: string) => {
    const d = new Date(isoString);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return { time, date };
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
            {isEditing ? 'Chỉnh sửa thuốc' : 'Chi tiết thuốc'}
          </ThemedText>

          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
            onPress={() => {
              if (isEditing) {
                handleSaveEdits();
              } else {
                setIsEditing(true);
              }
            }}>
            <ThemedText type="linkPrimary" style={styles.editBtnText}>
              {isEditing ? 'Lưu' : 'Sửa'}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
          showsVerticalScrollIndicator={false}>
          
          {isEditing ? (
            /* Editing Form */
            <ThemedView type="backgroundElement" style={styles.formCard}>
              <View style={styles.formGroup}>
                <ThemedText type="code" themeColor="textSecondary">TÊN THUỐC *</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Nhập tên thuốc"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="code" themeColor="textSecondary">HOẠT CHẤT</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={formIngredient}
                  onChangeText={setFormIngredient}
                  placeholder="Nhập tên hoạt chất (nếu có)"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText type="code" themeColor="textSecondary">LIỀU LƯỢNG (e.g. 500mg)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={formDosage}
                    onChangeText={setFormDosage}
                    placeholder="e.g. 500mg"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText type="code" themeColor="textSecondary">DẠNG THUỐC (e.g. Viên nén)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={formForm}
                    onChangeText={setFormForm}
                    placeholder="Viên nén, siro..."
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText type="code" themeColor="textSecondary">SỐ LƯỢNG / LẦN UỐNG</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={formQty}
                    onChangeText={setFormQty}
                    placeholder="e.g. 1"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText type="code" themeColor="textSecondary">NGUỒN DỮ LIỆU</ThemedText>
                  <View style={styles.chipRow}>
                    <Pressable
                      style={[
                        styles.chip,
                        formSource === 'manual' && { backgroundColor: Primary },
                      ]}
                      onPress={() => setFormSource('manual')}>
                      <Text style={[styles.chipText, formSource === 'manual' && styles.chipTextActive]}>
                        Thủ công
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.chip,
                        formSource === 'ocr' && { backgroundColor: Primary },
                      ]}
                      onPress={() => setFormSource('ocr')}>
                      <Text style={[styles.chipText, formSource === 'ocr' && styles.chipTextActive]}>
                        OCR
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="code" themeColor="textSecondary">HƯỚNG DẪN ĂN UỐNG</ThemedText>
                <View style={styles.chipGrid}>
                  {(['before_meal', 'after_meal', 'during_meal', 'none'] as const).map((inst) => (
                    <Pressable
                      key={inst}
                      style={[
                        styles.chip,
                        formInstruction === inst && { backgroundColor: Primary },
                        { width: '47%', marginBottom: Spacing.two },
                      ]}
                      onPress={() => setFormInstruction(inst)}>
                      <Text style={[styles.chipText, formInstruction === inst && styles.chipTextActive]}>
                        {getInstructionLabel(inst)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="code" themeColor="textSecondary">GIỜ UỐNG (HH:MM, phân cách bằng dấu phẩy) *</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={formTimes}
                  onChangeText={setFormTimes}
                  placeholder="Ví dụ: 08:00, 20:00"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText type="code" themeColor="textSecondary">NGÀY BẮT ĐẦU (YYYY-MM-DD)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={formStart}
                    onChangeText={setFormStart}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText type="code" themeColor="textSecondary">NGÀY KẾT THÚC (YYYY-MM-DD)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={formEnd}
                    onChangeText={setFormEnd}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="code" themeColor="textSecondary">BÁC SĨ / CƠ SỞ Y TẾ</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={formDoctor}
                  onChangeText={setFormDoctor}
                  placeholder="Nhập tên bác sĩ hoặc bệnh viện"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}> 
                  <ThemedText type="code" themeColor="textSecondary">MỤC ĐÍCH SỬ DỤNG</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={formPurpose}
                    onChangeText={setFormPurpose}
                    placeholder="Ví dụ: Hạ huyết áp"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}> 
                  <ThemedText type="code" themeColor="textSecondary">NGÀY TÁI KHÁM (YYYY-MM-DD)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={formRecheck}
                    onChangeText={setFormRecheck}
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
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="Ghi chú thêm từ bác sĩ..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formActionsRow}>
                <Pressable
                  style={[styles.btn, styles.cancelBtn, { borderColor: theme.backgroundSelected }]}
                  onPress={() => setIsEditing(false)}>
                  <Text style={[styles.btnText, { color: theme.text }]}>Hủy</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.saveBtn, { backgroundColor: Primary }]}
                  onPress={handleSaveEdits}>
                  <Text style={styles.btnText}>Lưu thay đổi</Text>
                </Pressable>
              </View>
            </ThemedView>
          ) : (
            /* Details View */
            <>
              {/* Main Info Card */}
              <ThemedView type="backgroundElement" style={styles.detailsCard}>
                <View style={styles.detailsHeader}>
                  <View style={styles.detailsHeaderLeft}>
                    <ThemedText type="subtitle" style={styles.medTitle}>
                      {medication.name}
                    </ThemedText>
                    {medication.activeIngredient && (
                      <ThemedText type="small" themeColor="textSecondary">
                        Hoạt chất: {medication.activeIngredient}
                      </ThemedText>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusIndicator,
                      medication.status === 'paused' ? styles.statusPaused : styles.statusActive,
                    ]}>
                    <Text style={styles.statusText}>
                      {medication.status === 'paused' ? 'Đang tạm dừng' : 'Đang hoạt động'}
                    </Text>
                  </View>
                </View>

                {/* Grid stats */}
                <View style={styles.gridSection}>
                  <View style={styles.gridItem}>
                    <ThemedText type="code" themeColor="textSecondary">LIỀU DÙNG</ThemedText>
                    <ThemedText type="smallBold" style={styles.gridValue}>
                      {medication.dosage}
                    </ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText type="code" themeColor="textSecondary">DẠNG BÀO CHẾ</ThemedText>
                    <ThemedText type="smallBold" style={styles.gridValue}>
                      {medication.form || 'Chưa rõ'}
                    </ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText type="code" themeColor="textSecondary">SỐ LƯỢNG / LẦN</ThemedText>
                    <ThemedText type="smallBold" style={styles.gridValue}>
                      {medication.quantityPerDose || '1 viên'}
                    </ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText type="code" themeColor="textSecondary">ĐƠN VỊ</ThemedText>
                    <ThemedText type="smallBold" style={styles.gridValue}>
                      {medication.unit || 'Viên'}
                    </ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText type="code" themeColor="textSecondary">HƯỚNG DẪN</ThemedText>
                    <ThemedText type="smallBold" style={styles.gridValue}>
                      {getInstructionLabel(medication.instruction)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Additional details list */}
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
                      Giờ uống thuốc:
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.detailValue}>
                      {(medication.reminderTimes ?? []).join(', ')}
                    </ThemedText>
                  </View>

                  <View style={styles.detailRow}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
                      Ngày bắt đầu:
                    </ThemedText>
                    <ThemedText type="small" style={styles.detailValue}>
                      {formatDateDMY(medication.startDate)}
                    </ThemedText>
                  </View>

                  <View style={styles.detailRow}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
                      Ngày kết thúc:
                    </ThemedText>
                    <ThemedText type="small" style={styles.detailValue}>
                      {formatDateDMY(medication.endDate)}
                    </ThemedText>
                  </View>

                  {medication.doctorOrClinic && (
                    <View style={styles.detailRow}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
                        Bác sĩ / Nơi khám:
                      </ThemedText>
                      <ThemedText type="small" style={styles.detailValue}>
                        {medication.doctorOrClinic}
                      </ThemedText>
                    </View>
                  )}

                  {medication.purpose && (
                    <View style={styles.detailRow}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
                        Mục đích sử dụng:
                      </ThemedText>
                      <ThemedText type="small" style={styles.detailValue}>
                        {medication.purpose}
                      </ThemedText>
                    </View>
                  )}

                  {medication.recheckDate && (
                    <View style={styles.detailRow}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
                        Ngày tái khám:
                      </ThemedText>
                      <ThemedText type="small" style={styles.detailValue}>
                        {formatDateDMY(medication.recheckDate)}
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
                      Nguồn đơn thuốc:
                    </ThemedText>
                    <ThemedText type="small" style={styles.detailValue}>
                      {medication.dataSource === 'ocr' ? 'OCR quét từ đơn' : 'Nhập thủ công'}
                    </ThemedText>
                  </View>
                </View>

                {medication.notes && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.notesContainer}>
                      <ThemedText type="code" themeColor="textSecondary">GHI CHÚ CHI TIẾT</ThemedText>
                      <ThemedText type="small" style={styles.notesText}>
                        {medication.notes}
                      </ThemedText>
                    </View>
                  </>
                )}
              </ThemedView>

              {/* Actions Section */}
              <View style={styles.actionsContainer}>
                <Pressable
                  style={[
                    styles.actionButton,
                    { backgroundColor: medication.status === 'paused' ? '#FFFBEB' : '#FFF7ED', borderColor: '#FED7AA' },
                    styles.borderOutline,
                  ]}
                  onPress={handleTogglePause}>
                  <SymbolView
                    tintColor="#D97706"
                    name={(medication.status === 'paused' ? { ios: 'play.fill', android: 'play_arrow', web: 'play' } : { ios: 'pause.fill', android: 'pause', web: 'pause' }) as any}
                    size={20}
                  />
                  <Text style={[styles.actionButtonText, { color: '#C2410C' }]}>
                    {medication.status === 'paused' ? 'Tiếp tục lịch' : 'Tạm dừng lịch'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.actionButton,
                    { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
                    styles.borderOutline,
                  ]}
                  onPress={handleEndMedication}>
                  <SymbolView
                    tintColor="#7C3AED"
                    name={{ ios: 'checkmark.seal.fill', android: 'check_circle_outline', web: 'check' } as any}
                    size={20}
                  />
                  <Text style={[styles.actionButtonText, { color: '#6D28D9' }]}>
                    Kết thúc liệu trình
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.actionButton,
                    { backgroundColor: '#FDF2F2', borderColor: '#FDE8E8' },
                    styles.borderOutline,
                  ]}
                  onPress={handleDeleteMedication}>
                  <SymbolView
                    tintColor="#E53E3E"
                    name={{ ios: 'trash.fill', android: 'delete', web: 'trash' } as any}
                    size={20}
                  />
                  <Text style={[styles.actionButtonText, { color: '#C53030' }]}>
                    Xóa thuốc
                  </Text>
                </Pressable>
              </View>

              {/* History Section */}
              <View style={styles.historyHeader}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  LỊCH SỬ UỐNG THUỐC
                </ThemedText>
              </View>

              {historyLogs.length === 0 ? (
                <View style={styles.emptyLogs}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Chưa có lịch sử ghi nhận cho thuốc này
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.logsList}>
                  {historyLogs.map((log, idx) => {
                    const { time, date } = formatActionTime(log.actionTakenAt);
                    const isTaken = log.status === 'taken';
                    
                    return (
                      <ThemedView key={idx} type="backgroundElement" style={styles.logItem}>
                        <View style={styles.logItemLeft}>
                          <SymbolView
                            tintColor={isTaken ? '#28A745' : '#6B7280'}
                            name={(isTaken ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check-circle' } : { ios: 'xmark.circle.fill', android: 'cancel', web: 'times-circle' }) as any}
                            size={20}
                          />
                          <View style={styles.logDetails}>
                            <ThemedText type="smallBold">
                              {isTaken ? 'Đã uống' : 'Đã bỏ qua'} (Scheduled: {log.scheduledTime})
                            </ThemedText>
                            <ThemedText type="code" themeColor="textSecondary" style={styles.logTime}>
                              Ghi nhận lúc {time} ngày {date}
                            </ThemedText>
                          </View>
                        </View>
                      </ThemedView>
                    );
                  })}
                </View>
              )}
            </>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
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
  editBtnText: {
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'right',
    minWidth: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.six,
  },
  errorText: {
    textAlign: 'center',
  },
  detailsCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  detailsHeaderLeft: {
    flex: 1,
  },
  medTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusIndicator: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#E6F6ED',
  },
  statusPaused: {
    backgroundColor: '#FFFBEB',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  gridSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  gridItem: {
    width: '47%',
    padding: Spacing.two,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    gap: Spacing.half,
  },
  gridValue: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginVertical: Spacing.one,
  },
  detailsList: {
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesContainer: {
    gap: Spacing.one,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  borderOutline: {
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.half,
  },
  emptyLogs: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  logsList: {
    gap: Spacing.two,
  },
  logItem: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  logItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  logDetails: {
    flex: 1,
  },
  logTime: {
    fontSize: 11,
    marginTop: 2,
  },
  formCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
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
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chip: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60646C',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  btn: {
    paddingVertical: Spacing.two + 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
  },
  saveBtn: {
    flex: 2,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.8,
  },
});
