import { shouldReschedule } from '../scheduler/shouldReschedule';
import { ScheduledBlock, Task } from '../types';

function mkTask(id: string, over: Partial<Task> = {}): Task {
  return {
    id, title: id, date: '2026-07-05', durationMin: 30, kind: 'flexible',
    priority: 'normal', status: 'pending', createdAt: 0, ...over,
  };
}
const blk = (taskId: string, start: string, end: string): ScheduledBlock =>
  ({ taskId, start, end, overflowed: false });

test('false when nothing has slipped', () => {
  expect(shouldReschedule([blk('a', '09:00', '09:30')], [mkTask('a')], 480)).toBe(false);
});

test('true when a pending flexible block has ended', () => {
  expect(shouldReschedule([blk('a', '07:50', '08:20')], [mkTask('a')], 505)).toBe(true);
});

test('false when the passed block belongs to a done task', () => {
  expect(shouldReschedule([blk('a', '07:50', '08:20')], [mkTask('a', { status: 'done' })], 505)).toBe(false);
});

test('false for fixed blocks in the past (they stay pinned)', () => {
  expect(shouldReschedule(
    [blk('a', '07:00', '07:30')],
    [mkTask('a', { kind: 'fixed', fixedStart: '07:00' })],
    485,
  )).toBe(false);
});

test('inside a running flexible block -> no re-flow; after it ends un-done -> re-flow', () => {
  expect(shouldReschedule([blk('a', '08:00', '08:30')], [mkTask('a')], 481)).toBe(false);
  expect(shouldReschedule([blk('a', '08:00', '08:30')], [mkTask('a')], 511)).toBe(true);
});
