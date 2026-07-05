# Cadence MVP — Phase 1 Implementation Plan (Foundation + Core Engine + PoC)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Expo project, build the fully-tested core engine (time utils, scheduler, Vietnamese parser, reminder builder), and prove the two highest-risk platform features (scheduled local notification + Vietnamese TTS) on the user's iPhone via Expo Go.

**Architecture:** Pure-TypeScript business logic in `src/core/` (zero React imports, 100% Jest-tested via TDD). A single PoC screen exercises `expo-notifications` and `expo-speech`. UI/UX, SQLite, stores are Phase 2 — NOT in this plan.

**Tech Stack (verified 2026-07-05):** Expo SDK 57 (RN 0.86, New Arch), TypeScript strict, jest-expo, expo-notifications, expo-speech. NativeWind/Reanimated/SQLite deferred to Phase 2. STT deferred to Phase 3 (needs dev build).

**Hard rules for every task:** `auto_commit: false` → NEVER run git write ops; print "Skipping git operation (auto_commit: false)." at each commit step. NEVER kill Metro/emulator processes. Respond to the user in Vietnamese.

---

## Task 0: Scaffold Expo project into non-empty repo

The repo root already contains `.git/`, `.agent/`, `.claude/`, `CLAUDE.md`, `progress.md`, `docs/`, `README.md`, `.gitignore`. `create-expo-app` refuses non-empty dirs, so scaffold into a scratch dir and merge.

**Files:**
- Create: entire Expo template at root (app/, assets/, package.json, tsconfig.json, …)
- Modify: `.gitignore` (merge template entries with existing `.agent`/`node_modules` lines)
- Overwrite: `README.md` (current content is a single junk UTF-16 line `# cadence-app`; replace with a real one)

- [ ] **Step 1: Scaffold template in scratch dir**

```powershell
npx create-expo-app@latest .agent/tmp/scaffold --template default
```
Expected: "Your project is ready!" (SDK 57 default template with expo-router).

- [ ] **Step 2: Merge scaffold into root**

```powershell
robocopy .agent\tmp\scaffold . /E /XF README.md .gitignore /XD node_modules .git
```
Expected: exit code < 8. Then append the scaffold's `.gitignore` content to ours manually (Edit tool), keeping existing `.agent`-related lines, dedup. Delete `.agent/tmp/scaffold` afterwards.

- [ ] **Step 3: Write real README.md**

Short, human-written (no marketing fluff): what Cadence is (1 paragraph), stack, how to run (`npm install`, `npx expo start`, scan QR with iPhone), project structure. Vietnamese main text is fine.

- [ ] **Step 4: Install dependencies + verify project health**

```powershell
npm install
npx expo install expo-notifications expo-speech
npx expo-doctor
```
Expected: expo-doctor "No issues detected" (warnings about app config acceptable).

- [ ] **Step 5: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```
Expected: exit 0, no output.

- [ ] **Step 6: Commit** — check `.agent/config.yml`: `auto_commit: false` → print "Skipping git operation (auto_commit: false)."

## Task 1: Strict TS, Jest, folder skeleton, template cleanup

**Files:**
- Modify: `tsconfig.json`, `package.json`
- Create: `src/core/`, `jest.config.js`, `src/core/__tests__/smoke.test.ts`
- Delete: template example screens/components not needed (keep `app/_layout.tsx`, replace `app/index.tsx` content in Task 8; delete `app/(tabs)/` group, example components/hooks/constants the template ships — check imports so nothing dangling)

- [ ] **Step 1: Enable strict TS** — in `tsconfig.json` set `"strict": true` under `compilerOptions` (template usually has it; verify).

- [ ] **Step 2: Add Jest**

```powershell
npx expo install jest-expo jest @types/jest --dev
```

`jest.config.js`:
```javascript
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

`package.json` scripts: add `"test": "jest"`.

