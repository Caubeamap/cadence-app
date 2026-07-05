import { currentBlock, pendingAfter, nextDeadlineAfter } from '../selectors';
import { ScheduledBlock, Task } from '../types';

const blocks: ScheduledBlock[] = [
  { taskId: 'a', start: '08:00', end: '08:30', overflowed: false },
  { taskId: 'b', start: '09:00', end: '10:00', overflowed: false },
  { taskId: 'c', start: '10:00', end: '10:30', overflowed: false },
];
function mkTask(id: string, over: Partial<Task> = {}): Task {
  return {
    id, title: id, date: '2026-07-05', durationMin: 30, kind: 'flexible',
    priority: 'normal', status: 'pending', createdAt: 0, ...over,
  };
}
const tasks = [mkTask('a'), mkTask('b', { deadline: '11:00' }), mkTask('c')];

test('currentBlock returns block covering now', () => {
  expect(currentBlock(blocks, 485)?.taskId).toBe('a');
});

test('currentBlock returns undefined between blocks', () => {
  expect(currentBlock(blocks, 530)).toBeUndefined();
});

test('pendingAfter counts pending tasks scheduled after a block', () => {
  expect(pendingAfter(blocks, tasks, 'a')).toBe(2);
  expect(pendingAfter(blocks, tasks, 'c')).toBe(0);
});

test('pendingAfter ignores done tasks', () => {
  const t2 = [mkTask('a'), mkTask('b', { status: 'done' }), mkTask('c')];
  expect(pendingAfter(blocks, t2, 'a')).toBe(1);
});

test('nextDeadlineAfter finds earliest deadline among later pending tasks', () => {
  expect(nextDeadlineAfter(blocks, tasks, 'a')).toBe('11:00');
  expect(nextDeadlineAfter(blocks, tasks, 'b')).toBeUndefined();
});
