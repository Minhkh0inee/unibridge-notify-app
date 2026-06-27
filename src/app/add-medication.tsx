import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';

type SessionName = 'morning' | 'noon' | 'afternoon' | 'evening' | 'bedtime';
type FoodInstruction = 'before' | 'after' | 'during' | null;

const SESSION_OPTIONS: { label: string; value: SessionName; time: string }[] = [
  { label: 'Sáng', value: 'morning', time: '08:00' },
  { label: 'Trưa', value: 'noon', time: '12:00' },
  { label: 'Chiều', value: 'afternoon', time: '17:00' },
  { label: 'Tối', value: 'evening', time: '20:00' },
  { label: 'Trước khi ngủ', value: 'bedtime', time: '22:30' },
];

const UNIT_OPTIONS = ['viên', 'gói', 'ml', 'giọt', 'lần xịt'];
const FOOD_OPTIONS: { label: string; value: FoodInstruction }[] = [
  { label: 'Trước ăn', value: 'before' },
  { label: 'Sau ăn', value: 'after' },
  { label: 'Trong khi ăn', value: 'during' },
];

export default function AddMedicationScreen() {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [form, setForm] = useState('');
  const [dosageAmount, setDosageAmount] = useState('1');
  const [dosageUnit, setDosageUnit] = useState('viên');
  const [foodInstruction, setFoodInstruction] = useState<FoodInstruction>(null);
  const [selectedSessions, setSelectedSessions] = useState<SessionName[]>([]);
  const [durationDays, setDurationDays] = useState('7');
  const [notes, setNotes] = useState('');

  const toggleSession = (session: SessionName) => {
    setSelectedSessions((prev) =>
      prev.includes(session) ? prev.filter((s) => s !== session) : [...prev, session]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thuốc');
      return;
    }

    if (selectedSessions.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một buổi uống thuốc');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập');
        return;
      }

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + parseInt(durationDays) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Insert medication
      const { data: medication, error: medError } = await supabase
        .from('medications')
        .insert({
          user_id: user.id,
          name: name.trim(),
          strength: strength.trim() || null,
          form: form.trim() || null,
          dosage_amount: parseFloat(dosageAmount),
          dosage_unit: dosageUnit,
          food_instruction: foodInstruction,
          start_date: startDate,
          end_date: endDate,
          status: 'active',
          source_type: 'manual',
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (medError) throw medError;

      // Get default journey config (balanced)
      const { data: journeyConfig } = await supabase
        .from('journey_configs')
        .select('id')
        .eq('preset_type', 'balanced')
        .eq('is_preset', true)
        .single();

      if (!journeyConfig) throw new Error('Default journey config not found');

      // Insert schedules for selected sessions
      const schedules = selectedSessions.map((session) => {
        const sessionData = SESSION_OPTIONS.find((s) => s.value === session);
        const targetTime = sessionData?.time || '08:00';
        const [hour] = targetTime.split(':').map(Number);

        return {
          medication_id: medication.id,
          session_name: session,
          target_time: `${targetTime}:00`,
          valid_window_start: `${String(Math.max(0, hour - 1)).padStart(2, '0')}:00:00`,
          valid_window_end: `${String(Math.min(23, hour + 2)).padStart(2, '0')}:00:00`,
          days_of_week: [1, 2, 3, 4, 5, 6, 7],
          journey_config_id: journeyConfig.id,
          active_from: startDate,
          active_until: endDate,
        };
      });

      const { error: schedError } = await supabase.from('medication_schedules').insert(schedules);

      if (schedError) throw schedError;

      Alert.alert('Thành công', 'Đã thêm thuốc vào lịch!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error adding medication:', error);
      Alert.alert('Lỗi', 'Không thể thêm thuốc. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Thông tin thuốc</Text>
      <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
        Điền những gì bạn biết trước nhé. Bạn luôn có thể chỉnh lại sau.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>
          Tên thuốc <Text style={{ color: theme.accent }}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Ví dụ: Amoxicillin"
          placeholderTextColor={theme.textSecondary}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.flex1]}>
          <Text style={[styles.label, { color: theme.text }]}>Hàm lượng</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="500mg"
            placeholderTextColor={theme.textSecondary}
            value={strength}
            onChangeText={setStrength}
          />
        </View>
        <View style={[styles.inputGroup, styles.flex1]}>
          <Text style={[styles.label, { color: theme.text }]}>Dạng thuốc</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Viên nén"
            placeholderTextColor={theme.textSecondary}
            value={form}
            onChangeText={setForm}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.flex1]}>
          <Text style={[styles.label, { color: theme.text }]}>
            Số lượng <Text style={{ color: theme.accent }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="1"
            placeholderTextColor={theme.textSecondary}
            value={dosageAmount}
            onChangeText={setDosageAmount}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputGroup, styles.flex1]}>
          <Text style={[styles.label, { color: theme.text }]}>Đơn vị</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
            {UNIT_OPTIONS.map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitChip,
                  { backgroundColor: dosageUnit === unit ? theme.accent : theme.surface, borderColor: theme.border },
                ]}
                onPress={() => setDosageUnit(unit)}
              >
                <Text style={[styles.unitText, { color: dosageUnit === unit ? '#FFF' : theme.text }]}>{unit}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Uống khi nào?</Text>
        <View style={styles.foodRow}>
          {FOOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.foodChip,
                {
                  backgroundColor: foodInstruction === option.value ? theme.accentTint : theme.surface,
                  borderColor: foodInstruction === option.value ? theme.accent : theme.border,
                  borderWidth: 1.5,
                },
              ]}
              onPress={() => setFoodInstruction(foodInstruction === option.value ? null : option.value)}
            >
              <Text
                style={[
                  styles.foodText,
                  { color: foodInstruction === option.value ? theme.accent : theme.textSecondary },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.accent }]}
        onPress={() => setStep(2)}
      >
        <Text style={styles.buttonText}>Tiếp tục</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Lịch uống thuốc</Text>
      <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
        Chọn các buổi trong ngày bạn cần uống thuốc
      </Text>

      <View style={styles.sessionsGrid}>
        {SESSION_OPTIONS.map((session) => (
          <TouchableOpacity
            key={session.value}
            style={[
              styles.sessionCard,
              {
                backgroundColor: selectedSessions.includes(session.value) ? theme.accent : theme.surface,
                borderColor: selectedSessions.includes(session.value) ? theme.accent : theme.border,
              },
            ]}
            onPress={() => toggleSession(session.value)}
          >
            <Text
              style={[
                styles.sessionLabel,
                { color: selectedSessions.includes(session.value) ? '#FFF' : theme.text },
              ]}
            >
              {session.label}
            </Text>
            <Text
              style={[
                styles.sessionTime,
                { color: selectedSessions.includes(session.value) ? '#FFF' : theme.textSecondary },
              ]}
            >
              {session.time}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Thời lượng (ngày)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="7"
          placeholderTextColor={theme.textSecondary}
          value={durationDays}
          onChangeText={setDurationDays}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Ghi chú (không bắt buộc)</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Ví dụ: Kháng sinh điều trị viêm họng"
          placeholderTextColor={theme.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.border }]}
          onPress={() => setStep(1)}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Quay lại</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, styles.flex1, { backgroundColor: theme.accent }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Đang lưu...' : 'Lưu vào lịch'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.closeButton, { color: theme.textSecondary }]}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Thêm thuốc mới</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${(step / 2) * 100}%` }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>Bước {step}/2</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step === 1 ? renderStep1() : renderStep2()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  closeButton: {
    fontSize: FontSizes.xxl,
    width: 40,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  placeholder: {
    width: 40,
  },
  progressBar: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.two,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  stepContainer: {
    gap: Spacing.four,
  },
  stepTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },
  stepSubtitle: {
    fontSize: FontSizes.md,
    marginTop: -Spacing.two,
  },
  inputGroup: {
    gap: Spacing.two,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: FontSizes.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex1: {
    flex: 1,
  },
  unitScroll: {
    flexGrow: 0,
  },
  unitChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.medium,
    marginRight: Spacing.two,
    borderWidth: 1.5,
  },
  unitText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  foodRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  foodChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.medium,
  },
  foodText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  sessionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  sessionCard: {
    width: '47%',
    padding: Spacing.four,
    borderRadius: BorderRadius.large,
    borderWidth: 2,
    alignItems: 'center',
    gap: Spacing.one,
  },
  sessionLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  sessionTime: {
    fontSize: FontSizes.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  primaryButton: {
    paddingVertical: Spacing.three + Spacing.one,
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: Spacing.three + Spacing.one,
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    borderWidth: 2,
  },
  buttonText: {
    color: '#FFF',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  secondaryButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
});
