import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSizes, Primary, Spacing } from '@/constants/theme';
import { getTodayCarryLog, saveCarryLog } from '@/data/storage';
import type { Journey } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

function isOutOfHomeTime(time: string): boolean {
  return time >= '09:00' && time <= '21:00';
}

interface DoseToCarry {
  name: string;
  dosage: string;
  times: string[];
}

function getDosesToCarry(journey: Journey): DoseToCarry[] {
  return journey.medications
    .map((med) => ({
      name: med.name,
      dosage: med.dosage,
      times: med.reminderTimes.filter(isOutOfHomeTime),
    }))
    .filter((d) => d.times.length > 0);
}

export interface CarryReminderCardProps {
  journey: Journey;
  onConfirmed: () => void;
}

export default function CarryReminderCard({ journey, onConfirmed }: CarryReminderCardProps) {
  const colors = useTheme();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  const dosesToCarry = getDosesToCarry(journey);

  useEffect(() => {
    if (!dosesToCarry.length) return;
    getTodayCarryLog()
      .then((log) => {
        if (!log) setVisible(true);
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible || !dosesToCarry.length) return null;

  function handleConfirm() {
    const today = new Date().toISOString().slice(0, 10);
    saveCarryLog({ date: today, confirmedAt: new Date().toISOString() }).catch(console.error);

    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onConfirmed();
    });
  }

  return (
    <Animated.View
      style={[styles.card, { backgroundColor: colors.backgroundElement, opacity }]}>
      <ThemedText style={styles.header}>🎒 Bag Check</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        These doses need to travel with you today:
      </ThemedText>
      <View style={styles.doseList}>
        {dosesToCarry.map((d) => (
          <View key={d.name} style={styles.doseRow}>
            <ThemedText type="smallBold">{d.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {d.dosage} · {d.times.join(', ')}
            </ThemedText>
          </View>
        ))}
      </View>
      <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
        <ThemedText type="smallBold" style={styles.confirmText}>
          ✓ Packed in my bag
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  doseList: {
    gap: Spacing.one,
  },
  doseRow: {
    gap: 2,
  },
  confirmBtn: {
    backgroundColor: Primary,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  confirmText: {
    color: '#fff',
  },
});
