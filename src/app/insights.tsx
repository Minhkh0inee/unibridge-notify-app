import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/app-icon';
import { Mascot } from '@/components/mascot';
import { ProgressRing } from '@/components/progress-ring';
import { BottomTabInset, Fonts, MobileFrameWidth } from '@/constants/theme';
import { getScheduledDoses, getTodayProgress } from '@/data/schedule';
import { useActiveJourney } from '@/hooks/use-active-journey';
import { useTheme } from '@/hooks/use-theme';

export default function InsightsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { journey, logs } = useActiveJourney();
  const doses = getScheduledDoses(journey, logs);
  const progress = getTodayProgress(doses);
  const rate = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16) + 18, paddingBottom: insets.bottom + BottomTabInset + 132 },
      ]}>
      <Text style={[styles.kicker, { color: theme.textSecondary }]}>Tuần 21 - 27/06</Text>
      <Text style={[styles.title, { color: theme.text }]}>Tổng kết tuần</Text>

      <View style={[styles.hero, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
        <Mascot mood="proud" size={92} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>Tuyệt vời</Text>
          <Text style={styles.heroTitle}>{progress.done}/{progress.total || 0} lần</Text>
          <Text style={styles.heroText}>Lịch uống đang rõ ràng hơn. Cứ giữ nhịp này.</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard icon="chart" label="Tỉ lệ hoàn thành" value={`${rate}%`} tone="success" />
        <StatCard icon="clock" label="Trễ trung bình" value="24 phút" tone="warning" />
        <StatCard icon="check" label="Chuỗi ngày" value="6 ngày" tone="primary" />
        <StatCard icon="sun" label="Buổi hay trễ" value="Sáng" tone="secondary" />
      </View>

      <View style={[styles.chartCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.chartTop}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Mức hoàn thành</Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Theo từng ngày trong tuần</Text>
          </View>
          <ProgressRing value={rate / 100} size={48} />
        </View>
        <View style={styles.bars}>
          {[1, 1, 0.66, 1, 1, 0.66, 0.66].map((value, index) => (
            <View key={index} style={styles.barWrap}>
              <View style={[styles.barTrack, { backgroundColor: theme.primarySoft }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${value * 100}%`,
                      backgroundColor: value === 1 ? theme.primary : theme.warning,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.tip, { backgroundColor: theme.secondarySoft, borderColor: `${theme.secondary}33` }]}>
        <View style={[styles.tipIcon, { backgroundColor: theme.secondary }]}>
          <AppIcon name="check" color="#FFFFFF" size={16} />
        </View>
        <View style={styles.tipCopy}>
          <Text style={[styles.tipKicker, { color: theme.secondary }]}>Đề xuất</Text>
          <Text style={[styles.tipTitle, { color: theme.text }]}>Dời lời nhắc buổi sáng sang 08:20?</Text>
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            Bạn thường phản hồi nhắc sáng muộn hơn một chút. Có thể 08:00 hơi sớm.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: AppIconName;
  label: string;
  value: string;
  tone: 'primary' | 'secondary' | 'success' | 'warning';
}) {
  const theme = useTheme();
  const color = tone === 'secondary' ? theme.secondary : tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.primary;
  const soft = tone === 'secondary' ? theme.secondarySoft : tone === 'success' ? theme.successSoft : tone === 'warning' ? theme.warningSoft : theme.primarySoft;

  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: soft }]}>
        <AppIcon name={icon} color={color} size={17} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
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
  kicker: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 25,
    fontWeight: '800',
    marginTop: 4,
  },
  hero: {
    alignItems: 'center',
    borderRadius: 28,
    elevation: 8,
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
    overflow: 'hidden',
    padding: 20,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
  },
  heroCopy: { flex: 1 },
  heroKicker: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.82,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.sans,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  heroText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  statCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    width: '48.25%',
  },
  statIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  statValue: {
    fontFamily: Fonts.sans,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 3,
  },
  chartCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  chartTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    height: 140,
    marginTop: 20,
  },
  barWrap: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    height: '100%',
  },
  barTrack: {
    borderRadius: 12,
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    borderRadius: 12,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  tip: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    padding: 18,
  },
  tipIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  tipCopy: {
    flex: 1,
  },
  tipKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tipTitle: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 4,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
});
