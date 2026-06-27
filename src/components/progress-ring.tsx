import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function ProgressRing({
  value,
  size = 56,
}: {
  value: number;
  size?: number;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const percent = Math.round(clamped * 100);
  const borderWidth = Math.max(5, Math.round(size * 0.1));

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: theme.primarySoft,
          borderTopColor: theme.primary,
          borderRightColor: percent > 35 ? theme.primary : theme.primarySoft,
          borderBottomColor: percent > 70 ? theme.primary : theme.primarySoft,
        },
      ]}>
      <Text style={[styles.text, { color: theme.text }]}>{percent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    transform: [{ rotate: '-45deg' }],
  },
});
