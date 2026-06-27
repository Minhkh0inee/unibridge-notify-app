/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Warm paper design system
export const Colors = {
  light: {
    text: '#1F2421',
    background: '#F6F1E8',
    surface: '#FBF7EF',
    surfaceWhite: '#FFFFFF',
    border: '#E2D9C8',
    textSecondary: '#8A8A80',
    accent: '#C8853F',
    accentHover: '#A86B2C',
    accentTint: '#F0E3D0',
    darkBlock: '#2A2723',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#EF4444',
    sessionMorning: '#FFF4E6',
    sessionNoon: '#FFF9E6',
    sessionAfternoon: '#FFEDD5',
    sessionEvening: '#E8D4F9',
    sessionBedtime: '#E0E7FF',
  },
  dark: {
    text: '#F6F1E8',
    background: '#1F2421',
    surface: '#2A2723',
    surfaceWhite: '#3A3633',
    border: '#4A453F',
    textSecondary: '#B0ABA0',
    accent: '#D4954D',
    accentHover: '#E0A563',
    accentTint: '#3D3830',
    darkBlock: '#14110F',
    success: '#66BB6A',
    warning: '#FFA726',
    error: '#EF5350',
    sessionMorning: '#2A2520',
    sessionNoon: '#2A2720',
    sessionAfternoon: '#2A2420',
    sessionEvening: '#252229',
    sessionBedtime: '#212329',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    display: 'ui-serif',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    display: 'serif',
  },
  web: {
    sans: 'Inter, -apple-system, system-ui, sans-serif',
    serif: 'ui-serif, Georgia, serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace, monospace',
    display: 'DM Serif Display, ui-serif, Georgia, serif',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
  eight: 96,
} as const;

export const BorderRadius = {
  small: 8,
  medium: 12,
  large: 20,
  xlarge: 28,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1200;

export const FontSizes = {
  xs:  12,
  sm:  14,
  md:  16,
  lg:  18,
  xl:  22,
  xxl: 28,
  xxxl: 36,
  display: 48,
} as const;

export const FontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Primary = '#C8853F' as const;
