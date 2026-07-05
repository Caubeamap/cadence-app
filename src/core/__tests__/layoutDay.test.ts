import { layoutDay } from '../scheduler/layoutDay';
import { ScheduledBlock } from '../types';

const blk = (taskId: string, start: string, end: string): ScheduledBlock =>
  ({ taskId, start, end, overflowed: false });
const PX = 2;
const MIN_H = 40;

test('positions block relative to dayStart', () => {
  const [p] = layoutDay([blk('a', '08:00', '09:00')], 420, PX, MIN_H);
  expect(p).toMatchObject({ top: 120, height: 120, lane: 0, lanes: 1 });
});

test('short block gets min height', () => {
  const [p] = layoutDay([blk('a', '08:00', '08:10')], 420, PX, MIN_H);
  expect(p.height).toBe(MIN_H);
});

test('non-overlapping blocks share lane 0', () => {
  const out = layoutDay([blk('a', '08:00', '09:00'), blk('b', '09:00', '10:00')], 420, PX, MIN_H);
  expect(out.map((p) => p.lane)).toEqual([0, 0]);
  expect(out.map((p) => p.lanes)).toEqual([1, 1]);
});

test('overlapping fixed blocks split into 2 lanes', () => {
  const out = layoutDay([blk('a', '08:00', '09:00'), blk('b', '08:30', '09:30')], 420, PX, MIN_H);
  expect(out[0]).toMatchObject({ lane: 0, lanes: 2 });
  expect(out[1]).toMatchObject({ lane: 1, lanes: 2 });
});

test('chain overlap forms one cluster', () => {
  const out = layoutDay(
    [blk('a', '08:00', '09:00'), blk('b', '08:45', '09:45'), blk('c', '09:15', '10:00')],
    420, PX, MIN_H,
  );
  expect(out.map((p) => p.lane)).toEqual([0, 1, 0]);
  expect(out.map((p) => p.lanes)).toEqual([2, 2, 2]);
});

test('min-height expansion counts as overlap', () => {
  const out = layoutDay([blk('a', '08:00', '08:10'), blk('b', '08:10', '08:20')], 420, PX, MIN_H);
  expect(out[1].lane).toBe(1);
});

test('block before dayStart clamps to top 0', () => {
  const [p] = layoutDay([blk('a', '06:00', '08:00')], 420, PX, MIN_H);
  expect(p.top).toBe(0);
});
