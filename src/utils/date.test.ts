import { sevenDaysAgo } from './date';

describe('date utils', () => {
  describe('sevenDaysAgo', () => {
    it('returns a Date 7 days before now within 1 second tolerance', () => {
      const before = Date.now();
      const result = sevenDaysAgo();
      const after = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(result.getTime()).toBeGreaterThanOrEqual(before - sevenDaysMs - 1000);
      expect(result.getTime()).toBeLessThanOrEqual(after - sevenDaysMs + 1000);
    });

    it('result is less than now', () => {
      expect(sevenDaysAgo().getTime()).toBeLessThan(Date.now());
    });

    it('result is approximately 7 days ago', () => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const diff = Date.now() - sevenDaysAgo().getTime();
      expect(diff).toBeGreaterThanOrEqual(sevenDaysMs - 1000);
      expect(diff).toBeLessThanOrEqual(sevenDaysMs + 1000);
    });
  });

  describe('today date string', () => {
    it('matches YYYY-MM-DD format', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('matches the current year', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(today.startsWith(String(new Date().getFullYear()))).toBe(true);
    });
  });
});
