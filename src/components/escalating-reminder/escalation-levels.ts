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
    imageSrc: require('@/assets/mascot/cat-wave.png'),
    backgroundColor: '#208AEF',
    textColor: '#FFFFFF',
    text: 'Đến giờ uống thuốc rồi bạn nhé!',
    soundVolume: 0.3,
  },
  {
    emoji: '😟',
    imageSrc: require('@/assets/mascot/cat-waiting.png'),
    backgroundColor: '#F5C842',
    textColor: '#1A1A1A',
    text: 'Liều thuốc vẫn đang chờ bạn. Uống ngay khi thuận tiện nhé.',
    soundVolume: 0.6,
  },
  {
    emoji: '😰',
    imageSrc: require('@/assets/mascot/cat-waiting.png'),
    backgroundColor: '#F97316',
    textColor: '#FFFFFF',
    text: 'Liều này quan trọng lắm. Bạn cố gắng đừng bỏ lỡ nhé.',
    soundVolume: 0.75,
  },
  {
    emoji: '😠',
    imageSrc: require('@/assets/mascot/cat-impatient.png'),
    backgroundColor: '#E53E3E',
    textColor: '#FFFFFF',
    text: 'Đã trễ một lúc rồi. Hãy ưu tiên uống thuốc ngay khi có thể.',
    soundVolume: 0.9,
  },
  {
    emoji: '🚨',
    imageSrc: require('@/assets/mascot/cat-impatient.png'),
    backgroundColor: '#7F1D1D',
    textColor: '#FFFFFF',
    text: 'Bạn chưa thể uống lúc này phải không? Mình có thể nhắc lại sau.',
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
