import { scheduleDay } from '../scheduler/schedule';
import { Task } from '../types';

const settings = { dayStart: '07:00', dayEnd: '22:00' };
let seq = 0;
function mk(over: Partial<Task>): Task {
  seq += 1;
  return {
    id: over.id ?? `t${seq}`, title: 'x', date: '2026-07-05', durationMin: 30,
    kind: 'flexible', priority: 'normal', status: 'pending', createdAt: seq,
    ...over,
  };
}

test('empty day -> empty schedule', () => {
  expect(scheduleDay([], 480, settings)).toEqual([]);
});

test('fixed tasks pin to their time', () => {
  const out = scheduleDay([mk({ id: 'a', kind: 'fixed', fixedStart: '15:00', durationMin: 60 })], 480, settings);
  expect(out).toEqual([{ taskId: 'a', start: '15:00', end: '16:00', overflowed: false }]);
});

test('flexible packs into first gap after now', () => {
  const out = scheduleDay([mk({ id: 'a', durationMin: 45 })], 480, settings);
  expect(out[0]).toEqual({ taskId: 'a', start: '08:00', end: '08:45', overflowed: false });
});

test('earlier deadline schedules first', () => {
  const out = scheduleDay([
    mk({ id: 'late', deadline: '20:00' }),
    mk({ id: 'soon', deadline: '10:00' }),
  ], 480, settings);
  expect(out[0].taskId).toBe('soon');
});

test('high priority beats normal when deadlines equal', () => {
  const out = scheduleDay([
    mk({ id: 'n', priority: 'normal' }),
    mk({ id: 'h', priority: 'high' }),
  ], 480, settings);
  expect(out[0].taskId).toBe('h');
});

test('unmeetable deadline -> overflowed but still placed', () => {
  const out = scheduleDay([mk({ id: 'a', deadline: '07:30', durationMin: 60 })], 480, settings);
  expect(out[0].overflowed).toBe(true);
});

test('done/skipped tasks are excluded', () => {
  const out = scheduleDay([mk({ status: 'done' }), mk({ status: 'skipped' })], 480, settings);
  expect(out).toEqual([]);
});

test('flexible flows around a fixed block', () => {
  const out = scheduleDay([
    mk({ id: 'meet', kind: 'fixed', fixedStart: '08:15', durationMin: 60 }),
    mk({ id: 'flex', durationMin: 30 }),
  ], 480, settings);
  const flex = out.find((b) => b.taskId === 'flex')!;
  expect(flex.start).toBe('09:15'); // 08:00-08:15 gap too small
});

test('task longer than remaining day -> overflowed', () => {
  const out = scheduleDay([mk({ id: 'a', durationMin: 900 })], 480, settings);
  expect(out[0].overflowed).toBe(true);
});

test('now past dayEnd -> everything overflowed', () => {
  const out = scheduleDay([mk({ id: 'a' })], 1350, settings);
  expect(out[0].overflowed).toBe(true);
});
