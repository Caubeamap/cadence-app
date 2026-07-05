# Cadence — Phase 3 "Planner Pro" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. TDD for all `src/core/`. Never run git write ops (print "Skipping git operation (auto_commit: false)."). Never kill processes.

**Goal:** Proportional time canvas, deadline countdowns, week strip with multi-day planning, carry-over of unfinished tasks, and color tags — per spec §7b.

**Research-locked decisions (2026-07-05):**
- ReanimatedSwipeable works inside a vertical ScrollView out of the box, but use the ScrollView **from react-native-gesture-handler** and raise `dragOffsetFromLeftEdge/RightEdge` to ~24 to avoid diagonal-scroll capture.
- iOS silently keeps only the 64 soonest pending local notifications → cap our plan at **60 soonest**, resync on every load/foreground.
- SQLite migration: official `PRAGMA user_version` step pattern; `ALTER TABLE ADD COLUMN` is safe (NULL backfill).
- Plain ScrollView canvas, no perf flags (`removeClippedSubviews` is buggy with absolute children — do NOT use).

**Casualties (delete, no dead code):** `GapRow.tsx`, `NowDivider.tsx`, `core/timelineGaps.ts` + its test (canvas shows gaps spatially; now-line drawn absolutely).

---

## P3-1 (TDD): `core/scheduler/layoutDay.ts` — canvas geometry + lane packing

Test `src/core/__tests__/layoutDay.test.ts`:

```typescript
import { layoutDay } from '../scheduler/layoutDay';
import { ScheduledBlock } from '../types';

const blk = (taskId: string, start: string, end: string): ScheduledBlock =>
  ({ taskId, start, end, overflowed: false });
const PX = 2; // pxPerMin for round numbers
const MIN_H = 40;

test('positions block relative to dayStart', () => {
  const [p] = layoutDay([blk('a', '08:00', '09:00')], 420, PX, MIN_H); // dayStart 07:00
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
  // a-b overlap, b-c overlap, a-c do not: all share cluster of 2 lanes, c reuses lane 0
  const out = layoutDay(
    [blk('a', '08:00', '09:00'), blk('b', '08:45', '09:45'), blk('c', '09:15', '10:00')],
    420, PX, MIN_H,
  );
  expect(out.map((p) => p.lane)).toEqual([0, 1, 0]);
  expect(out.map((p) => p.lanes)).toEqual([2, 2, 2]);
});

test('min-height expansion counts as overlap', () => {
  // 10-min blocks back to back: rendered heights overlap pixel-wise
  const out = layoutDay([blk('a', '08:00', '08:10'), blk('b', '08:10', '08:20')], 420, PX, MIN_H);
  expect(out[1].lane).toBe(1);
});

test('block before dayStart clamps to top 0', () => {
  const [p] = layoutDay([blk('a', '06:00', '08:00')], 420, PX, MIN_H);
  expect(p.top).toBe(0);
});
```

Implementation:

```typescript
import { ScheduledBlock } from '../types';
import { toMinutes } from '../time';

export interface PositionedBlock {
  block: ScheduledBlock;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

export function layoutDay(
  blocks: ScheduledBlock[],
  dayStartMin: number,
  pxPerMin: number,
  minHeightPx: number,
): PositionedBlock[] {
  const positioned = blocks
    .map((block) => {
      const startPx = (toMinutes(block.start) - dayStartMin) * pxPerMin;
      const rawHeight = (toMinutes(block.end) - toMinutes(block.start)) * pxPerMin;
      const top = Math.max(0, startPx);
      return { block, top, height: Math.max(rawHeight, minHeightPx), lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.top - b.top);

  // sweep: cluster = consecutive blocks whose pixel intervals touch; greedy lane assign
  let clusterStart = 0;
  let clusterEnd = -Infinity;
  const laneEnds: number[] = [];

  const closeCluster = (endIdx: number) => {
    const lanes = laneEnds.length;
    for (let i = clusterStart; i < endIdx; i += 1) positioned[i].lanes = lanes;
  };

  positioned.forEach((p, i) => {
    if (p.top >= clusterEnd) {
      closeCluster(i);
      clusterStart = i;
      laneEnds.length = 0;
    }
    let lane = laneEnds.findIndex((end) => end <= p.top);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    p.lane = lane;
    laneEnds[lane] = p.top + p.height;
    clusterEnd = Math.max(clusterEnd, p.top + p.height);
  });
  closeCluster(positioned.length);

  return positioned;
}
```

Gate: RED (module not found) → GREEN → tsc 0. Commit step → skip message.

## P3-2 (TDD): `core/deadlineStatus.ts`

Test:
```typescript
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
```