- [ ] **Step 3: Smoke test** — `src/core/__tests__/smoke.test.ts`:
```typescript
test('jest runs', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 4: Run** `npm test` → Expected: 1 passed. Delete smoke test after Task 2 adds real tests.

- [ ] **Step 5: Template cleanup** — delete unused template screens/components; run `npx tsc --noEmit` → exit 0; run `npx expo start` briefly to confirm app boots (leave process running or stop the *bundler you started yourself* with Ctrl+C — never kill other processes).

- [ ] **Step 6: Commit** — `auto_commit: false` → print skip message.

## Task 2: `core/time` — HH:mm ↔ minutes utils (TDD)

**Files:**
- Create: `src/core/time.ts`, `src/core/__tests__/time.test.ts`

- [ ] **Step 1: Failing tests**

```typescript
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
```

- [ ] **Step 2: Run** `npm test` → Expected FAIL: "Cannot find module '../time'".

- [ ] **Step 3: Implement** `src/core/time.ts`:

```typescript
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run** `npm test` → Expected: all pass. Delete `smoke.test.ts` now.
- [ ] **Step 5: Commit** — skip message.

## Task 3: `core/types` + scheduler gap computation (TDD)

**Files:**
- Create: `src/core/types.ts`, `src/core/scheduler/gaps.ts`, `src/core/__tests__/gaps.test.ts`

- [ ] **Step 1: Types** — `src/core/types.ts`:

```typescript
export type TaskKind = 'fixed' | 'flexible';
export type TaskStatus = 'pending' | 'done' | 'skipped';
export type Priority = 'normal' | 'high';

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  durationMin: number;
  kind: TaskKind;
  fixedStart?: string; // HH:mm, required when kind === 'fixed'
  deadline?: string; // HH:mm, only meaningful for 'flexible'
  priority: Priority;
  status: TaskStatus;
  createdAt: number; // epoch ms
}

export interface ScheduledBlock {
  taskId: string;
  start: string; // HH:mm
  end: string; // HH:mm
  overflowed: boolean;
}

export interface DaySettings {
  dayStart: string; // HH:mm
  dayEnd: string; // HH:mm
}
```

- [ ] **Step 2: Failing tests** — `src/core/__tests__/gaps.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run** `npm test` → Expected FAIL: module not found.

- [ ] **Step 4: Implement** `src/core/scheduler/gaps.ts`:

```typescript
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
```

- [ ] **Step 5: Run** `npm test` → all pass.
- [ ] **Step 6: Commit** — skip message.

## Task 4: Scheduler packing algorithm (TDD)

**Files:**
- Create: `src/core/scheduler/schedule.ts`, `src/core/__tests__/schedule.test.ts`

- [ ] **Step 1: Failing tests** (helper `mk` builds a Task with defaults; settings 07:00–22:00, now = 08:00 = 480):

```typescript
import { scheduleDay } from '../scheduler/schedule';
import { Task } from '../types';

const settings = { dayStart: '07:00', dayEnd: '22:00' };
let seq = 0;
function mk(over: Partial<Task>): Task {
  seq += 1;
  return {
    id: over.id ?? `t${seq}`, title: 'x', date: '2026-07-05', durationMin: 30,
    kind: 'flexible', priority: 'normal', status: 'pending', createdAt: seq,
    ...over,
  };
}

test('empty day -> empty schedule', () => {
  expect(scheduleDay([], 480, settings)).toEqual([]);
});

test('fixed tasks pin to their time', () => {
  const out = scheduleDay([mk({ id: 'a', kind: 'fixed', fixedStart: '15:00', durationMin: 60 })], 480, settings);
  expect(out).toEqual([{ taskId: 'a', start: '15:00', end: '16:00', overflowed: false }]);
});

test('flexible packs into first gap after now', () => {
  const out = scheduleDay([mk({ id: 'a', durationMin: 45 })], 480, settings);
  expect(out[0]).toEqual({ taskId: 'a', start: '08:00', end: '08:45', overflowed: false });
});

