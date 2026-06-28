import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { BottomTabInset, Fonts, MobileFrameWidth } from "@/constants/theme";
import { getPeriodLabel } from "@/data/calendar";
import { saveSessionConfigTimes } from "@/data/supabase-storage";
import type {
  AgendaSession,
  DayDoseStatus,
  DoseEventStatus,
  Period,
} from "@/data/types";
import { useCalendar } from "@/hooks/use-calendar";
import { useTheme } from "@/hooks/use-theme";

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const periods: Period[] = [
  "morning",
  "noon",
  "afternoon",
  "evening",
  "bedtime",
];
type TimeFieldKey = "target" | "start" | "end";
type TimeFieldLayout = { x: number; y: number; width: number; height: number };

const periodMeta: Record<
  Period,
  {
    icon: AppIconName;
    defaultWindow: string;
    defaultTime: string;
    tone: "warning" | "primary" | "secondary" | "success";
  }
> = {
  morning: {
    icon: "sun",
    defaultWindow: "06:00 - 10:00",
    defaultTime: "08:00",
    tone: "warning",
  },
  noon: {
    icon: "coffee",
    defaultWindow: "11:00 - 14:00",
    defaultTime: "12:00",
    tone: "primary",
  },
  afternoon: {
    icon: "sunset",
    defaultWindow: "15:00 - 18:00",
    defaultTime: "17:00",
    tone: "secondary",
  },
  evening: {
    icon: "moon",
    defaultWindow: "18:00 - 21:30",
    defaultTime: "20:00",
    tone: "success",
  },
  bedtime: {
    icon: "moon",
    defaultWindow: "21:00 - 00:00",
    defaultTime: "22:30",
    tone: "primary",
  },
};

const statusMeta: Record<
  DayDoseStatus | DoseEventStatus | "empty",
  {
    label: string;
    icon: AppIconName;
    tone: "success" | "warning" | "danger" | "primary" | "muted";
  }
> = {
  complete: { label: "Xong hết", icon: "check", tone: "success" },
  partial: { label: "Chưa xong", icon: "pill", tone: "primary" },
  late: { label: "Hơi trễ", icon: "clock", tone: "warning" },
  missed: { label: "Lỡ rồi", icon: "warning", tone: "danger" },
  future: { label: "Sắp tới", icon: "bell", tone: "primary" },
  none: { label: "Trống", icon: "calendar", tone: "muted" },
  pending: { label: "Tới giờ", icon: "clock", tone: "primary" },
  taken: { label: "Xong nha", icon: "check", tone: "success" },
  skipped: { label: "Skip", icon: "warning", tone: "danger" },
  empty: { label: "Chưa có gì", icon: "calendar", tone: "muted" },
};

