import { ScheduledBlock, Task } from '../types';
import { toMinutes } from '../time';

// Re-flow only when a pending FLEXIBLE task's slot went stale (its block ended
// while still pending). Inside a running block we leave the schedule alone;
// past fixed blocks stay pinned by design.
export function shouldReschedule(blocks: ScheduledBlock[], tasks: Task[], nowMin: number): boolean {
  const flexPending = new Set(
    tasks.filter((t) => t.status === 'pending' && t.kind === 'flexible').map((t) => t.id),
  );
  return blocks.some((b) => flexPending.has(b.taskId) && nowMin >= toMinutes(b.end));
}
