import { Priority, TaskKind } from '../types';
import { toHHMM } from '../time';

export interface ParsedTask {
  title: string;
  durationMin: number;
  kind: TaskKind;
  fixedStart?: string;
  deadline?: string;
  priority: Priority;
}

const DURATION_RE = /(\d+)\s*tiếng(\s*rưỡi)?|(\d+)\s*phút/iu;
const DEADLINE_RE = /trước\s+(\d{1,2})\s*(?:giờ|h|:)\s*(\d{1,2})?\s*(sáng|trưa|chiều|tối)?/iu;
const TIME_RE = /(?:lúc|vào)?\s*\b(\d{1,2})\s*(?:giờ|h|:)\s*(\d{1,2})?\s*(sáng|trưa|chiều|tối)?/iu;
// \b does not work next to Vietnamese diacritics (e.g. "ưu"), so use explicit boundaries
const PRIORITY_RE = /(?:^|\s)(gấp|quan trọng|ưu tiên)(?=\s|$)/iu;

function toClock(hRaw: string, mRaw: string | undefined, buoi: string | undefined): string {
  let h = Number(hRaw);
  const m = mRaw ? Number(mRaw) : 0;
  if (buoi && buoi !== 'sáng' && h < 12) h += 12;
  return toHHMM(h * 60 + m);
}

export function parseTask(input: string): ParsedTask {
  let rest = input;
  let durationMin = 30;
  let priority: Priority = 'normal';
  let kind: TaskKind = 'flexible';
  let fixedStart: string | undefined;
  let deadline: string | undefined;

  const dur = rest.match(DURATION_RE);
  if (dur) {
    durationMin = dur[1] ? Number(dur[1]) * 60 + (dur[2] ? 30 : 0) : Number(dur[3]);
    rest = rest.replace(dur[0], ' ');
  }

  const pri = rest.match(PRIORITY_RE);
  if (pri) {
    priority = 'high';
    rest = rest.replace(pri[0], ' ');
  }

  const dl = rest.match(DEADLINE_RE);
  if (dl) {
    deadline = toClock(dl[1], dl[2], dl[3]?.toLowerCase());
    rest = rest.replace(dl[0], ' ');
  } else {
    const time = rest.match(TIME_RE);
    if (time) {
      kind = 'fixed';
      fixedStart = toClock(time[1], time[2], time[3]?.toLowerCase());
      rest = rest.replace(time[0], ' ');
    }
  }

  const title = rest.replace(/(?:^|\s)(lúc|vào|từ)(?=\s|$)/giu, ' ').replace(/\s+/gu, ' ').trim();

  return {
    title: title || input.trim(),
    durationMin,
    kind,
    ...(fixedStart !== undefined && { fixedStart }),
    ...(deadline !== undefined && { deadline }),
    priority,
  };
}
