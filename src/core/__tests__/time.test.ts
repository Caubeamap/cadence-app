import { toMinutes, toHHMM } from '../time';

test('toMinutes parses HH:mm', () => {
  expect(toMinutes('07:00')).toBe(420);
  expect(toMinutes('15:30')).toBe(930);
  expect(toMinutes('00:00')).toBe(0);
});

test('toHHMM formats minutes', () => {
  expect(toHHMM(420)).toBe('07:00');
  expect(toHHMM(935)).toBe('15:35');
  expect(toHHMM(0)).toBe('00:00');
});

test('roundtrip', () => {
  expect(toHHMM(toMinutes('22:15'))).toBe('22:15');
});
