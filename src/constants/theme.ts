/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2D2926',
    background: '#FDFBF7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#FFF1EE',
    textSecondary: '#8E8882',
    border: '#ECE5DD',
    primary: '#FF8A65',
    primarySoft: '#FFF1EE',
    primaryForeground: '#FFFFFF',
    secondary: '#6BAAA6',
    secondarySoft: '#E9F4F3',
    success: '#34A26F',
    successSoft: '#EAF7EF',
    warning: '#D7902C',
    warningSoft: '#FFF4D8',
    danger: '#D85F4F',
    dangerSoft: '#FDECE8',
    cardShadow: '#2D2926',
  },
  dark: {
    text: '#FFF8F0',
    background: '#191614',
    backgroundElement: '#27221F',
    backgroundSelected: '#3A2B26',
    textSecondary: '#B9AFA6',
    border: '#3A342F',
    primary: '#FF9C78',
    primarySoft: '#3A2B26',
    primaryForeground: '#201513',
    secondary: '#94C9C5',
    secondarySoft: '#203332',
    success: '#67C994',
    successSoft: '#183529',
    warning: '#E5AF55',
    warningSoft: '#3A2F18',
    danger: '#EE806E',
    dangerSoft: '#3A211E',
    cardShadow: '#000000',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
export const MobileFrameWidth = 430;

export const FontSizes = {
  xs:  10,
  sm:  12,
  md:  14,
  lg:  16,
  xl:  20,
  xxl: 24,
} as const;

export const Primary = Colors.light.primary;