test('earlier deadline schedules first', () => {
  const out = scheduleDay([
    mk({ id: 'late', deadline: '20:00' }),
    mk({ id: 'soon', deadline: '10:00' }),
  ], 480, settings);
  expect(out[0].taskId).toBe('soon');
});

test('high priority beats normal when deadlines equal', () => {
  const out = scheduleDay([
    mk({ id: 'n', priority: 'normal' }),
    mk({ id: 'h', priority: 'high' }),
  ], 480, settings);
  expect(out[0].taskId).toBe('h');
});

test('unmeetable deadline -> overflowed but still placed', () => {
  const out = scheduleDay([mk({ id: 'a', deadline: '07:30', durationMin: 60 })], 480, settings);
  expect(out[0].overflowed).toBe(true);
});

test('done/skipped tasks are excluded', () => {
  const out = scheduleDay([mk({ status: 'done' }), mk({ status: 'skipped' })], 480, settings);
  expect(out).toEqual([]);
});

test('flexible flows around a fixed block', () => {
  const out = scheduleDay([
    mk({ id: 'meet', kind: 'fixed', fixedStart: '08:15', durationMin: 60 }),
    mk({ id: 'flex', durationMin: 30 }),
  ], 480, settings);
  const flex = out.find((b) => b.taskId === 'flex')!;
  expect(flex.start).toBe('09:15'); // 08:00-08:15 gap too small
});

test('task longer than remaining day -> overflowed', () => {
  const out = scheduleDay([mk({ id: 'a', durationMin: 900 })], 480, settings);
  expect(out[0].overflowed).toBe(true);
});

test('now past dayEnd -> everything overflowed', () => {
  const out = scheduleDay([mk({ id: 'a' })], 1350, settings);
  expect(out[0].overflowed).toBe(true);
});
```

- [ ] **Step 2: Run** `npm test` → FAIL: module not found.

- [ ] **Step 3: Implement** `src/core/scheduler/schedule.ts`:

```typescript
import { DaySettings, ScheduledBlock, Task } from '../types';
import { toHHMM, toMinutes } from '../time';
import { computeGaps, Interval } from './gaps';

function sortFlexible(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const da = a.deadline ? toMinutes(a.deadline) : Infinity;
    const db = b.deadline ? toMinutes(b.deadline) : Infinity;
    if (da !== db) return da - db;
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
}

export function scheduleDay(tasks: Task[], nowMin: number, settings: DaySettings): ScheduledBlock[] {
  const pending = tasks.filter((t) => t.status === 'pending');
  const fixedBlocks = pending
    .filter((t) => t.kind === 'fixed' && t.fixedStart)
    .map((t) => ({ taskId: t.id, start: toMinutes(t.fixedStart!), end: toMinutes(t.fixedStart!) + t.durationMin }));

  const windowStart = Math.max(nowMin, toMinutes(settings.dayStart));
  const windowEnd = toMinutes(settings.dayEnd);
  let gaps = computeGaps(fixedBlocks, windowStart, windowEnd);

  const placed: ScheduledBlock[] = fixedBlocks.map((b) => ({
    taskId: b.taskId, start: toHHMM(b.start), end: toHHMM(b.end), overflowed: false,
  }));

  let tail = Math.max(windowEnd, windowStart, ...fixedBlocks.map((b) => b.end));

  for (const t of sortFlexible(pending.filter((t) => t.kind === 'flexible'))) {
    const dl = t.deadline ? toMinutes(t.deadline) : undefined;
    let gap: Interval | undefined = gaps.find(
      (g) => g.end - g.start >= t.durationMin && (dl === undefined || g.start + t.durationMin <= dl),
    );
    let overflowed = false;
    if (!gap) {
      gap = gaps.find((g) => g.end - g.start >= t.durationMin);
      overflowed = true;
    }
    if (gap) {
      const start = gap.start;
      const end = start + t.durationMin;
      placed.push({ taskId: t.id, start: toHHMM(start), end: toHHMM(end), overflowed });
      gaps = gaps.flatMap((g) => (g === gap ? (end < g.end ? [{ start: end, end: g.end }] : []) : [g]));
    } else {
      placed.push({ taskId: t.id, start: toHHMM(tail), end: toHHMM(tail + t.durationMin), overflowed: true });
      tail += t.durationMin;
    }
  }

  return placed.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}
