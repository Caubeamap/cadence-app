import { formatDuration, summarizeDay } from '../daySummary';
import { ScheduledBlock, Task } from '../types';

function mkTask(id: string, over: Partial<Task> = {}): Task {
  return {
    id, title: id, date: '2026-07-05', durationMin: 30, kind: 'flexible',
    priority: 'normal', status: 'pending', createdAt: 0, ...over,
  };
}
const blk = (taskId: string, start: string, end: string): ScheduledBlock =>
  ({ taskId, start, end, overflowed: false });
const settings = { dayStart: '07:00', dayEnd: '22:00' };

test('formatDuration', () => {
  expect(formatDuration(45)).toBe('45 phút');
  expect(formatDuration(60)).toBe('1 tiếng');
  expect(formatDuration(90)).toBe('1 tiếng rưỡi');
  expect(formatDuration(135)).toBe('2 tiếng 15 phút');
  expect(formatDuration(120)).toBe('2 tiếng');
});

test('no tasks -> null', () => {
  expect(summarizeDay([], [], 480, settings)).toBeNull();
});

test('counts done and reports free time', () => {
  const tasks = [mkTask('a', { status: 'done' }), mkTask('b')];
  const blocks = [blk('b', '09:00', '10:00')];
  // window 08:00-22:00 = 840 min, occupied 60 -> 780 min = 13 tiếng
  expect(summarizeDay(tasks, blocks, 480, settings)).toBe('Xong 1/2 việc · còn rảnh 13 tiếng');
});

test('fully booked day', () => {
  const tasks = [mkTask('a', { durationMin: 840 })];
  const blocks = [blk('a', '08:00', '22:00')];
  expect(summarizeDay(tasks, blocks, 480, settings)).toBe('Xong 0/1 việc · kín lịch đến 22:00');
});

test('past dayEnd -> no free time reported', () => {
  const tasks = [mkTask('a', { status: 'done' })];
  expect(summarizeDay(tasks, [], 1350, settings)).toBe('Xong 1/1 việc · kín lịch đến 22:00');
});
