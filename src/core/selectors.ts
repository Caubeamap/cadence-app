import { ScheduledBlock, Task } from './types';
import { toMinutes } from './time';

export function currentBlock(blocks: ScheduledBlock[], nowMin: number): ScheduledBlock | undefined {
  return blocks.find((b) => toMinutes(b.start) <= nowMin && nowMin < toMinutes(b.end));
}

function laterPendingBlocks(blocks: ScheduledBlock[], tasks: Task[], taskId: string): ScheduledBlock[] {
  const anchor = blocks.find((b) => b.taskId === taskId);
  if (!anchor) return [];
  const pendingIds = new Set(tasks.filter((t) => t.status === 'pending').map((t) => t.id));
  return blocks.filter(
    (b) => b.taskId !== taskId && pendingIds.has(b.taskId) && toMinutes(b.start) >= toMinutes(anchor.start),
  );
}

export function pendingAfter(blocks: ScheduledBlock[], tasks: Task[], taskId: string): number {
  return laterPendingBlocks(blocks, tasks, taskId).length;
}

export function nextDeadlineAfter(blocks: ScheduledBlock[], tasks: Task[], taskId: string): string | undefined {
  const ids = new Set(laterPendingBlocks(blocks, tasks, taskId).map((b) => b.taskId));
  const deadlines = tasks
    .filter((t) => ids.has(t.id) && t.deadline)
    .map((t) => t.deadline!)
    .sort((a, b) => toMinutes(a) - toMinutes(b));
  return deadlines[0];
}
