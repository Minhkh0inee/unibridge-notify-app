import type { SessionName } from '@/types/database.types';

export const SESSION_COLORS: Record<SessionName, string> = {
  morning: '#FDB44B',
  noon: '#FF8C42',
  afternoon: '#F4A261',
  evening: '#9D84B7',
  bedtime: '#5B7C99',
};

export const SESSION_LABELS: Record<SessionName, string> = {
  morning: 'Buổi sáng',
  noon: 'Buổi trưa',
  afternoon: 'Buổi chiều',
  evening: 'Buổi tối',
  bedtime: 'Trước khi ngủ',
};

export const DEFAULT_SESSION_TIMES: Record<SessionName, string> = {
  morning: '08:00',
  noon: '12:00',
  afternoon: '17:00',
  evening: '20:00',
  bedtime: '22:30',
};

export const SESSION_ORDER: SessionName[] = ['morning', 'noon', 'afternoon', 'evening', 'bedtime'];
