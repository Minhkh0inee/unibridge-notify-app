import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/app-icon';
import { MedicationCard } from '@/components/medication-card';
import { BottomTabInset, Fonts, MobileFrameWidth } from '@/constants/theme';
import { getScheduledDoses, type Period, type ScheduledDose } from '@/data/schedule';
import { useActiveJourney } from '@/hooks/use-active-journey';
import { useTheme } from '@/hooks/use-theme';

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const periods: Period[] = ['Sáng', 'Trưa', 'Chiều', 'Tối'];

const periodMeta: Record<Period, { icon: AppIconName; window: string; tone: 'warning' | 'primary' | 'secondary' | 'success' }> = {
  Sáng: { icon: 'sun', window: '06:00 - 11:00', tone: 'warning' },
  Trưa: { icon: 'coffee', window: '11:00 - 14:00', tone: 'primary' },
  Chiều: { icon: 'sunset', window: '14:00 - 18:00', tone: 'secondary' },
  Tối: { icon: 'moon', window: '18:00 - 23:00', tone: 'success' },
};

export default function JourneyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState(27);
  const [sheetPeriod, setSheetPeriod] = useState<Period | null>(null);
  const { journey, logs } = useActiveJourney();
  const doses = getScheduledDoses(journey, logs);

  const grouped = useMemo(() => {
    const byPeriod: Record<Period, ScheduledDose[]> = {
      Sáng: [],
      Trưa: [],
      Chiều: [],
      Tối: [],
    };
    doses.forEach((dose) => byPeriod[dose.period].push(dose));
    return byPeriod;
  }, [doses]);

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: insets.bottom + BottomTabInset + 132,
          },
        ]}>
        <View style={styles.monthHeader}>
          <RoundButton icon="back" />
          <Text style={[styles.monthTitle, { color: theme.text }]}>Tháng 6, 2026</Text>
          <RoundButton icon="chevronRight" />
        </View>

        <View style={styles.weekdays}>
          {weekdays.map((day) => (
            <Text key={day} style={[styles.weekday, { color: theme.textSecondary }]}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => (
            <CalendarDay key={day} day={day} selected={day === selectedDay} onPress={() => setSelectedDay(day)} />
          ))}
        </View>

        <View style={styles.scheduleHeader}>
          <Text style={[styles.scheduleTitle, { color: theme.text }]}>Lịch ngày {selectedDay}/06</Text>
          <Text style={[styles.scheduleMeta, { color: theme.textSecondary }]}>
            {periods.filter((period) => grouped[period].length).length || periods.length} phiên
          </Text>
        </View>

        <View style={styles.periodList}>
          {periods.map((period) => (
            <PeriodCard
              key={period}
              period={period}
              doses={grouped[period]}
              onPress={() => setSheetPeriod(period)}
            />
          ))}
        </View>
      </ScrollView>

      <SessionSheet
        period={sheetPeriod}
        doses={sheetPeriod ? grouped[sheetPeriod] : []}
        escalationMinutes={Math.round((journey?.escalationConfig.stepSeconds ?? 180) / 60)}
        requirePhoto={journey?.escalationConfig.requirePhotoToStop ?? false}
        onClose={() => setSheetPeriod(null)}
      />
    </>
  );
}

function CalendarDay({
  day,
  selected,
  onPress,
}: {
  day: number;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const today = 27;
  const hasDose = day >= 20 && day <= 29;
  const done = day < today;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dayCell,
        {
          backgroundColor: selected ? theme.text : day === today ? theme.primarySoft : theme.backgroundElement,
          borderColor: selected || day === today ? 'transparent' : theme.border,
          transform: [{ scale: selected ? 1.05 : 1 }],
        },
      ]}>
      <Text style={[styles.dayText, { color: selected ? theme.background : day === today ? theme.primary : theme.text }]}>
        {day}
      </Text>
      {hasDose && (
        <View
          style={[
            styles.dayDot,
            { backgroundColor: selected ? theme.background : done ? theme.success : theme.primary },
          ]}
        />
      )}
    </Pressable>
  );
}

