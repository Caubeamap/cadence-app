import { ScheduledBlock } from './types';
import { toMinutes } from './time';

const MIN_VISIBLE_GAP = 15;

export type TimelineEntry =
  | { kind: 'block'; block: ScheduledBlock }
  | { kind: 'gap'; minutes: number };

export function buildTimeline(blocks: ScheduledBlock[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  blocks.forEach((block, i) => {
    if (i > 0) {
      const gap = toMinutes(block.start) - toMinutes(blocks[i - 1].end);
      if (gap >= MIN_VISIBLE_GAP) entries.push({ kind: 'gap', minutes: gap });
    }
    entries.push({ kind: 'block', block });
  });
  return entries;
}
