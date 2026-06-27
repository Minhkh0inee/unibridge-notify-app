import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useCallback, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Primary, Spacing } from '@/constants/theme';
import { getActiveJourney, logDose, readDoseLogs } from '@/data/storage';
import type { DoseLog, Journey, Medication } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

// Helper to determine time-of-day greeting
function getTimeOfDayGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return `Chào buổi sáng, ${name}!`;
  } else if (hour >= 11 && hour < 14) {
    return `Chào buổi trưa, ${name}!`;
  } else if (hour >= 14 && hour < 18) {
    return `Chào buổi chiều, ${name}!`;
  } else {
    return `Chào buổi tối, ${name}!`;
  }
}

// Helper to map 24h times to natural Vietnamese meal/time sessions
function mapTimesToSessions(times: string[]): string {
  const sessions: string[] = [];
  times.forEach((time) => {
    const hour = parseInt(time.split(':')[0], 10);
    if (hour >= 5 && hour < 11) {
      if (!sessions.includes('Sáng')) sessions.push('Sáng');
    } else if (hour >= 11 && hour < 14) {
      if (!sessions.includes('Trưa')) sessions.push('Trưa');
    } else if (hour >= 14 && hour < 18) {
      if (!sessions.includes('Chiều')) sessions.push('Chiều');
    } else {
      if (!sessions.includes('Tối')) sessions.push('Tối');
    }
  });

  if (sessions.length === 0) return 'Chưa đặt giờ';
  if (sessions.length === 1) return sessions[0];
  if (sessions.length === 2) return `${sessions[0]} và ${sessions[1]}`;
  return `${sessions.slice(0, -1).join(', ')} và ${sessions[sessions.length - 1]}`;
}

// Helper to calculate remaining duration
function getRemainingDays(endDateStr?: string): string {
  if (!endDateStr) return 'Dài hạn';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(endDateStr);
  endDate.setHours(0, 0, 0, 0);
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Đã kết thúc';
  if (diffDays === 0) return 'Ngày cuối cùng';
  return `Còn ${diffDays} ngày`;
}

