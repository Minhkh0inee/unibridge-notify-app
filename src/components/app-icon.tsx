import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, type ColorValue } from 'react-native';

type SymbolName = React.ComponentProps<typeof SymbolView>['name'];

export type AppIconName =
  | 'add'
  | 'back'
  | 'bell'
  | 'calendar'
  | 'camera'
  | 'chart'
  | 'check'
  | 'chevronRight'
  | 'clock'
  | 'home'
  | 'pill'
  | 'scan'
  | 'bag'
  | 'sun'
  | 'coffee'
  | 'sunset'
  | 'moon'
  | 'warning';

const icons: Record<AppIconName, { symbol: SymbolName; fallback: string }> = {
  add: { symbol: 'plus' as SymbolName, fallback: '+' },
  back: { symbol: 'chevron.left' as SymbolName, fallback: '<' },
  bell: { symbol: 'bell.fill' as SymbolName, fallback: '!' },
  calendar: { symbol: 'calendar' as SymbolName, fallback: 'C' },
  camera: { symbol: 'camera.fill' as SymbolName, fallback: '[]' },
  chart: { symbol: 'chart.bar.fill' as SymbolName, fallback: 'B' },
  check: { symbol: 'checkmark' as SymbolName, fallback: 'OK' },
  chevronRight: { symbol: 'chevron.right' as SymbolName, fallback: '>' },
  clock: { symbol: 'clock.fill' as SymbolName, fallback: 'T' },
  home: { symbol: 'house.fill' as SymbolName, fallback: 'H' },
  pill: { symbol: 'pills.fill' as SymbolName, fallback: 'Rx' },
  scan: { symbol: 'viewfinder' as SymbolName, fallback: '[]' },
  bag: { symbol: 'bag.fill' as SymbolName, fallback: 'B' },
  sun: { symbol: 'sun.max.fill' as SymbolName, fallback: 'S' },
  coffee: { symbol: 'cup.and.saucer.fill' as SymbolName, fallback: 'M' },
  sunset: { symbol: 'sunset.fill' as SymbolName, fallback: 'E' },
  moon: { symbol: 'moon.fill' as SymbolName, fallback: 'N' },
  warning: { symbol: 'exclamationmark.triangle.fill' as SymbolName, fallback: '!' },
};

export function AppIcon({
  name,
  size = 20,
  color,
}: {
  name: AppIconName;
  size?: number;
  color: ColorValue;
}) {
  const icon = icons[name];

  return (
    <SymbolView
      name={icon.symbol}
      size={size}
      tintColor={color}
      fallback={<Text style={[styles.fallback, { color, fontSize: Math.max(10, size * 0.52) }]}>{icon.fallback}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
});
