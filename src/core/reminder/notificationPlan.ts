import { ScheduledBlock, Task } from '../types';
import { toMinutes } from '../time';
import { buildReminder } from './buildReminder';
import { nextDeadlineAfter, pendingAfter } from '../selectors';

export interface PlannedNotification {
  taskId: string;
  date: string;
  hhmm: string;
  title: string;
  body: string;
}

export function buildNotificationPlan(
  blocks: ScheduledBlock[],
  tasks: Task[],
  nowMin: number,
  date: string,
  isToday: boolean,
): PlannedNotification[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return blocks
    .filter((b) => {
      const t = byId.get(b.taskId);
      if (t?.status !== 'pending') return false;
      return isToday ? toMinutes(b.start) > nowMin : true;
    })
    .map((b) => {
      const t = byId.get(b.taskId)!;
      return {
        taskId: b.taskId,
        date,
        hhmm: b.start,
        title: 'Cadence',
        body: buildReminder(t.title, pendingAfter(blocks, tasks, b.taskId), nextDeadlineAfter(blocks, tasks, b.taskId)),
      };
    });
}

// iOS silently keeps only the 64 soonest pending local notifications;
// stay under that with a rolling window of the soonest entries.
export function capPlan(plans: PlannedNotification[], max = 60): PlannedNotification[] {
  return [...plans]
    .sort((a, b) => (a.date === b.date ? toMinutes(a.hhmm) - toMinutes(b.hhmm) : a.date < b.date ? -1 : 1))
    .slice(0, max);
}