Implementation:
```typescript
import { toMinutes } from './time';
import { formatDuration } from './daySummary';

export type DeadlineLevel = 'ok' | 'soon' | 'late';

export function deadlineStatus(deadline: string, nowMin: number): { text: string; level: DeadlineLevel } {
  const remaining = toMinutes(deadline) - nowMin;
  if (remaining <= 0) {
    return { text: remaining === 0 ? 'quá hạn' : `quá hạn ${formatDuration(-remaining)}`, level: 'late' };
  }
  if (remaining <= 120) return { text: `còn ${formatDuration(remaining)}`, level: 'soon' };
  return { text: `hạn ${deadline}`, level: 'ok' };
}
```
(Note: `deadlineStatus('08:00', 505)` → remaining −25 → "quá hạn 25 phút" ✓; the `remaining === 0` case avoids "quá hạn 0 phút".)

## P3-3 (TDD): parser — tags `#nhãn` + "mai/ngày mai"

`ParsedTask` gains `tag?: string` and `dayOffset: 0 | 1`. Rules:
- `#tag` anywhere: `/#([\p{L}\p{N}_-]+)/u`, stripped from title, lowercased.
- `ngày mai` anywhere OR `mai` only at the START of input → dayOffset 1, stripped. `hôm nay` → stripped, offset 0. ("gặp Mai lúc 3h" stays today — "mai" mid-sentence is likely a name; accepted MVP heuristic, documented by test.)

New tests (append to parseTask.test.ts):
```typescript
test('hashtag becomes tag', () => {
  expect(parseTask('ôn thi ATBM #học 2 tiếng')).toMatchObject({
    title: 'ôn thi ATBM', tag: 'học', durationMin: 120,
  });
});
test('mai at start -> tomorrow', () => {
  expect(parseTask('mai họp nhóm 9h sáng')).toMatchObject({
    dayOffset: 1, kind: 'fixed', fixedStart: '09:00', title: 'họp nhóm',
  });
});
test('ngay mai anywhere -> tomorrow', () => {
  expect(parseTask('nộp đơn ngày mai trước 5h chiều')).toMatchObject({ dayOffset: 1, deadline: '17:00' });
});
test('mai mid-sentence is a name, not tomorrow', () => {
  expect(parseTask('gặp mai lúc 3h chiều')).toMatchObject({ dayOffset: 0, title: 'gặp mai' });
});
test('default dayOffset is 0', () => {
  expect(parseTask('đọc sách').dayOffset).toBe(0);
});
```
Existing exact-equality test (`'đọc sách'` toEqual) must be updated to include `dayOffset: 0`.

Implementation sketch (inside parseTask, before duration extraction):
```typescript
const TAG_RE = /#([\p{L}\p{N}_-]+)/u;
const TOMORROW_ANY_RE = /(?:^|\s)ngày mai(?=\s|$)/iu;
const TOMORROW_START_RE = /^mai(?=\s)/iu;
const TODAY_RE = /(?:^|\s)hôm nay(?=\s|$)/iu;
// dayOffset: TOMORROW_ANY hoặc TOMORROW_START → 1; strip cả TODAY_RE.
```

## P3-4 (TDD): `core/tagColor.ts` + `core/date.ts#addDaysISO`

```typescript
// tagColor.test.ts
import { tagColor, TAG_PALETTE } from '../tagColor';
test('deterministic', () => { expect(tagColor('học')).toBe(tagColor('học')); });
test('returns palette color', () => { expect(TAG_PALETTE).toContain(tagColor('bất kỳ')); });

// date.test.ts (append)
test('addDaysISO crosses month end', () => { expect(addDaysISO('2026-07-31', 1)).toBe('2026-08-01'); });
```

```typescript
// tagColor.ts
export const TAG_PALETTE = ['#C2703D', '#7D8B4E', '#5E7F99', '#9A6B8F', '#B08830', '#7A9E87'];
export function tagColor(tag: string): string {
  let sum = 0;
  for (const ch of tag) sum = (sum + ch.codePointAt(0)!) % TAG_PALETTE.length;
  return TAG_PALETTE[sum];
}
// date.ts append
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}
```

## P3-5 (TDD): notification plan multi-day + 60 cap

`PlannedNotification` gains `date: string`. `buildNotificationPlan(blocks, tasks, nowMin, date, isToday)` — future days take every pending block (no `> nowMin` filter). New `capPlan(plans, max = 60)`: sort by (date, hhmm) ascending, slice. Tests: future day includes morning blocks; cap keeps the 60 soonest across days.

## P3-6: data layer — migration v2 + new queries

