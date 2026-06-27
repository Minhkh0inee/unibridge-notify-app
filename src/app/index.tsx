import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useMedications, type MedicationWithSchedules } from '@/hooks/use-medications';
import { supabase } from '@/lib/supabase';
import { BottomTabInset, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Ngày mai';
  if (diffDays > 0) return `Còn ${diffDays} ngày`;
  if (diffDays === -1) return 'Hôm qua';
  return `${Math.abs(diffDays)} ngày trước`;
}

function getSessionLabel(sessionName: string) {
  const labels: Record<string, string> = {
    morning: 'Sáng',
    noon: 'Trưa',
    afternoon: 'Chiều',
    evening: 'Tối',
    bedtime: 'Trước ngủ',
  };
  return labels[sessionName] || sessionName;
}

function MedicationCard({ medication }: { medication: MedicationWithSchedules }) {
  const theme = useTheme();
  const sessions = medication.schedules.map((s) => getSessionLabel(s.session_name)).join(' · ');
  const daysRemaining = medication.end_date ? formatDate(medication.end_date) : null;

  return (
    <TouchableOpacity
      style={[styles.medicationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.medicationName, { color: theme.text }]}>{medication.name}</Text>
          {medication.strength && (
            <View style={[styles.strengthBadge, { backgroundColor: theme.accentTint }]}>
              <Text style={[styles.strengthText, { color: theme.accent }]}>{medication.strength}</Text>
            </View>
          )}
        </View>
        {daysRemaining && (
          <Text style={[styles.daysRemaining, { color: theme.textSecondary }]}>{daysRemaining}</Text>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.dosageRow}>
          <Text style={[styles.dosageText, { color: theme.text }]}>
            {medication.dosage_amount} {medication.dosage_unit}
          </Text>
          <Text style={[styles.separator, { color: theme.textSecondary }]}>·</Text>
          <Text style={[styles.sessionText, { color: theme.textSecondary }]}>{sessions}</Text>
        </View>

        {medication.food_instruction && (
          <View style={[styles.foodBadge, { backgroundColor: theme.accentTint }]}>
            <Text style={[styles.foodText, { color: theme.accent }]}>
              {medication.food_instruction === 'before' && '🍽️ Trước ăn'}
              {medication.food_instruction === 'after' && '🍽️ Sau ăn'}
              {medication.food_instruction === 'during' && '🍽️ Trong khi ăn'}
            </Text>
          </View>
        )}
      </View>

      {medication.notes && (
        <Text style={[styles.notes, { color: theme.textSecondary }]} numberOfLines={2}>
          {medication.notes}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { medications, loading, error } = useMedications();
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng');
    else if (hour < 18) setGreeting('Chào buổi chiều');
    else setGreeting('Chào buổi tối');

    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.user_metadata?.name) {
        setUserName(data.user.user_metadata.name);
      }
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.text }]}>
              {greeting}
              {userName && `, ${userName}`}!
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {medications.length > 0
                ? `Hôm nay bạn có ${medications.reduce((acc, m) => acc + m.schedules.length, 0)} lần uống thuốc`
                : 'Chưa có lịch thuốc nào'}
            </Text>
          </View>
          <View style={[styles.mascotCircle, { backgroundColor: theme.accentTint }]}>
            <Text style={styles.mascotEmoji}>😺</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Đang tải...</Text>
            </View>
          ) : error ? (
            <View style={[styles.errorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.errorText, { color: theme.text }]}>Không thể tải dữ liệu</Text>
              <Text style={[styles.errorDetail, { color: theme.textSecondary }]}>{error}</Text>
            </View>
          ) : medications.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={styles.emptyEmoji}>💊</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Chưa có lịch thuốc nào</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Thêm loại thuốc đầu tiên để Mèo Miu bắt đầu nhắc bạn nhé
              </Text>
            </View>
          ) : (
            <View style={styles.medicationList}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Thuốc đang dùng</Text>
              {medications.map((med) => (
                <MedicationCard key={med.id} medication={med} />
              ))}
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/add-medication')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  greeting: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },
  subtitle: {
    fontSize: FontSizes.md,
    marginTop: Spacing.one,
  },
  mascotCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotEmoji: {
    fontSize: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + 80,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.eight,
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: FontSizes.md,
  },
  errorCard: {
    padding: Spacing.four,
    borderRadius: BorderRadius.large,
    borderWidth: 1.5,
    gap: Spacing.two,
  },
  errorText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  errorDetail: {
    fontSize: FontSizes.sm,
  },
  emptyState: {
    padding: Spacing.six,
    borderRadius: BorderRadius.large,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.six,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    maxWidth: 280,
  },
  medicationList: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.two,
  },
  medicationCard: {
    padding: Spacing.four,
    borderRadius: BorderRadius.large,
    borderWidth: 1.5,
    gap: Spacing.three,
  },
  cardHeader: {
    gap: Spacing.two,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  medicationName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  strengthBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.small,
  },
  strengthText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  daysRemaining: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  cardBody: {
    gap: Spacing.two,
  },
  dosageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dosageText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  separator: {
    fontSize: FontSizes.md,
  },
  sessionText: {
    fontSize: FontSizes.md,
  },
  foodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.small,
  },
  foodText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  notes: {
    fontSize: FontSizes.sm,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: FontWeights.bold,
  },
});
