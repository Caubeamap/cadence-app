import { deadlineStatus } from '../deadlineStatus';

test('far deadline -> ok with static text', () => {
  expect(deadlineStatus('17:00', 480)).toEqual({ text: 'hạn 17:00', level: 'ok' });
});

test('within 2h -> countdown', () => {
  expect(deadlineStatus('10:00', 500)).toEqual({ text: 'còn 1 tiếng 40 phút', level: 'soon' });
});

test('exactly at deadline -> late', () => {
  expect(deadlineStatus('08:00', 480)).toEqual({ text: 'quá hạn', level: 'late' });
});

test('past deadline -> late with overdue amount', () => {
  expect(deadlineStatus('08:00', 505)).toEqual({ text: 'quá hạn 25 phút', level: 'late' });
});
