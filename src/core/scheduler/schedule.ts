import { DaySettings, ScheduledBlock, Task } from '../types';
import { toHHMM, toMinutes } from '../time';
import { computeGaps, Interval } from './gaps';

function sortFlexible(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const da = a.deadline ? toMinutes(a.deadline) : Infinity;
    const db = b.deadline ? toMinutes(b.deadline) : Infinity;
    if (da !== db) return da - db;
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
}

export function scheduleDay(tasks: Task[], nowMin: number, settings: DaySettings): ScheduledBlock[] {
  const pending = tasks.filter((t) => t.status === 'pending');
  const fixedBlocks = pending
    .filter((t) => t.kind === 'fixed' && t.fixedStart)
    .map((t) => ({ taskId: t.id, start: toMinutes(t.fixedStart!), end: toMinutes(t.fixedStart!) + t.durationMin }));

  const windowStart = Math.max(nowMin, toMinutes(settings.dayStart));
  const windowEnd = toMinutes(settings.dayEnd);
  let gaps = computeGaps(fixedBlocks, windowStart, windowEnd);

  const placed: ScheduledBlock[] = fixedBlocks.map((b) => ({
    taskId: b.taskId, start: toHHMM(b.start), end: toHHMM(b.end), overflowed: false,
  }));

  let tail = Math.max(windowEnd, windowStart, ...fixedBlocks.map((b) => b.end));

  for (const t of sortFlexible(pending.filter((t) => t.kind === 'flexible'))) {
    const dl = t.deadline ? toMinutes(t.deadline) : undefined;
    let gap: Interval | undefined = gaps.find(
      (g) => g.end - g.start >= t.durationMin && (dl === undefined || g.start + t.durationMin <= dl),
    );
    let overflowed = false;
    if (!gap) {
      gap = gaps.find((g) => g.end - g.start >= t.durationMin);
      overflowed = true;
    }
    if (gap) {
      const start = gap.start;
      const end = start + t.durationMin;
      placed.push({ taskId: t.id, start: toHHMM(start), end: toHHMM(end), overflowed });
      gaps = gaps.flatMap((g) => (g === gap ? (end < g.end ? [{ start: end, end: g.end }] : []) : [g]));
    } else {
      placed.push({ taskId: t.id, start: toHHMM(tail), end: toHHMM(tail + t.durationMin), overflowed: true });
      tail += t.durationMin;
    }
  }

  return placed.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}