export default function JourneyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [sheetPeriod, setSheetPeriod] = useState<Period | null>(null);
  const {
    month,
    agenda,
    selectedDate,
    loading,
    error,
    setSelectedDate,
    goToNextWeek,
    goToPrevWeek,
    refresh,
  } = useCalendar();

  const selectedDateParts = parseDateKey(selectedDate);
  const monthTitle = formatMonthTitle(selectedDate);
  const selectedTitle = formatSelectedDate(selectedDate);
  const week = getWeekDateKeys(selectedDate).map((date) => {
    const calendarDay = month.find((day) => day.date === date);
    return (
      calendarDay ?? {
        date,
        status: "none" as const,
        totalDoses: 0,
        takenDoses: 0,
        lateDoses: 0,
        missedDoses: 0,
      }
    );
  });
  const selectedSession = sheetPeriod
    ? (agenda?.sessions.find((session) => session.period === sheetPeriod) ??
      null)
    : null;

  const sessionsByPeriod = useMemo(() => {
    const map = new Map<Period, AgendaSession>();
    agenda?.sessions.forEach((session) => map.set(session.period, session));
    return map;
  }, [agenda]);

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
        ]}
      >
        <View style={styles.monthHeader}>
          <RoundButton icon="back" onPress={goToPrevWeek} label="Tuần trước" />
          <View style={styles.monthTitleWrap}>
            <Text style={[styles.monthTitle, { color: theme.text }]}>
              {monthTitle}
            </Text>
          </View>
          <RoundButton
            icon="chevronRight"
            onPress={goToNextWeek}
            label="Tuần sau"
          />
        </View>

        {error && (
          <Pressable
            onPress={() => void refresh()}
            style={[
              styles.messageCard,
              { backgroundColor: theme.dangerSoft, borderColor: theme.danger },
            ]}
          >
            <AppIcon name="warning" color={theme.danger} size={18} />
            <Text style={[styles.messageText, { color: theme.danger }]}>
              {error}
            </Text>
          </Pressable>
        )}

        <View style={styles.weekdays}>
          {weekdays.map((day) => (
            <Text
              key={day}
              style={[styles.weekday, { color: theme.textSecondary }]}
            >
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.weekRow}>
          {week.map((day) => (
            <CalendarDayCell
              key={day.date}
              date={day.date}
              status={day.status}
              selected={day.date === selectedDate}
              today={day.date === toDateKey(new Date())}
              onPress={() => setSelectedDate(day.date)}
            />
          ))}
        </View>

        <View style={styles.legendRow}>
          <LegendItem status="complete" />
          <LegendItem status="partial" />
          <LegendItem status="late" />
          <LegendItem status="missed" />
        </View>

        <View style={styles.scheduleHeader}>
          <View>
            <Text style={[styles.scheduleTitle, { color: theme.text }]}>
              Lịch {selectedTitle}
            </Text>
            <Text style={[styles.scheduleDate, { color: theme.textSecondary }]}>
              {selectedDateParts.day}/{selectedDateParts.month}/
              {selectedDateParts.year}
            </Text>
          </View>
          <Text style={[styles.scheduleMeta, { color: theme.textSecondary }]}>
            {agenda?.sessions.length ?? 0} phiên
          </Text>
        </View>

        {loading && month.length === 0 ? (
          <View
            style={[
              styles.messageCard,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <AppIcon name="calendar" color={theme.primary} size={18} />
            <Text style={[styles.messageText, { color: theme.textSecondary }]}>
              Đang tải lịch thuốc...
            </Text>
          </View>
        ) : null}

        {!loading && !error && month.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}
            >
              <AppIcon name="pill" color={theme.primary} size={26} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Chưa có lịch uống
            </Text>
            <Text style={[styles.emptyCopy, { color: theme.textSecondary }]}>
              Thêm thuốc để Mèo lên lịch nhắc nhở cho bạn nhé!
            </Text>
          </View>
        ) : (
          <View style={styles.periodList}>
            {periods.map((period) => (
              <PeriodCard
                key={period}
                period={period}
                session={sessionsByPeriod.get(period) ?? null}
                onPress={() => setSheetPeriod(period)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <SessionSheet
        period={sheetPeriod}
        session={selectedSession}
        onClose={() => setSheetPeriod(null)}
        onSaved={refresh}
      />
    </>
  );
}

function CalendarDayCell({
  date,
  status,
  selected,
  today,
  onPress,
}: {
  date: string;
  status: DayDoseStatus;
  selected: boolean;
  today: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const day = parseDateKey(date).day;
  const meta = statusMeta[status];
  const statusColor = getToneColor(meta.tone, theme);
  const statusSoft = getToneSoft(meta.tone, theme);
  const foreground = selected
    ? theme.background
    : today
      ? theme.primary
      : theme.text;

  return (
    <Pressable
      accessibilityLabel={`${date}, ${meta.label}`}
      onPress={onPress}
      style={[
        styles.dayCell,
        {
          backgroundColor: selected
            ? theme.text
            : today
              ? theme.primarySoft
              : theme.backgroundElement,
          borderColor: selected || today ? "transparent" : theme.border,
          transform: [{ scale: selected ? 1.04 : 1 }],
        },
      ]}
    >
      <Text style={[styles.dayText, { color: foreground }]}>{day}</Text>
      {status !== "none" && status !== "future" && (
        <View
          style={[
            styles.dayStatus,
            { backgroundColor: selected ? theme.background : statusSoft },
          ]}
        >
          <AppIcon
            name={meta.icon}
            color={selected ? theme.text : statusColor}
            size={10}
          />
        </View>
      )}
    </Pressable>
  );
}

function LegendItem({ status }: { status: DayDoseStatus }) {
  const theme = useTheme();
  const meta = statusMeta[status];
  const color = getToneColor(meta.tone, theme);
  const soft = getToneSoft(meta.tone, theme);

  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendIcon, { backgroundColor: soft }]}>
        <AppIcon name={meta.icon} color={color} size={10} />
      </View>
      <Text style={[styles.legendText, { color: theme.textSecondary }]}>
        {meta.label}
      </Text>
    </View>
  );
}

function PeriodCard({
  period,
  session,
  onPress,
}: {
  period: Period;
  session: AgendaSession | null;
  onPress: () => void;
}) {
  const theme = useTheme();
  const meta = periodMeta[period];
  const toneColor = getToneColor(meta.tone, theme);
  const toneSoft = getToneSoft(meta.tone, theme);
  const medications = session?.medications ?? [];
  const status = medications.length ? (session?.status ?? "pending") : "empty";
  const statusInfo =
    period === "bedtime" && medications.length
      ? {
          label: "Chuẩn bị",
          icon: "bag" as AppIconName,
          tone: "primary" as const,
        }
      : statusMeta[status];
  const statusColor = getToneColor(statusInfo.tone, theme);
  const statusSoft = getToneSoft(statusInfo.tone, theme);
  const time = session?.targetTime ?? meta.defaultTime;
  const window = session
    ? `${session.windowStart} - ${session.windowEnd}`
    : meta.defaultWindow;

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
      ]}
    >
      <View style={styles.periodTop}>
        <View style={[styles.periodIcon, { backgroundColor: toneSoft }]}>
          <AppIcon name={meta.icon} color={toneColor} size={32} />
        </View>
        <View style={styles.periodBody}>
          <View style={styles.periodTitleRow}>
            <Text style={[styles.periodTitle, { color: theme.text }]}>
              Buổi {getPeriodLabel(period).toLowerCase()} · {time}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusSoft }]}>
              <AppIcon name={statusInfo.icon} color={statusColor} size={12} />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.periodWindow, { color: theme.textSecondary }]}>
            {window}
          </Text>
          <Text
            style={[styles.periodSummary, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {period === "bedtime" && medications.length
              ? `${medications.length} thuốc cần mang ngày mai · ${medications.map((med) => med.name).join(", ")}`
              : medications.length
                ? `${medications.length} thuốc · ${medications.map((med) => med.name).join(", ")}`
                : "Chưa có thuốc trong phiên này"}
          </Text>
        </View>
      </View>

      {medications.length > 0 && (
        <View style={styles.periodDoseList}>
          {medications.map((medication) => (
            <View key={medication.id} style={styles.periodDoseRow}>
              <Text
                style={[styles.periodDoseText, { color: theme.text }]}
                numberOfLines={1}
              >
                {medication.name}
              </Text>
              <Text
                style={[styles.periodDoseTime, { color: theme.textSecondary }]}
              >
                {medication.dosage}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function SessionSheet({
  period,
  session,
  onClose,
  onSaved,
}: {
  period: Period | null;
  session: AgendaSession | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [targetTime, setTargetTime] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [openPicker, setOpenPicker] = useState<TimeFieldKey | null>(null);
  const [pickerLayouts, setPickerLayouts] = useState<
    Partial<Record<TimeFieldKey, TimeFieldLayout>>
  >({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!period) return;

    const meta = periodMeta[period];
    setTargetTime(session?.targetTime ?? meta.defaultTime);
    setWindowStart(session?.windowStart ?? meta.defaultWindow.split(" - ")[0]);
    setWindowEnd(session?.windowEnd ?? meta.defaultWindow.split(" - ")[1]);
    setOpenPicker(null);
    setSaveError(null);
  }, [period, session]);

  if (!period) return null;

  const meta = periodMeta[period];
  const isBedtime = period === "bedtime";
  const config = session?.config;
  const currentTarget = session?.targetTime ?? meta.defaultTime;
  const currentStart =
    session?.windowStart ?? meta.defaultWindow.split(" - ")[0];
  const currentEnd = session?.windowEnd ?? meta.defaultWindow.split(" - ")[1];
  const dirty =
    targetTime !== currentTarget ||
    windowStart !== currentStart ||
    windowEnd !== currentEnd;
  const canSave = Boolean(config) && dirty && !saving;

  async function saveTimes() {
    if (
      !config ||
      !isTime(targetTime) ||
      !isTime(windowStart) ||
      !isTime(windowEnd)
    ) {
      setSaveError("Nhập thời gian theo định dạng HH:MM.");
      return;
    }

    setSaving(true);
    setOpenPicker(null);
    setSaveError(null);

    try {
      const saved = await saveSessionConfigTimes(config, {
        targetTime,
        windowStart,
        windowEnd,
      });

      if (!saved) {
        setSaveError("Chưa lưu được thay đổi. Bạn thử lại nhé.");
        return;
      }

      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={[styles.sheetHandle, { backgroundColor: theme.border }]}
            />
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              {isBedtime
                ? "Trước khi ngủ"
                : `Buổi ${getPeriodLabel(period).toLowerCase()}`}
            </Text>
            <Text
              style={[styles.sheetSubtitle, { color: theme.textSecondary }]}
            >
              {isBedtime
                ? "Chuẩn bị thuốc cần mang cho ngày mai."
                : "Chọn giờ uống cố định và khung giờ linh hoạt."}
            </Text>

            <View style={styles.timeEditor}>
              <TimeDropdown
                label={
                  isBedtime ? "Giờ nhắc trước khi ngủ" : "Giờ uống mục tiêu"
                }
                value={targetTime}
                helper={
                  isBedtime
                    ? "Thời điểm app nhắc bạn chuẩn bị thuốc cho ngày mai."
                    : "Thời điểm chính app dùng để nhắc uống thuốc."
                }
                open={openPicker === "target"}
                onToggle={() =>
                  setOpenPicker((current) =>
                    current === "target" ? null : "target",
                  )
                }
                onLayout={(layout) =>
                  setPickerLayouts((current) => ({
                    ...current,
                    target: layout,
                  }))
                }
              />
              <View style={styles.windowGroup}>
                <Text style={[styles.windowLabel, { color: theme.text }]}>
                  Khung giờ linh hoạt
                </Text>
                <Text
                  style={[styles.windowHelp, { color: theme.textSecondary }]}
                >
                  Uống trong giờ này vẫn tính là on-time nha.
                </Text>
                <View style={styles.timeRow}>
                  <TimeDropdown
                    compact
                    label="Từ"
                    value={windowStart}
                    open={openPicker === "start"}
                    onToggle={() =>
                      setOpenPicker((current) =>
                        current === "start" ? null : "start",
                      )
                    }
                    onLayout={(layout) =>
                      setPickerLayouts((current) => ({
                        ...current,
                        start: layout,
                      }))
                    }
                  />
                  <TimeDropdown
                    compact
                    label="Đến"
                    value={windowEnd}
                    open={openPicker === "end"}
                    onToggle={() =>
                      setOpenPicker((current) =>
                        current === "end" ? null : "end",
                      )
                    }
                    onLayout={(layout) =>
                      setPickerLayouts((current) => ({
                        ...current,
                        end: layout,
                      }))
                    }
                  />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.infoPanel,
                {
                  backgroundColor: theme.primarySoft,
                  borderColor: theme.border,
                },
              ]}
            >
              <AppIcon
                name={isBedtime ? "bag" : "bell"}
                color={theme.primary}
                size={18}
              />
              <Text style={[styles.infoText, { color: theme.text }]}>
                {isBedtime
                  ? "Mèo chỉ nhắc sương sương 1 lần trước khi đi ngủ thôi nha."
                  : 'Mèo sẽ nhắc đúng giờ. Chọn "Nhắc sau" thì 2 phút gọi lại 1 lần (tối đa 10 phút).'}
              </Text>
            </View>

            <View style={styles.sheetMeds}>
              {session?.medications.length ? (
                session.medications.map((medication) => (
                  <View
                    key={medication.id}
                    style={[
                      styles.sheetMedRow,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.sheetMedHeader}>
                      <View
                        style={[
                          styles.sheetMedIcon,
                          { backgroundColor: theme.primarySoft },
                        ]}
                      >
                        <AppIcon
                          name={isBedtime ? "bag" : "pill"}
                          color={theme.primary}
                          size={18}
                        />
                      </View>
                      <Text
                        style={[styles.sheetMedName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {medication.name}
                      </Text>
                      <Text
                        style={[
                          styles.sheetMedDose,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {medication.dosage}
                      </Text>
                    </View>
                    {medication.instructions && (
                      <Text
                        style={[
                          styles.sheetMedInstruction,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {medication.instructions}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text
                  style={[
                    styles.emptySheet,
                    { color: theme.textSecondary, borderColor: theme.border },
                  ]}
                >
                  Chưa có thuốc trong phiên này.
                </Text>
              )}
            </View>

            {saveError && (
              <Text style={[styles.saveError, { color: theme.danger }]}>
                {saveError}
              </Text>
            )}

            <View style={styles.sheetActions}>
              <Pressable
                onPress={onClose}
                style={[styles.secondaryButton, { borderColor: theme.border }]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: theme.text }]}
                >
                  Đóng
                </Text>
              </Pressable>
              <Pressable
                disabled={!canSave}
                onPress={() => void saveTimes()}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: canSave ? theme.text : theme.border,
                    opacity: canSave ? 1 : 0.7,
                  },
                ]}
              >
                <Text style={[styles.saveText, { color: theme.background }]}>
                  {saving ? "Đang lưu" : "Lưu"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
          {openPicker && pickerLayouts[openPicker] && (
            <FloatingTimeMenu
              layout={pickerLayouts[openPicker]}
              options={getTimeOptions(period, openPicker)}
              value={
                openPicker === "target"
                  ? targetTime
                  : openPicker === "start"
                    ? windowStart
                    : windowEnd
              }
              onSelect={(value) => {
                if (openPicker === "target") setTargetTime(value);
                if (openPicker === "start") setWindowStart(value);
                if (openPicker === "end") setWindowEnd(value);
                setOpenPicker(null);
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TimeDropdown({
  label,
  value,
  helper,
  open,
  compact = false,
  onToggle,
  onLayout,
}: {
  label: string;
  value: string;
  helper?: string;
  open: boolean;
  compact?: boolean;
  onToggle: () => void;
  onLayout: (layout: TimeFieldLayout) => void;
}) {
  const theme = useTheme();

  return (
    <View
      onLayout={(event) => onLayout(event.nativeEvent.layout)}
      style={[
        styles.timeField,
        compact && styles.timeFieldCompact,
        open && styles.timeFieldOpen,
      ]}
    >
      <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Pressable
        accessibilityLabel={label}
        onLayout={(event) => onLayout(event.nativeEvent.layout)}
        onPress={onToggle}
        style={[
          styles.timeSelect,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: isTime(value) ? theme.border : theme.danger,
          },
        ]}
      >
        <Text style={[styles.timeValue, { color: theme.text }]}>{value}</Text>
        <AppIcon name="chevronRight" color={theme.textSecondary} size={14} />
      </Pressable>
      {helper && (
        <Text style={[styles.timeHelper, { color: theme.textSecondary }]}>
          {helper}
        </Text>
      )}
    </View>
  );
}

function FloatingTimeMenu({
  layout,
  options,
  value,
  onSelect,
}: {
  layout: TimeFieldLayout;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
}) {
  const theme = useTheme();
  const menuWidth = Math.min(168, layout.width);
  const left = layout.x + (layout.width - menuWidth) / 2;

  return (
    <View
      style={[
        styles.timeMenu,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          left,
          top: layout.y + layout.height + 6,
          width: menuWidth,
        },
      ]}
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.timeOption,
              { backgroundColor: selected ? theme.primarySoft : "transparent" },
            ]}
          >
            <Text
              style={[
                styles.timeOptionText,
                { color: selected ? theme.primary : theme.text },
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RoundButton({
  icon,
  onPress,
  label,
}: {
  icon: AppIconName;
  onPress: () => void;
  label: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundButton,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <AppIcon name={icon} color={theme.text} size={16} />
    </Pressable>
  );
}

function getToneColor(
  tone: "primary" | "secondary" | "success" | "warning" | "danger" | "muted",
  theme: ReturnType<typeof useTheme>,
) {
  if (tone === "secondary") return theme.secondary;
  if (tone === "success") return theme.success;
  if (tone === "warning") return theme.warning;
  if (tone === "danger") return theme.danger;
  if (tone === "muted") return theme.textSecondary;
  return theme.primary;
}

function getToneSoft(
  tone: "primary" | "secondary" | "success" | "warning" | "danger" | "muted",
  theme: ReturnType<typeof useTheme>,
) {
  if (tone === "secondary") return theme.secondarySoft;
  if (tone === "success") return theme.successSoft;
  if (tone === "warning") return theme.warningSoft;
  if (tone === "danger") return theme.dangerSoft;
  if (tone === "muted") return theme.backgroundSelected;
  return theme.primarySoft;
}

function parseDateKey(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekDateKeys(date: string) {
  const { year, month, day } = parseDateKey(date);
  const selected = new Date(year, month - 1, day);
  const mondayOffset = (selected.getDay() + 6) % 7;
  const monday = new Date(selected);
  monday.setDate(selected.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return toDateKey(current);
  });
}

function formatMonthTitle(date: string) {
  const { year, month } = parseDateKey(date);
  return `Tháng ${month}, ${year}`;
}

function formatSelectedDate(date: string) {
  const { day, month } = parseDateKey(date);
  return `ngày ${day}/${month}`;
}

function getTimeOptions(period: Period, field: TimeFieldKey) {
  const byPeriod: Record<Period, Record<TimeFieldKey, string[]>> = {
    morning: {
      target: ["06:30", "07:00", "07:30", "08:00", "08:30", "09:00"],
      start: ["06:00", "06:30", "07:00", "07:30"],
      end: ["09:00", "09:30", "10:00", "10:30"],
    },
    noon: {
      target: ["11:30", "12:00", "12:30", "13:00", "13:30"],
      start: ["11:00", "11:30", "12:00"],
      end: ["13:30", "14:00", "14:30"],
    },
    afternoon: {
      target: ["15:30", "16:00", "16:30", "17:00", "17:30"],
      start: ["15:00", "15:30", "16:00"],
      end: ["17:30", "18:00", "18:30"],
    },
    evening: {
      target: ["18:30", "19:00", "19:30", "20:00", "20:30"],
      start: ["18:00", "18:30", "19:00"],
      end: ["20:30", "21:00", "21:30", "22:00"],
    },
    bedtime: {
      target: ["21:00", "21:30", "22:00", "22:30", "23:00"],
      start: ["20:30", "21:00", "21:30"],
      end: ["22:30", "23:00", "23:30"],
    },
  };

  return byPeriod[period][field];
}

function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    alignSelf: "center",
    maxWidth: MobileFrameWidth,
    paddingHorizontal: 20,
    width: "100%",
  },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 18,
  },
  monthTitleWrap: {
    alignItems: "center",
    gap: 3,
  },
  roundButton: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  monthTitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: "800",
  },
  monthSubtitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  messageCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    padding: 14,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  weekdays: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  weekRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayCell: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 0,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "800",
  },
  dayStatus: {
    alignItems: "center",
    borderRadius: 8,
    height: 16,
    justifyContent: "center",
    marginTop: 4,
    width: 16,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  legendIcon: {
    alignItems: "center",
    borderRadius: 7,
    height: 14,
    justifyContent: "center",
    width: 14,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "700",
  },
  scheduleHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
  },
  scheduleTitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: "800",
  },
  scheduleDate: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  scheduleMeta: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 22,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: 16,
    padding: 22,
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: 22,
    height: 52,
    justifyContent: "center",
    marginBottom: 12,
    width: 52,
  },
  emptyTitle: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: "800",
  },
  emptyCopy: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
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
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  periodIcon: {
    alignItems: "center",
    borderRadius: 20,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  periodBody: {
    flex: 1,
    minWidth: 0,
  },
  periodTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  periodTitle: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: "800",
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  periodWindow: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
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
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  periodDoseText: {
    flex: 1,
    fontSize: 12,
    opacity: 0.9,
  },
  periodDoseTime: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: "700",
  },
  modalBackdrop: {
    backgroundColor: "rgba(45,41,38,0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    alignSelf: "center",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxWidth: MobileFrameWidth,
    overflow: "visible",
    padding: 20,
    position: "relative",
    width: "100%",
  },
  sheetHandle: {
    alignSelf: "center",
    borderRadius: 4,
    height: 6,
    marginBottom: 16,
    width: 42,
  },
  sheetTitle: {
    fontFamily: Fonts.sans,
    fontSize: 22,
    fontWeight: "800",
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  timeEditor: {
    gap: 24,
    marginTop: 20,
  },
  windowGroup: {
    gap: 10,
  },
  windowLabel: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: "800",
  },
  windowHelp: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
  },
  timeField: {
    gap: 8,
    position: "relative",
    zIndex: 1,
  },
  timeFieldOpen: {
    elevation: 24,
    zIndex: 1000,
  },
  timeFieldCompact: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  timeSelect: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeValue: {
    fontFamily: Fonts.mono,
    fontSize: 17,
    fontWeight: "800",
  },
  timeHelper: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  timeMenu: {
    borderRadius: 14,
    borderWidth: 1,
    elevation: 24,
    gap: 4,
    padding: 6,
    position: "absolute",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    zIndex: 9999,
  },
  timeOption: {
    borderRadius: 10,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  timeOptionText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: "800",
  },
  infoPanel: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  sheetMeds: {
    gap: 10,
    marginTop: 18,
  },
  sheetMedRow: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  sheetMedHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  sheetMedIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  sheetMedName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  sheetMedDose: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: "800",
  },
  sheetMedInstruction: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    paddingLeft: 48,
  },
  emptySheet: {
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    fontSize: 13,
    fontWeight: "600",
    overflow: "hidden",
    padding: 22,
    textAlign: "center",
  },
  saveError: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: "800",
  },
  timelineTitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 22,
  },
  timeline: {
    gap: 12,
    paddingLeft: 15,
    position: "relative",
  },
  timelineLine: {
    bottom: 8,
    left: 5,
    position: "absolute",
    top: 8,
    width: 2,
  },
  timelineRow: {
    alignItems: "center",
    flexDirection: "row",
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
    fontWeight: "700",
    width: 52,
  },
  timelineIcon: {
    alignItems: "center",
    borderRadius: 9,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  timelineLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingVertical: 14,
  },
  saveText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: "800",
  },
});
