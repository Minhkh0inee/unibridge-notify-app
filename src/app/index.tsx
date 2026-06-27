import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/app-icon';
import { Mascot } from '@/components/mascot';
import { MedicationCard } from '@/components/medication-card';
import { ProgressRing } from '@/components/progress-ring';
import { BottomTabInset, Fonts, MobileFrameWidth } from '@/constants/theme';
import { getNextDose, getScheduledDoses, getTodayProgress } from '@/data/schedule';
import { useActiveJourney } from '@/hooks/use-active-journey';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { journey, logs, loading } = useActiveJourney();
  const doses = getScheduledDoses(journey, logs);
  const progress = getTodayProgress(doses);
  const nextDose = getNextDose(doses);
  const progressValue = progress.total ? progress.done / progress.total : 0;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 16) + 16,
          paddingBottom: insets.bottom + BottomTabInset + 130,
        },
      ]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Chào buổi sáng, Ngọc</Text>
          <Text style={[styles.title, { color: theme.text }]}>
            Hôm nay bạn có{'\n'}
            {loading ? '...' : progress.total} lần uống thuốc
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Thông báo"
          style={[styles.bellButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <AppIcon name="bell" color={theme.text} size={18} />
          <View style={[styles.notificationDot, { backgroundColor: theme.primary, borderColor: theme.backgroundElement }]} />
        </Pressable>
      </View>

      <View
        style={[
          styles.progressCard,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, shadowColor: theme.cardShadow },
        ]}>
        <View style={[styles.mascotTile, { backgroundColor: theme.primarySoft }]}>
          <Mascot mood="happy" size={90} />
        </View>
        <View style={styles.progressText}>
          <Text style={[styles.kicker, { color: theme.textSecondary }]}>Tiến độ hôm nay</Text>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {progress.done}/{progress.total || 0} lần uống
          </Text>
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
            {progress.total - progress.done > 0
              ? `Còn ${progress.total - progress.done} liều nữa thôi. Bạn đang làm rất tốt.`
              : 'Hôm nay đã xong lịch uống thuốc.'}
          </Text>
        </View>
        <ProgressRing value={progressValue} />
      </View>

      {nextDose && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Tiếp theo</Text>
            <Text style={[styles.sectionMeta, { color: theme.textSecondary }]}>{nextDose.time}</Text>
          </View>
          <View style={[styles.nextCard, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
            <View style={styles.nextGlowLarge} />
            <View style={styles.nextGlowSmall} />
            <View style={styles.nextTop}>
              <View style={styles.nextCopy}>
                <Text style={[styles.nextKicker, { color: theme.primaryForeground }]}>
                  Lúc {nextDose.time} · {nextDose.period}
                </Text>
                <Text style={[styles.nextTitle, { color: theme.primaryForeground }]} numberOfLines={1}>
                  {nextDose.medication.name}
                </Text>
                <Text style={[styles.nextMeta, { color: theme.primaryForeground }]}>
                  {nextDose.medication.dosage} · Lịch {journey?.name ?? 'đang theo dõi'}
                </Text>
              </View>
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingText}>Sắp tới</Text>
              </View>
            </View>
            <View style={styles.nextActions}>
              <Pressable style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                <Text style={[styles.confirmText, { color: theme.primary }]}>Xác nhận uống</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}>
                <Text style={styles.detailText}>Chi tiết</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <View style={styles.quickGrid}>
        <QuickAction icon="add" label="Thêm thuốc" onPress={() => router.push('/add')} />
        <QuickAction icon="scan" label="Quét đơn" onPress={() => router.push('/scan')} />
        <QuickAction icon="calendar" label="Xem lịch" onPress={() => router.push('/explore')} />
        <QuickAction icon="bag" label="Nhắc mang" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Hôm nay</Text>
          <Pressable onPress={() => router.push('/explore')} style={styles.inlineLink}>
            <Text style={[styles.linkText, { color: theme.primary }]}>Xem tất cả</Text>
            <AppIcon name="chevronRight" color={theme.primary} size={13} />
          </Pressable>
        </View>
        <View style={styles.cardList}>
          {doses.map((dose) => (
            <MedicationCard key={dose.id} dose={dose} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}>
      <View style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}>
        <AppIcon name={icon} color={theme.primary} size={17} />
      </View>
      <Text style={[styles.quickLabel, { color: theme.text }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
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
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 31,
    marginTop: 5,
  },
  bellButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    width: 40,
  },
  notificationDot: {
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 8,
    top: 8,
    width: 10,
  },
  progressCard: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
    padding: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  mascotTile: {
    alignItems: 'center',
    borderRadius: 24,
    height: 80,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 80,
  },
  progressText: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 3,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  section: { marginTop: 24 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  nextCard: {
    borderRadius: 28,
    elevation: 8,
    overflow: 'hidden',
    padding: 20,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
  },
  nextGlowLarge: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 80,
    bottom: -44,
    height: 150,
    position: 'absolute',
    right: -42,
    width: 150,
  },
  nextGlowSmall: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 48,
    height: 96,
    position: 'absolute',
    right: -16,
    top: -38,
    width: 96,
  },
  nextTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  nextCopy: { flex: 1, minWidth: 0 },
  nextKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    opacity: 0.82,
    textTransform: 'uppercase',
  },
  nextTitle: {
    fontFamily: Fonts.sans,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
    marginTop: 5,
  },
  nextMeta: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    opacity: 0.9,
  },
  upcomingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  upcomingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  nextActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flex: 1,
    paddingVertical: 13,
  },
  confirmText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '800',
  },
  detailButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  detailText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  quickAction: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    minHeight: 82,
    paddingHorizontal: 5,
    paddingVertical: 12,
  },
  quickIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    textAlign: 'center',
  },
  inlineLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardList: { gap: 12 },
  pressed: { opacity: 0.78 },
});
