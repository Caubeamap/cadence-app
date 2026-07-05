import { buildTimeline } from '../timelineGaps';
import { ScheduledBlock } from '../types';

const blk = (taskId: string, start: string, end: string): ScheduledBlock =>
  ({ taskId, start, end, overflowed: false });

test('no gaps for back-to-back blocks', () => {
  const items = buildTimeline([blk('a', '08:00', '09:00'), blk('b', '09:00', '10:00')]);
  expect(items.map((i) => i.kind)).toEqual(['block', 'block']);
});

test('gap >= 15 minutes becomes a gap item', () => {
  const items = buildTimeline([blk('a', '08:00', '09:00'), blk('b', '09:45', '10:00')]);
  expect(items).toEqual([
    { kind: 'block', block: blk('a', '08:00', '09:00') },
    { kind: 'gap', minutes: 45 },
    { kind: 'block', block: blk('b', '09:45', '10:00') },
  ]);
});

test('small gap under 15 minutes is ignored', () => {
  const items = buildTimeline([blk('a', '08:00', '09:00'), blk('b', '09:10', '10:00')]);
  expect(items.map((i) => i.kind)).toEqual(['block', 'block']);
});

test('empty input -> empty timeline', () => {
  expect(buildTimeline([])).toEqual([]);
});
