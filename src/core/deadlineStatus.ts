import { toMinutes } from './time';
import { formatDuration } from './daySummary';

export type DeadlineLevel = 'ok' | 'soon' | 'late';

export function deadlineStatus(deadline: string, nowMin: number): { text: string; level: DeadlineLevel } {
  const remaining = toMinutes(deadline) - nowMin;
  if (remaining <= 0) {
    return {
      text: remaining === 0 ? 'quá hạn' : `quá hạn ${formatDuration(-remaining)}`,
      level: 'late',
    };
  }
  if (remaining <= 120) return { text: `còn ${formatDuration(remaining)}`, level: 'soon' };
  return { text: `hạn ${deadline}`, level: 'ok' };
}
