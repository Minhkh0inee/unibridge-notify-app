import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/app-icon';
import { Fonts } from '@/constants/theme';
import type { DoseTone, ScheduledDose } from '@/data/schedule';
import { useTheme } from '@/hooks/use-theme';

const periodIcon: Record<ScheduledDose['period'], AppIconName> = {
  Sáng: 'sun',
  Trưa: 'coffee',
  Chiều: 'sunset',
  Tối: 'moon',
};

const statusText: Record<ScheduledDose['status'], { label: string; icon: AppIconName; tone: 'success' | 'warning' | 'primary' | 'danger' | 'muted' }> = {
  taken: { label: 'Đã uống', icon: 'check', tone: 'success' },
  ignored: { label: 'Bỏ qua', icon: 'warning', tone: 'danger' },
  pending: { label: 'Chờ uống', icon: 'clock', tone: 'primary' },
  upcoming: { label: 'Sắp tới', icon: 'clock', tone: 'muted' },
  late: { label: 'Trễ', icon: 'warning', tone: 'warning' },
};

export function MedicationCard({ dose }: { dose: ScheduledDose }) {
  const theme = useTheme();
  const status = statusText[dose.status];
  const iconColor = getToneColor(dose.tone, theme);
  const iconBg = getToneSoftColor(dose.tone, theme);
  const badgeColor = status.tone === 'muted' ? theme.textSecondary : getToneColor(status.tone, theme);
  const badgeBg = status.tone === 'muted' ? theme.backgroundSelected : getToneSoftColor(status.tone, theme);
  const muted = dose.status === 'taken';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: muted ? 0.72 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <AppIcon name="pill" color={iconColor} size={22} />
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {dose.medication.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <AppIcon name={status.icon} color={badgeColor} size={12} />
            <Text style={[styles.badgeText, { color: badgeColor }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <AppIcon name={periodIcon[dose.period]} color={theme.textSecondary} size={14} />
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {dose.period} · {dose.time}
          </Text>
          <View style={[styles.dot, { backgroundColor: theme.border }]} />
          <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
            {dose.medication.dosage}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function getToneColor(tone: DoseTone | 'danger' | 'muted', theme: ReturnType<typeof useTheme>) {
  if (tone === 'secondary') return theme.secondary;
  if (tone === 'success') return theme.success;
  if (tone === 'warning') return theme.warning;
  if (tone === 'danger') return theme.danger;
  if (tone === 'muted') return theme.textSecondary;
  return theme.primary;
}

function getToneSoftColor(tone: DoseTone | 'danger' | 'muted', theme: ReturnType<typeof useTheme>) {
  if (tone === 'secondary') return theme.secondarySoft;
  if (tone === 'success') return theme.successSoft;
  if (tone === 'warning') return theme.warningSoft;
  if (tone === 'danger') return theme.dangerSoft;
  if (tone === 'muted') return theme.backgroundSelected;
  return theme.primarySoft;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    borderRadius: 2,
    height: 4,
    width: 4,
  },
});
