export interface Interval {
  start: number;
  end: number;
}

export function computeGaps(blocks: Interval[], windowStart: number, windowEnd: number): Interval[] {
  if (windowStart >= windowEnd) return [];
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  const gaps: Interval[] = [];
  let cursor = windowStart;
  for (const b of sorted) {
    const start = Math.max(b.start, windowStart);
    const end = Math.min(b.end, windowEnd);
    if (end <= cursor) continue;
    if (start > cursor) gaps.push({ start: cursor, end: Math.min(start, windowEnd) });
    cursor = Math.max(cursor, end);
    if (cursor >= windowEnd) return gaps;
  }
  if (cursor < windowEnd) gaps.push({ start: cursor, end: windowEnd });
  return gaps;
}
