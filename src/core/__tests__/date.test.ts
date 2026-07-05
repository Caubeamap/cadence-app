import { todayISO, nowMinutes, addDaysISO, weekOf } from '../date';

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

test('addDaysISO adds days and crosses month end', () => {
  expect(addDaysISO('2026-07-05', 1)).toBe('2026-07-06');
  expect(addDaysISO('2026-07-31', 1)).toBe('2026-08-01');
  expect(addDaysISO('2026-07-05', -1)).toBe('2026-07-04');
});

test('weekOf returns Monday-first week containing the date', () => {
  // 2026-07-05 is a Sunday -> week runs 2026-06-29 (Mon) .. 2026-07-05 (Sun)
  const week = weekOf('2026-07-05');
  expect(week).toHaveLength(7);
  expect(week[0]).toBe('2026-06-29');
  expect(week[6]).toBe('2026-07-05');
  // A Monday maps to itself as the first day
  expect(weekOf('2026-06-29')[0]).toBe('2026-06-29');
});
