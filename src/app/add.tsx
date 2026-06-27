import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { BottomTabInset, Fonts, MobileFrameWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AddMedicationScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
          <Text style={[styles.kicker, { color: theme.textSecondary }]}>Bước 1/5</Text>
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
          Cho Mèo biết bạn đang uống thuốc gì để nhắc đúng giờ.
        </Text>
      </View>

      <Field label="Tên thuốc">
        <TextInput
          defaultValue="Amoxicillin 500mg"
          placeholder="VD: Amoxicillin 500mg"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
        />
      </Field>

      <View style={styles.twoCols}>
        <Field label="Dạng thuốc">
          <View style={[styles.input, styles.selectLike, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.inputText, { color: theme.text }]}>Viên nang</Text>
          </View>
        </Field>
        <Field label="Liều mỗi lần">
          <TextInput
            defaultValue="1 viên"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
          />
        </Field>
      </View>

      <Field label="Hướng dẫn">
        <View style={styles.chips}>
          {['Trước ăn', 'Sau ăn', 'Cùng bữa ăn', 'Trước khi ngủ'].map((chip, index) => (
            <View
              key={chip}
              style={[
                styles.chip,
                {
                  backgroundColor: index === 1 ? theme.text : theme.backgroundElement,
                  borderColor: index === 1 ? theme.text : theme.border,
                },
              ]}>
              <Text style={[styles.chipText, { color: index === 1 ? theme.background : theme.text }]}>{chip}</Text>
            </View>
          ))}
        </View>
      </Field>

      <Field label="Giờ uống">
        <View style={[styles.timeList, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {['08:00', '20:00'].map((time, index) => (
            <View key={time} style={[styles.timeRow, index === 0 && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
              <View style={styles.timeLabel}>
                <AppIcon name="clock" color={theme.textSecondary} size={16} />
                <Text style={[styles.timeText, { color: theme.text }]}>{index === 0 ? 'Sáng' : 'Tối'}</Text>
              </View>
              <Text style={[styles.timeValue, { color: theme.text }]}>{time}</Text>
            </View>
          ))}
        </View>
      </Field>

      <Pressable style={[styles.saveButton, { backgroundColor: theme.text }]}>
        <Text style={[styles.saveText, { color: theme.background }]}>Tiếp tục</Text>
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
  selectLike: {
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 14,
    fontWeight: '600',
  },
  twoCols: {
    flexDirection: 'row',
    gap: 12,
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
  timeList: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  timeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  timeLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
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
  saveButton: {
    alignItems: 'center',
    borderRadius: 16,
    marginTop: 8,
    paddingVertical: 15,
  },
  saveText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '800',
  },
});
