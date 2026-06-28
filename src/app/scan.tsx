import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { Mascot } from '@/components/mascot';
import { BottomTabInset, Fonts, MobileFrameWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const results = [
  { name: 'Amoxicillin 500mg', dosage: '1 viên x 3 lần/ngày', duration: '7 ngày', confidence: 'Chắc chắn' },
  { name: 'Paracetamol 500mg', dosage: '1 viên khi sốt', duration: 'Khi cần', confidence: 'Cần kiểm tra' },
  { name: 'Vitamin C 1000mg', dosage: '1 viên/ngày', duration: '14 ngày', confidence: 'Chắc chắn' },
];

export default function ScanScreen() {
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
        <Pressable onPress={() => router.back()} style={[styles.closeButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <AppIcon name="back" color={theme.text} size={16} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.kicker, { color: theme.textSecondary }]}>Kết quả</Text>
          <Text style={[styles.title, { color: theme.text }]}>Đơn thuốc đã đọc</Text>
        </View>
      </View>

      <View style={[styles.scanFrame, { backgroundColor: theme.text }]}>
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />
        <Text style={styles.scanFrameText}>Canh đơn thuốc vào đây nha</Text>
      </View>

      <View style={[styles.callout, { backgroundColor: theme.primarySoft, borderColor: `${theme.primary}26` }]}>
        <Mascot mood="happy" size={58} />
        <Text style={[styles.calloutText, { color: theme.text }]}>
          Mèo soi ra 3 loại thuốc. Bạn check lại xíu nha, chỗ nào Mèo cấn cấn thì Mèo có note lại rồi đó.
        </Text>
      </View>

      <View style={styles.resultList}>
        {results.map((item) => (
          <OcrCard key={item.name} {...item} />
        ))}
      </View>

      <Pressable style={[styles.addMissing, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <AppIcon name="add" color={theme.textSecondary} size={16} />
        <Text style={[styles.addMissingText, { color: theme.textSecondary }]}>Thêm thuốc Mèo bỏ sót</Text>
      </Pressable>

      <Pressable style={[styles.saveButton, { backgroundColor: theme.text }]} onPress={() => router.push('/')}>
        <Text style={[styles.saveText, { color: theme.background }]}>Xong! Tạo lịch thôi</Text>
      </Pressable>
    </ScrollView>
  );
}

function OcrCard({
  name,
  dosage,
  duration,
  confidence,
}: {
  name: string;
  dosage: string;
  duration: string;
  confidence: string;
}) {
  const theme = useTheme();
  const low = confidence === 'Cần kiểm tra';
  const badgeColor = low ? theme.warning : theme.success;
  const badgeBg = low ? theme.warningSoft : theme.successSoft;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardName, { color: theme.text }]}>{name}</Text>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <AppIcon name={low ? 'warning' : 'check'} color={badgeColor} size={12} />
          <Text style={[styles.badgeText, { color: badgeColor }]}>{confidence}</Text>
        </View>
      </View>
      <View style={styles.infoGrid}>
        <View style={[styles.infoBox, { backgroundColor: theme.background }]}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Liều</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{dosage}</Text>
        </View>
        <View style={[styles.infoBox, { backgroundColor: theme.background }]}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Thời gian</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{duration}</Text>
        </View>
      </View>
      {low && (
        <Text style={[styles.warningText, { color: theme.warning }]}>
          Chỗ này Mèo hơi lú, bạn check lại cho chuẩn nha.
        </Text>
      )}
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
  closeButton: {
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
  scanFrame: {
    alignItems: 'center',
    aspectRatio: 3 / 2,
    borderRadius: 28,
    justifyContent: 'center',
    marginTop: 18,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  scanFrameText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '700',
  },
  cornerTopLeft: {
    borderColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderTopLeftRadius: 22,
    borderTopWidth: 4,
    height: 34,
    left: 18,
    position: 'absolute',
    top: 18,
    width: 34,
  },
  cornerTopRight: {
    borderColor: '#FFFFFF',
    borderRightWidth: 4,
    borderTopRightRadius: 22,
    borderTopWidth: 4,
    height: 34,
    position: 'absolute',
    right: 18,
    top: 18,
    width: 34,
  },
  cornerBottomLeft: {
    borderBottomLeftRadius: 22,
    borderBottomWidth: 4,
    borderColor: '#FFFFFF',
    borderLeftWidth: 4,
    bottom: 18,
    height: 34,
    left: 18,
    position: 'absolute',
    width: 34,
  },
  cornerBottomRight: {
    borderBottomRightRadius: 22,
    borderBottomWidth: 4,
    borderColor: '#FFFFFF',
    borderRightWidth: 4,
    bottom: 18,
    height: 34,
    position: 'absolute',
    right: 18,
    width: 34,
  },
  callout: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    padding: 14,
  },
  calloutText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  resultList: {
    gap: 12,
    marginTop: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  cardName: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '800',
  },
  badge: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  infoBox: {
    borderRadius: 14,
    flex: 1,
    padding: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  addMissing: {
    alignItems: 'center',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 14,
  },
  addMissingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 16,
    marginTop: 14,
    paddingVertical: 15,
  },
  saveText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '800',
  },
});