```

- [ ] **Step 4: Run** `npm test` → all pass. If a test fails, fix the CODE, not the test.
- [ ] **Step 5: Commit** — skip message.

## Task 5: Vietnamese parser — time & duration extraction (TDD)

**Files:**
- Create: `src/core/parser/parseTask.ts`, `src/core/__tests__/parseTask.test.ts`

Parsing rules (MVP, deliberately narrow — chips in UI fix mistakes):
- Duration: `N tiếng` (+`rưỡi` = +30), `N phút`. (`giờ` is NOT a duration unit — it collides with clock times like "3 giờ chiều".)
- Clock time: `Nh`, `N giờ`, `N:MM`, `NhMM` optionally followed by buổi (`sáng|trưa|chiều|tối`); buổi ≠ sáng adds 12 when hour < 12.
- `trước <time>` → deadline (kind stays flexible). Any other clock time → fixedStart (kind = fixed).
- `gấp` / `quan trọng` / `ưu tiên` → priority high, stripped from title.
- Title = input minus matched fragments (also strip leading/trailing connector words `lúc`, `vào`, `từ`), collapsed whitespace. Empty title → use raw input.
- Default: durationMin 30, kind flexible, priority normal.

- [ ] **Step 1: Failing tests**

```typescript
import { parseTask } from '../parser/parseTask';

test('plain text -> flexible 30min task', () => {
  expect(parseTask('đọc sách')).toEqual({
    title: 'đọc sách', durationMin: 30, kind: 'flexible', priority: 'normal',
  });
});

test('duration in tieng', () => {
  expect(parseTask('tập gym 1 tiếng')).toMatchObject({ title: 'tập gym', durationMin: 60 });
});

test('tieng ruoi', () => {
  expect(parseTask('học bài 1 tiếng rưỡi')).toMatchObject({ durationMin: 90 });
});

test('duration in phut', () => {
  expect(parseTask('thiền 15 phút')).toMatchObject({ title: 'thiền', durationMin: 15 });
});

test('fixed time with buoi', () => {
  expect(parseTask('họp nhóm lúc 3h chiều')).toMatchObject({
    title: 'họp nhóm', kind: 'fixed', fixedStart: '15:00',
  });
});

test('24h time', () => {
  expect(parseTask('họp 15h')).toMatchObject({ kind: 'fixed', fixedStart: '15:00' });
});

test('time with minutes', () => {
  expect(parseTask('đón con 17h30')).toMatchObject({ kind: 'fixed', fixedStart: '17:30' });
});

test('gio cheu form', () => {
  expect(parseTask('ăn tối 7 giờ tối')).toMatchObject({ kind: 'fixed', fixedStart: '19:00' });
});

test('truoc -> deadline, stays flexible', () => {
  expect(parseTask('nộp báo cáo trước 5h chiều')).toMatchObject({
    title: 'nộp báo cáo', kind: 'flexible', deadline: '17:00',
  });
});

test('duration + fixed time together', () => {
  expect(parseTask('họp nhóm lúc 3h chiều 1 tiếng')).toMatchObject({
    kind: 'fixed', fixedStart: '15:00', durationMin: 60,
  });
});

test('priority keyword', () => {
  expect(parseTask('nộp đơn gấp')).toMatchObject({ title: 'nộp đơn', priority: 'high' });
});

