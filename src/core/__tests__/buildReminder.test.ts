import { buildReminder } from '../reminder/buildReminder';

test('single task, nothing after', () => {
  expect(buildReminder('họp nhóm', 0)).toBe('Tới giờ họp nhóm rồi.');
});

test('mentions remaining tasks', () => {
  expect(buildReminder('tập gym', 2)).toBe('Tới giờ tập gym rồi. Xong việc này còn 2 việc nữa.');
});

test('mentions next deadline when given', () => {
  expect(buildReminder('viết báo cáo', 1, '18:00')).toBe(
    'Tới giờ viết báo cáo rồi. Xong việc này còn 1 việc nữa, gần nhất cần xong trước 18:00.',
  );
});