// Get local date string YYYY-MM-DD
function getLocalDateString(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const [activeJourney, setActiveJourneyData] = useState<Journey | null>(null);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [userName] = useState('Ngọc');

  // Load and refresh dashboard data
  const loadData = useCallback(async () => {
    try {
      const journey = await getActiveJourney();
      setActiveJourneyData(journey);
      const allLogs = await readDoseLogs();
      setLogs(allLogs);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Filter for active (non-ended) medications
  const activeMedications = (activeJourney?.medications ?? []).filter(
    (med) => med.status !== 'ended'
  );

  // Helper to determine status of a specific dose time today
  const getDoseStatus = useCallback((medId: string, time: string): 'taken' | 'ignored' | 'pending' | 'late' => {
    const todayLocalDate = getLocalDateString();
    
    // Find log for this medication, scheduled time, and local date today
    const matchingLog = logs.find((l) => {
      const logDate = l.actionTakenAt.split('T')[0];
      return l.medicationId === medId && l.scheduledTime === time && logDate === todayLocalDate;
    });

    if (matchingLog) {
      if (matchingLog.status === 'taken') return 'taken';
      if (matchingLog.status === 'ignored') return 'ignored';
    }

    // Check if scheduled time has passed
    const now = new Date();
    const currentHH = now.getHours();
    const currentMM = now.getMinutes();
    const [schedHH, schedMM] = time.split(':').map(Number);
    const isPast = (currentHH > schedHH) || (currentHH === schedHH && currentMM >= schedMM);

    return isPast ? 'late' : 'pending';
  }, [logs]);

  // Handle logging dose directly from dashboard
  const handleLogDoseAction = async (medId: string, time: string, status: 'taken' | 'ignored') => {
    try {
      const log: DoseLog = {
        medicationId: medId,
        scheduledTime: time,
        actionTakenAt: new Date().toISOString(),
        status,
      };
      await logDose(log);
      await loadData();
    } catch (e) {
      console.error('Error logging dose:', e);
    }
  };

  // Calculate stats for progress bar
  let totalDosesToday = 0;
  let completedDosesToday = 0;
  let nextMilestoneText = 'Không còn lịch hôm nay';

  interface ScheduledDose {
    medication: Medication;
    time: string;
    status: 'taken' | 'ignored' | 'pending' | 'late';
  }

  const allScheduledDosesToday: ScheduledDose[] = [];

  activeMedications.forEach((med) => {
    // If paused, the medication schedule is temporarily suspended
    if (med.status === 'paused') return;
    
    (med.reminderTimes ?? []).forEach((time) => {
      const status = getDoseStatus(med.id, time);
      totalDosesToday++;
      if (status === 'taken') {
        completedDosesToday++;
      }
      allScheduledDosesToday.push({ medication: med, time, status });
    });
  });

  // Find next upcoming milestone
  // Filter for pending or late doses, sorted chronologically
  const incompleteDoses = allScheduledDosesToday
    .filter((d) => d.status === 'pending' || d.status === 'late')
    .sort((a, b) => a.time.localeCompare(b.time));

  if (incompleteDoses.length > 0) {
    const nextDose = incompleteDoses[0];
    nextMilestoneText = `Tiếp theo: ${nextDose.medication.name} lúc ${nextDose.time}`;
  }

  // Sort medications based on upcoming doses
  // 1. Closest upcoming (pending/late) dose today appears first
  // 2. Then medications with only completed/ignored doses
  // 3. Then paused medications
  const sortedMedications = [...activeMedications].sort((a, b) => {
    if (a.status === 'paused' && b.status !== 'paused') return 1;
    if (b.status === 'paused' && a.status !== 'paused') return -1;
    if (a.status === 'paused' && b.status === 'paused') return a.name.localeCompare(b.name);

    const nextDoseA = allScheduledDosesToday
      .filter((d) => d.medication.id === a.id && (d.status === 'pending' || d.status === 'late'))
      .sort((x, y) => x.time.localeCompare(y.time))[0];

    const nextDoseB = allScheduledDosesToday
      .filter((d) => d.medication.id === b.id && (d.status === 'pending' || d.status === 'late'))
      .sort((x, y) => x.time.localeCompare(y.time))[0];

    if (nextDoseA && nextDoseB) {
      return nextDoseA.time.localeCompare(nextDoseB.time);
    }
    if (nextDoseA && !nextDoseB) return -1;
    if (!nextDoseA && nextDoseB) return 1;

    // Both completed or no schedule, sort by name
    return a.name.localeCompare(b.name);
  });

  const progressPercentage = totalDosesToday > 0 ? (completedDosesToday / totalDosesToday) * 100 : 0;

  // Render form-specific icons
  const renderFormIcon = (form?: string) => {
    let iconName: { ios: string; android: string; web: string } = {
      ios: 'pills.fill',
      android: 'pill',
      web: 'pill',
    };

    if (form === 'Bình xịt' || form === 'Xịt') {
      iconName = { ios: 'wind', android: 'air', web: 'wind' };
    } else if (form === 'Siro' || form === 'Dịch' || form === 'Lỏng') {
      iconName = { ios: 'drop.fill', android: 'water_drop', web: 'tint' };
    } else if (form === 'Viên sủi') {
      iconName = { ios: 'bubbles.and.sparkles.fill', android: 'bubble_chart', web: 'bolt' };
    }

    return (
      <SymbolView
        tintColor={theme.textSecondary}
        name={iconName as any}
        size={24}
        style={styles.medIcon}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.greetingRow}>
              <ThemedText type="subtitle" style={styles.greetingText}>
                {getTimeOfDayGreeting(userName)}
              </ThemedText>
              <Image
                source={require('@/assets/images/cat_mascot.png')}
                style={styles.mascotImage}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
              Hôm nay mình có {totalDosesToday} lần uống thuốc.
            </ThemedText>
          </View>
          <View style={styles.headerRightActions}>
            <Pressable
              style={({ pressed }) => [styles.addHeaderBtn, pressed && styles.pressed]}
              onPress={() => router.push('/add-medication')}>
              <SymbolView
                tintColor={Primary}
                name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'plus-circle' } as any}
                size={28}
              />
            </Pressable>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarCircle, { backgroundColor: Primary }]}>
                <Text style={styles.avatarInitials}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
          showsVerticalScrollIndicator={false}>
          
          {/* Progress Today Section */}
          <ThemedView type="backgroundElement" style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <ThemedText type="smallBold">
                Đã hoàn thành {completedDosesToday}/{totalDosesToday} lần
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.milestoneText}>
                {nextMilestoneText}
              </ThemedText>
            </View>

            {/* Premium Progress Bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: Primary,
                  },
                ]}
              />
            </View>
          </ThemedView>

          <Pressable
            style={({ pressed }) => [styles.addMedicationCta, pressed && styles.pressed]}
            onPress={() => router.push('/add-medication')}>
            <View style={styles.addMedicationCtaIcon}>
              <SymbolView
                tintColor="#ffffff"
                name={{ ios: 'plus', android: 'add', web: 'plus' } as any}
                size={20}
              />
            </View>
            <View style={styles.addMedicationCtaTextWrap}>
              <ThemedText type="smallBold" style={styles.addMedicationCtaTitle}>
                Thêm đơn thuốc
              </ThemedText>
              <ThemedText type="small" style={styles.addMedicationCtaSubtitle}>
                Tạo lịch uống mới cho ngày hôm nay
              </ThemedText>
            </View>
          </Pressable>

          {/* Medication List Section */}
          <View style={styles.medicationListHeader}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              DANH SÁCH THUỐC
            </ThemedText>
          </View>

          {sortedMedications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <SymbolView
                tintColor={theme.textSecondary}
                name={{ ios: 'square.stack.3d.up.slash', android: 'hourglass_empty', web: 'inbox' } as any}
                size={48}
              />
              <ThemedText style={styles.emptyText} themeColor="textSecondary">
                Không có thuốc nào đang hoạt động
              </ThemedText>
              <Pressable
                style={[styles.btn, { backgroundColor: Primary, marginTop: Spacing.two, paddingHorizontal: Spacing.four }]}
                onPress={() => router.push('/add-medication')}>
                <Text style={styles.btnText}>+ Thêm thuốc mới</Text>
              </Pressable>
            </View>
          ) : (
            sortedMedications.map((med) => {
              const remainingText = getRemainingDays(med.endDate);
              const sessionsText = mapTimesToSessions(med.reminderTimes ?? []);
              
              // Get schedules for this specific medication
              const medSchedules = allScheduledDosesToday.filter(
                (d) => d.medication.id === med.id
              );

              return (
                <Pressable
                  key={med.id}
                  style={({ pressed }) => [
                    styles.cardPressable,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    router.push({
                      pathname: '/medication-details',
                      params: { id: med.id },
                    });
                  }}>
                  <ThemedView type="backgroundElement" style={styles.medCard}>
                    {med.status === 'paused' && (
                      <View style={styles.pausedBanner}>
                        <ThemedText type="code" style={styles.pausedBannerText}>
                          ĐANG TẠM DỪNG
                        </ThemedText>
                      </View>
                    )}
                    
                    <View style={styles.cardHeader}>
                      {renderFormIcon(med.form)}
                      <View style={styles.cardTitleContainer}>
                        <ThemedText type="smallBold" style={styles.medName}>
                          {med.name}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {med.dosage} • {sessionsText}
                        </ThemedText>
                      </View>
                      <View style={styles.durationBadge}>
                        <ThemedText type="code" themeColor="textSecondary">
                          {remainingText}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Today's Schedule and Actions on Card */}
                    {med.status !== 'paused' && medSchedules.length > 0 && (
                      <View style={styles.scheduleSection}>
                        <ThemedText type="code" themeColor="textSecondary" style={styles.scheduleTitle}>
                          Lịch hôm nay:
                        </ThemedText>
                        {medSchedules.map((sched, idx) => {
                          let badgeBg = '#E6F0FA';
                          let badgeText = '#208AEF';
                          let statusLabel = 'Sắp tới';
                          let showActions = true;

                          if (sched.status === 'taken') {
                            badgeBg = '#E6F6ED';
                            badgeText = '#28A745';
                            statusLabel = 'Đã uống';
                            showActions = false;
                          } else if (sched.status === 'ignored') {
                            badgeBg = '#F3F4F6';
                            badgeText = '#6B7280';
                            statusLabel = 'Đã bỏ qua';
                            showActions = false;
                          } else if (sched.status === 'late') {
                            badgeBg = '#FDF2F2';
                            badgeText = '#DC3545';
                            statusLabel = 'Trễ';
                          }

                          return (
                            <View key={idx} style={styles.doseRow}>
                              <View style={styles.doseTimeAndBadge}>
                                <ThemedText type="smallBold" style={styles.doseTimeText}>
                                  {sched.time}
                                </ThemedText>
                                <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                                  <Text style={[styles.statusBadgeText, { color: badgeText }]}>
                                    {statusLabel}
                                  </Text>
                                </View>
                              </View>

                              {showActions && (
                                <View style={styles.doseActions}>
                                  <Pressable
                                    onPress={() => handleLogDoseAction(med.id, sched.time, 'ignored')}
                                    style={({ pressed }) => [
                                      styles.actionBtn,
                                      styles.actionBtnIgnore,
                                      pressed && styles.pressed,
                                    ]}>
                                    <SymbolView
                                      tintColor="#DC3545"
                                      name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'times-circle' } as any}
                                      size={20}
                                    />
                                  </Pressable>
                                  <Pressable
                                    onPress={() => handleLogDoseAction(med.id, sched.time, 'taken')}
                                    style={({ pressed }) => [
                                      styles.actionBtn,
                                      styles.actionBtnTake,
                                      pressed && styles.pressed,
                                    ]}>
                                    <SymbolView
                                      tintColor="#28A745"
                                      name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check-circle' } as any}
                                      size={20}
                                    />
                                  </Pressable>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </ThemedView>
                </Pressable>
              );
            })
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  headerLeft: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
  },
  mascotImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  subtitleText: {
    marginTop: Spacing.half,
  },
  avatarContainer: {
    marginLeft: Spacing.three,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  progressContainer: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  milestoneText: {
    fontSize: 12,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#E0E1E6',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  addMedicationCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: Primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  addMedicationCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMedicationCtaTextWrap: {
    flex: 1,
  },
  addMedicationCtaTitle: {
    color: '#ffffff',
    fontSize: 15,
  },
  addMedicationCtaSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  medicationListHeader: {
    marginTop: Spacing.two,
    marginBottom: Spacing.half,
  },
  cardPressable: {
    width: '100%',
  },
  medCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  pausedBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFBEB',
    paddingVertical: 2,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  pausedBannerText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medIcon: {
    marginRight: Spacing.two,
  },
  cardTitleContainer: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
  },
  durationBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scheduleSection: {
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    gap: Spacing.two,
  },
  scheduleTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  doseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 8,
  },
  doseTimeAndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  doseTimeText: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  doseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionBtn: {
    padding: Spacing.one,
    borderRadius: 6,
  },
  actionBtnIgnore: {
    backgroundColor: '#FDF2F2',
  },
  actionBtnTake: {
    backgroundColor: '#E6F6ED',
  },
  pressed: {
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addHeaderBtn: {
    padding: Spacing.one,
  },
  btn: {
    paddingVertical: Spacing.two,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