test('unparseable stays safe', () => {
  expect(parseTask('!!!')).toMatchObject({ title: '!!!', durationMin: 30, kind: 'flexible' });
});
```

- [ ] **Step 2: Run** `npm test` → FAIL: module not found.

- [ ] **Step 3: Implement** `src/core/parser/parseTask.ts`:

```typescript
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
const PRIORITY_RE = /\b(gấp|quan trọng|ưu tiên)\b/iu;

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

  const title = rest.replace(/\b(lúc|vào|từ)\b/giu, ' ').replace(/\s+/gu, ' ').trim();

  return {
    title: title || input.trim(),
    durationMin,
    kind,
    ...(fixedStart !== undefined && { fixedStart }),
    ...(deadline !== undefined && { deadline }),
    priority,
  };
}
```

Note for the executor: Vietnamese diacritics require the `u` regex flag; run the tests — if `\b` fails around diacritics on Hermes/Node, replace `\b(gấp|…)\b` with `(?:^|\s)(gấp|…)(?=\s|$)` and adjust. TESTS ARE THE CONTRACT — make them pass without weakening them.

- [ ] **Step 4: Run** `npm test` → all pass.
- [ ] **Step 5: Commit** — skip message.

## Task 6: Reminder message builder (TDD)

**Files:**
- Create: `src/core/reminder/buildReminder.ts`, `src/core/__tests__/buildReminder.test.ts`

Copy must sound like a real person speaking Vietnamese — short, warm, no robot-speak.

- [ ] **Step 1: Failing tests**

```typescript
import { buildReminder } from '../reminder/buildReminder';

test('single task, nothing after', () => {
  expect(buildReminder('họp nhóm', 0)).toBe('Tới giờ họp nhóm rồi.');
});

test('mentions remaining tasks', () => {
  expect(buildReminder('tập gym', 2)).toBe('Tới giờ tập gym rồi. Xong việc này còn 2 việc nữa.');
});

test('mentions next deadline when given', () => {
  expect(buildReminder('viết báo cáo', 1, '18:00')).toBe(
    'Tới giờ viết báo cáo rồi. Xong việc này còn 1 việc nữa, gần nhất cần xong trước 18:00.',
  );
});
```

- [ ] **Step 2: Run** → FAIL: module not found.

- [ ] **Step 3: Implement** `src/core/reminder/buildReminder.ts`:

```typescript
export function buildReminder(title: string, remainingAfter: number, nextDeadline?: string): string {
  const head = `Tới giờ ${title} rồi.`;
  if (remainingAfter <= 0) return head;
  const tail = nextDeadline
    ? `Xong việc này còn ${remainingAfter} việc nữa, gần nhất cần xong trước ${nextDeadline}.`
    : `Xong việc này còn ${remainingAfter} việc nữa.`;
  return `${head} ${tail}`;
}
```

- [ ] **Step 4: Run** `npm test` → all pass.
- [ ] **Step 5: Commit** — skip message.

## Task 7: Notification + TTS service wrappers

Thin wrappers only — no business logic. Not unit-tested (verified via PoC on device).

**Files:**
- Create: `src/services/notifications.ts`, `src/services/tts.ts`

- [ ] **Step 1: Implement** `src/services/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function scheduleTestNotification(seconds: number, title: string, body: string): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
}

export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
```

(Executor: verify trigger type name against installed expo-notifications typings; SDK 57 uses `SchedulableTriggerInputTypes.TIME_INTERVAL`.)

- [ ] **Step 2: Implement** `src/services/tts.ts`:

```typescript
import * as Speech from 'expo-speech';

export function speakVietnamese(text: string, rate = 1.0): void {
  Speech.stop();
  Speech.speak(text, { language: 'vi-VN', rate });
}

