import { ScheduledBlock, Task } from '../types';
import { toMinutes } from '../time';
import { buildReminder } from './buildReminder';
import { nextDeadlineAfter, pendingAfter } from '../selectors';

export interface PlannedNotification {
  taskId: string;
  hhmm: string;
  title: string;
  body: string;
}

export function buildNotificationPlan(
  blocks: ScheduledBlock[],
  tasks: Task[],
  nowMin: number,
): PlannedNotification[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return blocks
    .filter((b) => {
      const t = byId.get(b.taskId);
      return t?.status === 'pending' && toMinutes(b.start) > nowMin;
    })
    .map((b) => {
      const t = byId.get(b.taskId)!;
      return {
        taskId: b.taskId,
        hhmm: b.start,
        title: 'Cadence',
        body: buildReminder(t.title, pendingAfter(blocks, tasks, b.taskId), nextDeadlineAfter(blocks, tasks, b.taskId)),
      };
    });
}
