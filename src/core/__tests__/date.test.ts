import { todayISO, nowMinutes } from '../date';

test('todayISO formats YYYY-MM-DD', () => {
  expect(todayISO(new Date(2026, 6, 5, 9, 30))).toBe('2026-07-05');
});

test('todayISO pads single digits', () => {
  expect(todayISO(new Date(2026, 0, 3))).toBe('2026-01-03');
});

test('nowMinutes converts to minutes since midnight', () => {
  expect(nowMinutes(new Date(2026, 6, 5, 9, 30))).toBe(570);
  expect(nowMinutes(new Date(2026, 6, 5, 0, 0))).toBe(0);
});
