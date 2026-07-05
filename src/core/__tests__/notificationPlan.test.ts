import { buildNotificationPlan } from '../reminder/notificationPlan';
import { ScheduledBlock, Task } from '../types';

function mkTask(id: string, title: string, over: Partial<Task> = {}): Task {
  return {
    id, title, date: '2026-07-05', durationMin: 30, kind: 'flexible',
    priority: 'normal', status: 'pending', createdAt: 0, ...over,
  };
}
const blocks: ScheduledBlock[] = [
  { taskId: 'a', start: '08:00', end: '08:30', overflowed: false },
  { taskId: 'b', start: '09:00', end: '10:00', overflowed: false },
];
const tasks = [mkTask('a', 'họp nhóm'), mkTask('b', 'tập gym', { deadline: '11:00' })];

test('plans only future pending blocks', () => {
  const plan = buildNotificationPlan(blocks, tasks, 500);
  expect(plan).toHaveLength(1);
  expect(plan[0]).toMatchObject({ taskId: 'b', hhmm: '09:00' });
});

test('body is the reminder sentence', () => {
  const plan = buildNotificationPlan(blocks, tasks, 400);
  expect(plan[0].body).toBe('Tới giờ họp nhóm rồi. Xong việc này còn 1 việc nữa, gần nhất cần xong trước 11:00.');
});

test('done tasks are not planned', () => {
  const t2 = [mkTask('a', 'họp nhóm', { status: 'done' }), tasks[1]];
  const plan = buildNotificationPlan(blocks, t2, 400);
  expect(plan.map((p) => p.taskId)).toEqual(['b']);
});
