import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSchedules } from '@/contexts/SchedulesContext';
import { Spacing } from '@/constants/theme';
import { DayCell } from './DayCell';

interface CalendarGridProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function CalendarGrid({ selectedDate, onDateSelect }: CalendarGridProps) {
  const theme = useTheme();
  const { getSchedulesForDate } = useSchedules();
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const { days, monthLabel } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const monthLabel = new Intl.DateTimeFormat('vi-VN', {
      month: 'long',
      year: 'numeric'
    }).format(currentMonth);

    const daysArray: (Date | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      daysArray.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(new Date(year, month, day));
    }

    return { days: daysArray, monthLabel };
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goToPreviousMonth} style={styles.navButton}>
          <Text style={[styles.navText, { color: theme.text }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.text }]}>
          {monthLabel}
        </Text>
        <Pressable onPress={goToNextMonth} style={styles.navButton}>
          <Text style={[styles.navText, { color: theme.text }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
          <Text key={day} style={[styles.weekdayText, { color: theme.subtext }]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.emptyCell} />;
          }

          const dateStr = date.toDateString();
          const isToday = dateStr === today.toDateString();
          const isSelected = dateStr === selectedDate.toDateString();
          const hasSchedules = getSchedulesForDate(date).length > 0;
          const isDisabled = false;

          return (
            <DayCell
              key={date.getTime()}
              day={date.getDate()}
              isToday={isToday}
              isSelected={isSelected}
              hasSchedules={hasSchedules}
              isDisabled={isDisabled}
              onPress={() => onDateSelect(date)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  navButton: {
    padding: Spacing.two,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    fontSize: 28,
    fontWeight: '300',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.two,
  },
  weekdayText: {
    width: 44,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  emptyCell: {
    width: 44,
    height: 44,
  },
});