`db.ts` → official user_version pattern:
```typescript
const DATABASE_VERSION = 2;
function migrate(d: SQLiteDatabase): void {
  d.execSync('PRAGMA journal_mode = WAL');
  let version = d.getFirstSync<{ user_version: number }>('PRAGMA user_version')!.user_version;
  if (version < 1) { d.withTransactionSync(() => { d.execSync(/* CREATE TABLE IF NOT EXISTS ... (schema hiện tại) */); }); version = 1; }
  if (version < 2) { d.withTransactionSync(() => { d.execSync('ALTER TABLE tasks ADD COLUMN tag TEXT'); }); version = 2; }
  d.execSync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
```
(Existing installs have tables + user_version 0 → v1 is a no-op thanks to IF NOT EXISTS, v2 adds `tag`.)

`taskRepo`: map/insert `tag`; add `pendingTasksBefore(date)`, `moveTasksToDate(ids, date)` (placeholders `IN (?,?,...)`), `taskCountsByDate(dates): Map<string, number>`.
`Task` type gains `tag?: string`.

## P3-7: store — selectedDate, week, carryover, multi-day reminders

`useDayStore` mới: state `selectedDate`, `weekCounts: Record<string, number>`, `carryover: number`; `selectDate(date)`; `load()` dùng selectedDate (nowMin cho scheduler = ngày hôm nay ? nowMinutes() : 0); `addFromText` → date đích = `parsed.dayOffset === 1 ? addDaysISO(todayISO(), 1) : selectedDate`; sau mọi mutation: `refreshWeek()` + `syncAllReminders()` (build plan cho today + tomorrow bất kể đang xem ngày nào, cap 60). `moveCarryoverToToday()`.

## P3-8: UI — WeekStrip, DayCanvas, CanvasBlock; xóa GapRow/NowDivider/timelineGaps

- `WeekStrip.tsx`: 7 ô T2→CN tuần hiện tại; mỗi ô: thứ (T2..CN), số ngày, chấm mật độ (min(count,3) chấm); ô chọn nền accentSoft + viền accent; hôm nay có gạch chân accent. Props: selected, counts, onSelect.
- `CanvasBlock.tsx`: thay TimelineItem. Absolute wrapper (top/height/left%/width% từ lane/lanes), bên trong ReanimatedSwipeable (`dragOffsetFromLeftEdge={24}` `dragOffsetFromRightEdge={24}`, disabled khi finished/ngày tương lai? — vẫn cho phép done sớm: enabled khi pending). Card: vạch trái 3px màu `tagColor(tag)` (fallback hairline), title, meta (duration · tag · giờ cố định · ưu tiên), chip deadline từ `deadlineStatus` (màu theo level), compact khi height < 56 (chỉ title 1 dòng). Done/skipped: mờ + gạch, không swipe.
- `DayCanvas.tsx`: ScrollView **from 'react-native-gesture-handler'**; chiều cao canvas = (dayEnd−dayStart)×px + padding; cột giờ trái (nhãn mỗi giờ chẵn, hairline gridline ngang); render PositionedBlock qua CanvasBlock; now-line absolute (chỉ khi xem hôm nay): vạch accent + giờ, top = (nowMin−dayStart)×px; tự scroll tới now − 120px lần đầu (`contentOffset`). pxPerMin = 1.6, minHeight = 40.
- `app/index.tsx`: header (giữ) + WeekStrip + banner carryover ("Còn X việc chưa xong từ hôm trước — Chuyển sang hôm nay") + DayCanvas (hoặc EmptyDay) + footer (giữ). Tiêu đề đổi theo ngày xem: "Hôm nay" / "Ngày mai" / "Thứ Tư 8/7". Summary chỉ hiện cho hôm nay.
- `ParsedPreview`: thêm chip "ngày mai" khi dayOffset=1, chip "#tag" màu tagColor.

## P3-9: Wrap-up

Full gates (`npm test`, `tsc`, `expo-doctor`) + grep dead exports + cập nhật progress.md + device checklist (canvas tỷ lệ, chồng giờ 2 lane, week strip điều hướng, thêm việc "mai...", #tag màu, countdown deadline đổi màu, carryover banner, notification ngày mai).

## Self-review notes
- Mọi logic mới đều là hàm thuần có test (layoutDay, deadlineStatus, parser mở rộng, tagColor, addDaysISO, capPlan); UI chỉ render.
- Migration idempotent với cả DB cũ (version 0 + bảng có sẵn) lẫn DB mới.
- Type mở rộng một chỗ: `Task.tag`, `ParsedTask.tag/dayOffset`, `PlannedNotification.date`.
- Notification cap 60 áp dụng sau khi gộp mọi ngày — đúng hành vi iOS giữ-64-sớm-nhất.
