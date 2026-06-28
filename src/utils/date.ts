export function sevenDaysAgo(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function getGreetingText(name = 'Ngọc'): string {
  const timeOfDay = getTimeOfDay();
  const emoji = timeOfDay === 'morning' ? '🌤️' : timeOfDay === 'afternoon' ? '☀️' : '🌙';
  const prefix =
    timeOfDay === 'morning'
      ? 'Chào buổi sáng'
      : timeOfDay === 'afternoon'
      ? 'Chào buổi chiều'
      : 'Chào buổi tối';
  return `${prefix} ${name} ${emoji}`;
}
