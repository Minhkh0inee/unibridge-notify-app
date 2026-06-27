import { LEVEL_CONFIGS, TEST_ADVANCE_LEVEL_ON_IGNORE } from './escalation-levels';
import type { LevelConfig } from './escalation-levels';

describe('escalation-levels', () => {
  describe('LEVEL_CONFIGS', () => {
    it('exports exactly three level configs', () => {
      expect(LEVEL_CONFIGS).toHaveLength(3);
    });

    it('each level has all required fields', () => {
      const requiredFields: (keyof LevelConfig)[] = [
        'emoji',
        'backgroundColor',
        'textColor',
        'text',
        'soundVolume',
      ];
      for (const config of LEVEL_CONFIGS) {
        for (const field of requiredFields) {
          expect(config).toHaveProperty(field);
        }
      }
    });

    describe('level 0 (gentle)', () => {
      it('has a low sound volume', () => {
        expect(LEVEL_CONFIGS[0].soundVolume).toBe(0.3);
      });

      it('has a non-empty message text', () => {
        expect(LEVEL_CONFIGS[0].text.length).toBeGreaterThan(0);
      });

      it('has an emoji', () => {
        expect(LEVEL_CONFIGS[0].emoji.length).toBeGreaterThan(0);
      });
    });

    describe('level 1 (warning)', () => {
      it('has a higher sound volume than level 0', () => {
        expect(LEVEL_CONFIGS[1].soundVolume).toBeGreaterThan(LEVEL_CONFIGS[0].soundVolume);
      });

      it('sound volume is 0.7', () => {
        expect(LEVEL_CONFIGS[1].soundVolume).toBe(0.7);
      });
    });

    describe('level 2 (urgent)', () => {
      it('has the highest sound volume (1.0)', () => {
        expect(LEVEL_CONFIGS[2].soundVolume).toBe(1.0);
      });

      it('has a higher sound volume than level 1', () => {
        expect(LEVEL_CONFIGS[2].soundVolume).toBeGreaterThan(LEVEL_CONFIGS[1].soundVolume);
      });

      it('text contains urgency language', () => {
        const text = LEVEL_CONFIGS[2].text.toLowerCase();
        const isUrgent =
          text.includes('resist') ||
          text.includes('skip') ||
          text.includes('urgent') ||
          text.includes('bacteria') ||
          text.includes('warning');
        expect(isUrgent).toBe(true);
      });
    });

    it('sound volumes are strictly increasing across levels', () => {
      expect(LEVEL_CONFIGS[0].soundVolume).toBeLessThan(LEVEL_CONFIGS[1].soundVolume);
      expect(LEVEL_CONFIGS[1].soundVolume).toBeLessThan(LEVEL_CONFIGS[2].soundVolume);
    });
  });

  describe('TEST_ADVANCE_LEVEL_ON_IGNORE', () => {
    it('is a boolean', () => {
      expect(typeof TEST_ADVANCE_LEVEL_ON_IGNORE).toBe('boolean');
    });
  });
});
