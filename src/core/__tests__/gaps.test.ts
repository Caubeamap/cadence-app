import { computeGaps } from '../scheduler/gaps';

test('no fixed blocks -> one gap spanning window', () => {
  expect(computeGaps([], 420, 1320)).toEqual([{ start: 420, end: 1320 }]);
});

test('one block in middle splits window', () => {
  expect(computeGaps([{ start: 600, end: 660 }], 420, 1320)).toEqual([
    { start: 420, end: 600 },
    { start: 660, end: 1320 },
  ]);
});

test('blocks overlapping window edges are clipped', () => {
  expect(computeGaps([{ start: 400, end: 480 }, { start: 1300, end: 1400 }], 420, 1320))
    .toEqual([{ start: 480, end: 1300 }]);
});

test('overlapping blocks are merged', () => {
  expect(computeGaps([{ start: 600, end: 700 }, { start: 650, end: 720 }], 420, 1320))
    .toEqual([
      { start: 420, end: 600 },
      { start: 720, end: 1320 },
    ]);
});

test('window fully covered -> no gaps', () => {
  expect(computeGaps([{ start: 400, end: 1400 }], 420, 1320)).toEqual([]);
});

test('empty window (start >= end) -> no gaps', () => {
  expect(computeGaps([], 1320, 1320)).toEqual([]);
});
