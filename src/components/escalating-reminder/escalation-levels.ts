export type EscalationLevel = 0 | 1 | 2 | 3 | 4;

// TEMP TEST FLAG: set back to false after validating all five reminder levels.
export const TEST_ADVANCE_LEVEL_ON_IGNORE = true;

export interface LevelConfig {
  emoji: string;
  imageSrc: number | null;
  backgroundColor: string;
  textColor: string;
  text: string;
  soundVolume: number;
}

export const LEVEL_CONFIGS: readonly [LevelConfig, LevelConfig, LevelConfig, LevelConfig, LevelConfig] = [
  {
    emoji: '😊',
    imageSrc: null,
    backgroundColor: '#208AEF',
    textColor: '#FFFFFF',
    text: 'Time to take your medicine!',
    soundVolume: 0.3,
  },
  {
    emoji: '😟',
    imageSrc: null,
    backgroundColor: '#F5C842',
    textColor: '#1A1A1A',
    text: "You've been waiting — please take your dose now.",
    soundVolume: 0.6,
  },
  {
    emoji: '😰',
    imageSrc: null,
    backgroundColor: '#F97316',
    textColor: '#FFFFFF',
    text: "This is important — don't skip your dose.",
    soundVolume: 0.75,
  },
  {
    emoji: '😠',
    imageSrc: null,
    backgroundColor: '#E53E3E',
    textColor: '#FFFFFF',
    text: "You're putting your health at risk!",
    soundVolume: 0.9,
  },
  {
    emoji: '🚨',
    imageSrc: null,
    backgroundColor: '#7F1D1D',
    textColor: '#FFFFFF',
    text: "You're skipping your dose! The bacteria are becoming resistant!",
    soundVolume: 1.0,
  },
];

// Metro resolves require() at bundle time, so only reference files that exist.
export const SOUND_SOURCES: (number | null)[] = [
  require('@/assets/sounds/gentle.mp3'),
  require('@/assets/sounds/warning.mp3'),
  require('@/assets/sounds/level_3.mp3'),
  require('@/assets/sounds/level_4.mp3'),
  require('@/assets/sounds/urgent.mp3'),
];
