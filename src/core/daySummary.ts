import { DaySettings, ScheduledBlock, Task } from './types';
import { toMinutes } from './time';
import { computeGaps } from './scheduler/gaps';

export function formatDuration(min: number): string {
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h} tiếng`;
  if (m === 30) return `${h} tiếng rưỡi`;
  return `${h} tiếng ${m} phút`;
}

export function summarizeDay(
  tasks: Task[],
  blocks: ScheduledBlock[],
  nowMin: number,
  settings: DaySettings,
): string | null {
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.status === 'done').length;
  const head = `Xong ${done}/${tasks.length} việc`;

  const pendingIds = new Set(tasks.filter((t) => t.status === 'pending').map((t) => t.id));
  const occupied = blocks
    .filter((b) => pendingIds.has(b.taskId))
    .map((b) => ({ start: toMinutes(b.start), end: toMinutes(b.end) }));
  const windowStart = Math.max(nowMin, toMinutes(settings.dayStart));
  const windowEnd = toMinutes(settings.dayEnd);
  const freeMin = computeGaps(occupied, windowStart, windowEnd).reduce(
    (sum, g) => sum + (g.end - g.start),
    0,
  );

  if (freeMin <= 0) return `${head} · kín lịch đến ${settings.dayEnd}`;
  return `${head} · còn rảnh ${formatDuration(freeMin)}`;
}
