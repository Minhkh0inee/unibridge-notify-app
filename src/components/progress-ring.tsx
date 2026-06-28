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
  const completedSegments = percent === 0 ? 0 : Math.min(4, Math.ceil(percent / 25));
  const baseColor = theme.primarySoft;
  const progressColor = theme.primary;

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: baseColor,
          borderTopColor: completedSegments >= 1 ? progressColor : baseColor,
          borderRightColor: completedSegments >= 2 ? progressColor : baseColor,
          borderBottomColor: completedSegments >= 3 ? progressColor : baseColor,
          borderLeftColor: completedSegments >= 4 ? progressColor : baseColor,
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
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
  },
});