function PeriodCard({
  period,
  doses,
  onPress,
}: {
  period: Period;
  doses: ScheduledDose[];
  onPress: () => void;
}) {
  const theme = useTheme();
  const meta = periodMeta[period];
  const toneColor = getToneColor(meta.tone, theme);
  const toneSoft = getToneSoft(meta.tone, theme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.periodCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}>
      <View style={styles.periodTop}>
        <View style={[styles.periodIcon, { backgroundColor: toneSoft }]}>
          <AppIcon name={meta.icon} color={toneColor} size={20} />
        </View>
        <View style={styles.periodBody}>
          <View style={styles.periodTitleRow}>
            <Text style={[styles.periodTitle, { color: theme.text }]}>Buổi {period.toLowerCase()}</Text>
            <Text style={[styles.periodWindow, { color: theme.textSecondary }]}>{meta.window}</Text>
          </View>
          <Text style={[styles.periodSummary, { color: theme.textSecondary }]} numberOfLines={1}>
            {doses.length
              ? `${doses.length} thuốc · ${doses.map((dose) => dose.medication.name.split(' ')[0]).join(', ')}`
              : 'Chưa có thuốc'}
          </Text>
        </View>
      </View>

      {doses.length > 0 && (
        <View style={styles.periodDoseList}>
          {doses.map((dose) => (
            <View key={dose.id} style={styles.periodDoseRow}>
              <Text style={[styles.periodDoseText, { color: theme.text }]} numberOfLines={1}>
                {dose.medication.name} · {dose.medication.dosage}
              </Text>
              <Text style={[styles.periodDoseTime, { color: theme.textSecondary }]}>{dose.time}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function SessionSheet({
  period,
  doses,
  escalationMinutes,
  requirePhoto,
  onClose,
}: {
  period: Period | null;
  doses: ScheduledDose[];
  escalationMinutes: number;
  requirePhoto: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const steps = [
    { time: '08:00', label: 'Nhắc nhẹ', icon: 'bell' as AppIconName, tone: 'primary' as const },
    { time: `+${escalationMinutes}ph`, label: 'Nhắc lại', icon: 'bell' as AppIconName, tone: 'primary' as const },
    { time: `+${escalationMinutes * 2}ph`, label: 'Thông báo lớn', icon: 'warning' as AppIconName, tone: 'warning' as const },
    { time: 'Cuối', label: requirePhoto ? 'Xác nhận bằng ảnh' : 'Ghi nhận phản hồi', icon: 'camera' as AppIconName, tone: 'danger' as const },
  ];

  return (
    <Modal transparent visible={period !== null} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Buổi {period?.toLowerCase()}</Text>
          <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
            Tùy chỉnh nhắc và xác nhận cho phiên này.
          </Text>

          <View style={styles.sheetMeds}>
            {doses.length ? (
              doses.map((dose) => <MedicationCard key={dose.id} dose={dose} />)
            ) : (
              <Text style={[styles.emptySheet, { color: theme.textSecondary, borderColor: theme.border }]}>
                Chưa có thuốc trong phiên này.
              </Text>
            )}
          </View>

          <Text style={[styles.timelineTitle, { color: theme.text }]}>Lộ trình nhắc</Text>
          <View style={styles.timeline}>
            <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
            {steps.map((step) => {
              const color = getToneColor(step.tone, theme);
              const soft = getToneSoft(step.tone, theme);
              return (
                <View key={`${step.time}-${step.label}`} style={styles.timelineRow}>
                  <View style={[styles.timelineDot, { borderColor: theme.primary, backgroundColor: theme.background }]} />
                  <Text style={[styles.timelineTime, { color: theme.text }]}>{step.time}</Text>
                  <View style={[styles.timelineIcon, { backgroundColor: soft }]}>
                    <AppIcon name={step.icon} color={color} size={14} />
                  </View>
                  <Text style={[styles.timelineLabel, { color: theme.text }]}>{step.label}</Text>
                </View>
              );
            })}
          </View>

          <Pressable onPress={onClose} style={[styles.saveButton, { backgroundColor: theme.text }]}>
            <Text style={[styles.saveText, { color: theme.background }]}>Lưu thay đổi</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RoundButton({ icon }: { icon: AppIconName }) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.roundButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <AppIcon name={icon} color={theme.text} size={16} />
    </Pressable>
  );
}

function getToneColor(tone: 'primary' | 'secondary' | 'success' | 'warning' | 'danger', theme: ReturnType<typeof useTheme>) {
  if (tone === 'secondary') return theme.secondary;
  if (tone === 'success') return theme.success;
  if (tone === 'warning') return theme.warning;
  if (tone === 'danger') return theme.danger;
  return theme.primary;
}

function getToneSoft(tone: 'primary' | 'secondary' | 'success' | 'warning' | 'danger', theme: ReturnType<typeof useTheme>) {
  if (tone === 'secondary') return theme.secondarySoft;
  if (tone === 'success') return theme.successSoft;
  if (tone === 'warning') return theme.warningSoft;
  if (tone === 'danger') return theme.dangerSoft;
  return theme.primarySoft;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    alignSelf: 'center',
    maxWidth: MobileFrameWidth,
    paddingHorizontal: 20,
    width: '100%',
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 18,
  },
  roundButton: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  monthTitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '800',
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    width: `${(100 - 6 * 6) / 7}%`,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayDot: {
    borderRadius: 2,
    height: 4,
    marginTop: 4,
    width: 4,
  },
  scheduleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  scheduleTitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '800',
  },
  scheduleMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  periodList: {
    gap: 12,
    marginTop: 14,
  },
  periodCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  periodTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  periodIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  periodBody: {
    flex: 1,
    minWidth: 0,
  },
  periodTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  periodTitle: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '800',
  },
  periodWindow: {
    fontSize: 12,
    fontWeight: '600',
  },
  periodSummary: {
    fontSize: 12,
    marginTop: 4,
  },
  periodDoseList: {
    gap: 8,
    marginTop: 14,
    paddingLeft: 56,
  },
  periodDoseRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  periodDoseText: {
    flex: 1,
    fontSize: 12,
    opacity: 0.86,
  },
  periodDoseTime: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(45,41,38,0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    alignSelf: 'center',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxWidth: MobileFrameWidth,
    padding: 20,
    width: '100%',
  },
  sheetHandle: {
    alignSelf: 'center',
    borderRadius: 4,
    height: 6,
    marginBottom: 16,
    width: 42,
  },
  sheetTitle: {
    fontFamily: Fonts.sans,
    fontSize: 22,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  sheetMeds: {
    gap: 10,
    marginTop: 18,
  },
  emptySheet: {
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
    padding: 22,
    textAlign: 'center',
  },
  timelineTitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 22,
  },
  timeline: {
    gap: 12,
    paddingLeft: 15,
    position: 'relative',
  },
  timelineLine: {
    bottom: 8,
    left: 5,
    position: 'absolute',
    top: 8,
    width: 2,
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  timelineDot: {
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    marginLeft: -15,
    width: 12,
  },
  timelineTime: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    width: 52,
  },
  timelineIcon: {
    alignItems: 'center',
    borderRadius: 9,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 16,
    marginTop: 22,
    paddingVertical: 14,
  },
  saveText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '800',
  },
});