export async function hasVietnameseVoice(): Promise<boolean> {
  const voices = await Speech.getAvailableVoicesAsync();
  return voices.some((v) => v.language.toLowerCase().startsWith('vi'));
}
```

- [ ] **Step 3:** `npx tsc --noEmit` → exit 0.
- [ ] **Step 4: Commit** — skip message.

## Task 8: PoC screen — prove the risks on the user's iPhone

**Files:**
- Modify: `app/index.tsx` (replace template content entirely)

- [ ] **Step 1: Implement PoC screen** — plain StyleSheet (NativeWind is Phase 2). Human Vietnamese copy, no emoji spam. Three actions + status text:

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ensureNotificationPermission, scheduleTestNotification } from '../src/services/notifications';
import { hasVietnameseVoice, speakVietnamese } from '../src/services/tts';
import { buildReminder } from '../src/core/reminder/buildReminder';

export default function PocScreen() {
  const [status, setStatus] = useState('Chưa chạy thử nghiệm nào.');

  async function testNotification() {
    const ok = await ensureNotificationPermission();
    if (!ok) {
      setStatus('Chưa được cấp quyền thông báo. Mở Cài đặt để bật.');
      return;
    }
    await scheduleTestNotification(15, 'Cadence', buildReminder('họp nhóm', 2, '18:00'));
    setStatus('Đã hẹn thông báo sau 15 giây. Hãy thoát app hoặc khóa màn hình để kiểm tra.');
  }

  async function testVoice() {
    const hasVi = await hasVietnameseVoice();
    speakVietnamese(buildReminder('tập gym', 1, '17:30'));
    setStatus(hasVi ? 'Đang đọc bằng giọng tiếng Việt của máy.' : 'Máy chưa có giọng tiếng Việt — đang dùng giọng mặc định.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Cadence — kiểm tra nền tảng</Text>
      <Text style={styles.status}>{status}</Text>
      <Pressable accessibilityLabel="Thử thông báo sau 15 giây" style={styles.button} onPress={testNotification}>
        <Text style={styles.buttonLabel}>Thử thông báo (15 giây)</Text>
      </Pressable>
      <Pressable accessibilityLabel="Thử giọng đọc tiếng Việt" style={styles.button} onPress={testVoice}>
        <Text style={styles.buttonLabel}>Thử giọng đọc</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  heading: { fontSize: 22, fontWeight: '600' },
  status: { fontSize: 15, color: '#555' },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
```

- [ ] **Step 2:** `npx tsc --noEmit` → exit 0. `npm test` → all pass.

- [ ] **Step 3: Manual verification on iPhone (USER does this — prepare instructions)**

Start bundler: `npx expo start` (leave it running — do NOT kill it when done). User: install Expo Go from App Store, same Wi-Fi, scan QR with Camera. Checklist to report back:
1. App boots, screen renders.
2. "Thử thông báo (15 giây)" → lock phone → notification arrives on time (±5s)?
3. "Thử giọng đọc" → Vietnamese speech audible and intelligible?
4. Repeat notification test with app killed (swipe away) — still arrives?

- [ ] **Step 4: Record PoC results in progress.md** (what worked/failed on which device/OS).
- [ ] **Step 5: Commit** — skip message.

## Task 9: Session wrap-up

- [ ] **Step 1:** Run full suite one last time: `npm test` and `npx tsc --noEmit` → all green. Paste actual output in the report to the user.
- [ ] **Step 2:** Append Phase 1 entry to `progress.md`: what was built, test counts, PoC status, next steps (Phase 2: SQLite + stores + Today/AddTask UI).
- [ ] **Step 3:** Report to user in Vietnamese. Do NOT claim PoC success until the user confirms device results.

---

## Self-review notes

- Spec coverage: Phase 1 covers spec §3 (structure), §4 (types), §5 (scheduler + all 6 edge cases as tests), §6 (PoC for both risks), parser subset of §2.2, reminder §6. UI (§7), SQLite (§4 storage), stores, auto-reschedule triggers are Phase 2 by design.
- Type consistency: `Task`/`ScheduledBlock`/`DaySettings` defined once in Task 3, imported everywhere after.
- No placeholders: every step has runnable code or an exact command.
