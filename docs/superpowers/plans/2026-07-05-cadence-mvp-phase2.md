# Cadence MVP — Phase 2 Implementation Plan (Data + Stores + Real UI)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Turn the verified core engine into a usable app: SQLite persistence, Zustand stores, real scheduled reminders (notification + foreground TTS), and the three screens (Today timeline, Add Task, Settings) in the warm-notebook visual direction from the spec.

**Architecture:** Pure logic additions (selectors, reschedule trigger, notification plan) go in `src/core/` with TDD. `src/data/` is a thin SQLite layer (expo-sqlite modern API). `src/stores/` wires core+data+services. UI reads stores only. Reminder strategy: cancel-all-and-reschedule on every recompute; TTS speaks when a notification arrives while app is foregrounded.

**Tech stack:** Expo SDK 54 (pinned — see progress.md 2026-07-05), expo-sqlite, zustand, expo-haptics, react-native-gesture-handler (ReanimatedSwipeable), react-native-reanimated 4.1.

**Plan decisions (deviations from spec, justified):**
1. **No NativeWind** — spec §3 listed it, but 3 screens with a hand-tuned design system are better served by StyleSheet + theme tokens: zero extra deps/config, full control, no Tailwind class soup. Spec's design goals unchanged.
2. **`src/data/` has no Jest tests** — spec §9 said "SQLite in-memory", but expo-sqlite is a native module that cannot run under Node/Jest without heavy shims. Repos are kept trivially thin (SQL + row mapping); all decision logic stays in tested `src/core/`. Data layer verified on device.

**Hard rules for every task:** NEVER run git write ops (print "Skipping git operation (auto_commit: false)."). NEVER kill Metro/emulators. TDD for all `src/core/` files. Respond to user in Vietnamese. UI copy: natural Vietnamese, no robot-speak, no emoji spam.

---

## Task P2-0: Dependencies

- [ ] Step 1: `npx expo install expo-sqlite expo-haptics`
- [ ] Step 2: `npm install zustand`
- [ ] Step 3: `npx expo-doctor` → expect all checks pass; `npx tsc --noEmit` → exit 0.
- [ ] Step 4: Commit step → skip message.

## Task P2-1: `core/selectors` (TDD)

Pure helpers the UI and reminder text need. **Files:** `src/core/selectors.ts`, `src/core/__tests__/selectors.test.ts`.

- [ ] Step 1: Failing tests:

```typescript
import { currentBlock, pendingAfter, nextDeadlineAfter } from '../selectors';
import { ScheduledBlock, Task } from '../types';

const blocks: ScheduledBlock[] = [
  { taskId: 'a', start: '08:00', end: '08:30', overflowed: false },
  { taskId: 'b', start: '09:00', end: '10:00', overflowed: false },
  { taskId: 'c', start: '10:00', end: '10:30', overflowed: false },
];
function mkTask(id: string, over: Partial<Task> = {}): Task {
  return {
    id, title: id, date: '2026-07-05', durationMin: 30, kind: 'flexible',
    priority: 'normal', status: 'pending', createdAt: 0, ...over,
  };
}
const tasks = [mkTask('a'), mkTask('b', { deadline: '11:00' }), mkTask('c')];

test('currentBlock returns block covering now', () => {
  expect(currentBlock(blocks, 485)?.taskId).toBe('a');
});

test('currentBlock returns undefined between blocks', () => {
  expect(currentBlock(blocks, 530)).toBeUndefined();
});

test('pendingAfter counts pending tasks scheduled after a block', () => {
  expect(pendingAfter(blocks, tasks, 'a')).toBe(2);
  expect(pendingAfter(blocks, tasks, 'c')).toBe(0);
});

test('pendingAfter ignores done tasks', () => {
  const t2 = [mkTask('a'), mkTask('b', { status: 'done' }), mkTask('c')];
  expect(pendingAfter(blocks, t2, 'a')).toBe(1);
});

test('nextDeadlineAfter finds earliest deadline among later pending tasks', () => {
  expect(nextDeadlineAfter(blocks, tasks, 'a')).toBe('11:00');
  expect(nextDeadlineAfter(blocks, tasks, 'b')).toBeUndefined();
});
```

- [ ] Step 2: Run `npm test` → FAIL "Cannot find module '../selectors'".
- [ ] Step 3: Implement `src/core/selectors.ts`:

```typescript
import { ScheduledBlock, Task } from './types';
import { toMinutes } from './time';

export function currentBlock(blocks: ScheduledBlock[], nowMin: number): ScheduledBlock | undefined {
  return blocks.find((b) => toMinutes(b.start) <= nowMin && nowMin < toMinutes(b.end));
}

function laterPendingBlocks(blocks: ScheduledBlock[], tasks: Task[], taskId: string): ScheduledBlock[] {
  const anchor = blocks.find((b) => b.taskId === taskId);
  if (!anchor) return [];
  const pendingIds = new Set(tasks.filter((t) => t.status === 'pending').map((t) => t.id));
  return blocks.filter(
    (b) => b.taskId !== taskId && pendingIds.has(b.taskId) && toMinutes(b.start) >= toMinutes(anchor.start),
  );
}

export function pendingAfter(blocks: ScheduledBlock[], tasks: Task[], taskId: string): number {
  return laterPendingBlocks(blocks, tasks, taskId).length;
}

export function nextDeadlineAfter(blocks: ScheduledBlock[], tasks: Task[], taskId: string): string | undefined {
  const ids = new Set(laterPendingBlocks(blocks, tasks, taskId).map((b) => b.taskId));
  const deadlines = tasks
    .filter((t) => ids.has(t.id) && t.deadline)
    .map((t) => t.deadline!)
    .sort((a, b) => toMinutes(a) - toMinutes(b));
  return deadlines[0];
}
```

- [ ] Step 4: `npm test` → all pass. Step 5: Commit → skip message.

## Task P2-2: `core/scheduler/shouldReschedule` (TDD)

Decides when the periodic tick must trigger a re-flow (avoids sliding the schedule every second). **Files:** `src/core/scheduler/shouldReschedule.ts`, `src/core/__tests__/shouldReschedule.test.ts`.

- [ ] Step 1: Failing tests:

```typescript
import { shouldReschedule } from '../scheduler/shouldReschedule';
import { ScheduledBlock, Task } from '../types';

function mkTask(id: string, over: Partial<Task> = {}): Task {
  return {
    id, title: id, date: '2026-07-05', durationMin: 30, kind: 'flexible',
    priority: 'normal', status: 'pending', createdAt: 0, ...over,
  };
}
const blk = (taskId: string, start: string, end: string): ScheduledBlock =>
  ({ taskId, start, end, overflowed: false });

test('false when nothing has slipped', () => {
  expect(shouldReschedule([blk('a', '09:00', '09:30')], [mkTask('a')], 480)).toBe(false);
});

test('true when a pending flexible block start is in the past', () => {
  expect(shouldReschedule([blk('a', '07:50', '08:20')], [mkTask('a')], 485)).toBe(true);
});

test('false when the passed block belongs to a done task', () => {
  expect(shouldReschedule([blk('a', '07:50', '08:20')], [mkTask('a', { status: 'done' })], 485)).toBe(false);
});

test('false for fixed blocks in the past (they stay pinned)', () => {
  expect(shouldReschedule(
    [blk('a', '07:00', '07:30')],
    [mkTask('a', { kind: 'fixed', fixedStart: '07:00' })],
    485,
  )).toBe(false);
});

test('true when flexible block start passed even while inside it', () => {
  expect(shouldReschedule([blk('a', '08:00', '08:30')], [mkTask('a')], 481)).toBe(false); // đang làm, không dồn
  expect(shouldReschedule([blk('a', '08:00', '08:30')], [mkTask('a')], 511)).toBe(true); // hết giờ mà chưa done
});
```

- [ ] Step 2: Run → FAIL module not found.
- [ ] Step 3: Implement `src/core/scheduler/shouldReschedule.ts`:

```typescript
import { ScheduledBlock, Task } from '../types';
import { toMinutes } from '../time';

// Re-flow only when a pending FLEXIBLE task's slot is stale:
// - its block ended and the task is still pending (missed), or
// - its block starts in the past and now is before its start... (impossible), so:
//   start passed AND now >= end. While inside the block (start <= now < end) we leave it alone.
export function shouldReschedule(blocks: ScheduledBlock[], tasks: Task[], nowMin: number): boolean {
  const flexPending = new Set(
    tasks.filter((t) => t.status === 'pending' && t.kind === 'flexible').map((t) => t.id),
  );
  return blocks.some((b) => flexPending.has(b.taskId) && nowMin >= toMinutes(b.end));
}
```

- [ ] Step 4: `npm test` → all pass (note: first assertion of last test passes because now is inside the block). Step 5: Commit → skip.

## Task P2-3: `core/reminder/notificationPlan` (TDD)

Pure builder: blocks → list of notifications to schedule. **Files:** `src/core/reminder/notificationPlan.ts`, `src/core/__tests__/notificationPlan.test.ts`.

- [ ] Step 1: Failing tests:

```typescript
import { buildNotificationPlan } from '../reminder/notificationPlan';
import { ScheduledBlock, Task } from '../types';

function mkTask(id: string, title: string, over: Partial<Task> = {}): Task {
  return {
    id, title, date: '2026-07-05', durationMin: 30, kind: 'flexible',
    priority: 'normal', status: 'pending', createdAt: 0, ...over,
  };
}
const blocks: ScheduledBlock[] = [
  { taskId: 'a', start: '08:00', end: '08:30', overflowed: false },
  { taskId: 'b', start: '09:00', end: '10:00', overflowed: false },
];
const tasks = [mkTask('a', 'họp nhóm'), mkTask('b', 'tập gym', { deadline: '11:00' })];

test('plans only future pending blocks', () => {
  const plan = buildNotificationPlan(blocks, tasks, 500); // 08:20
  expect(plan).toHaveLength(1);
  expect(plan[0]).toMatchObject({ taskId: 'b', hhmm: '09:00' });
});

test('body is the reminder sentence', () => {
  const plan = buildNotificationPlan(blocks, tasks, 400);
  expect(plan[0].body).toBe('Tới giờ họp nhóm rồi. Xong việc này còn 1 việc nữa, gần nhất cần xong trước 11:00.');
});

test('done tasks are not planned', () => {
  const t2 = [mkTask('a', 'họp nhóm', { status: 'done' }), tasks[1]];
  const plan = buildNotificationPlan(blocks, t2, 400);
  expect(plan.map((p) => p.taskId)).toEqual(['b']);
});
```

- [ ] Step 2: Run → FAIL module not found.
- [ ] Step 3: Implement `src/core/reminder/notificationPlan.ts`:

```typescript
import { ScheduledBlock, Task } from '../types';
import { toMinutes } from '../time';
import { buildReminder } from './buildReminder';
import { nextDeadlineAfter, pendingAfter } from '../selectors';

export interface PlannedNotification {
  taskId: string;
  hhmm: string;
  title: string;
  body: string;
}

export function buildNotificationPlan(
  blocks: ScheduledBlock[],
  tasks: Task[],
  nowMin: number,
): PlannedNotification[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return blocks
    .filter((b) => {
      const t = byId.get(b.taskId);
      return t?.status === 'pending' && toMinutes(b.start) > nowMin;
    })
    .map((b) => {
      const t = byId.get(b.taskId)!;
      return {
        taskId: b.taskId,
        hhmm: b.start,
        title: 'Cadence',
        body: buildReminder(t.title, pendingAfter(blocks, tasks, b.taskId), nextDeadlineAfter(blocks, tasks, b.taskId)),
      };
    });
}
```

- [ ] Step 4: `npm test` → all pass. Step 5: Commit → skip.

## Task P2-4: Data layer (`src/data/`)

Thin, no Jest (see plan decisions). **Files:** `src/data/db.ts`, `src/data/taskRepo.ts`, `src/data/settingsRepo.ts`, `src/core/id.ts`.

- [ ] Step 1: `src/core/id.ts` (no crypto dep needed, single-device):

```typescript
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
```

- [ ] Step 2: `src/data/db.ts`:

```typescript
import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';

let db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync('cadence.db');
    migrate(db);
  }
  return db;
}

function migrate(d: SQLiteDatabase): void {
  d.execSync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      duration_min INTEGER NOT NULL,
      kind TEXT NOT NULL,
      fixed_start TEXT,
      deadline TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  `);
}
```

- [ ] Step 3: `src/data/taskRepo.ts`:

```typescript
import { Task } from '../core/types';
import { getDb } from './db';

interface TaskRow {
  id: string; title: string; date: string; duration_min: number; kind: string;
  fixed_start: string | null; deadline: string | null; priority: string;
  status: string; created_at: number;
}

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id, title: r.title, date: r.date, durationMin: r.duration_min,
    kind: r.kind as Task['kind'],
    ...(r.fixed_start !== null && { fixedStart: r.fixed_start }),
    ...(r.deadline !== null && { deadline: r.deadline }),
    priority: r.priority as Task['priority'],
    status: r.status as Task['status'],
    createdAt: r.created_at,
  };
}

export function tasksForDate(date: string): Task[] {
  const rows = getDb().getAllSync<TaskRow>('SELECT * FROM tasks WHERE date = ? ORDER BY created_at', date);
  return rows.map(rowToTask);
}

export function insertTask(t: Task): void {
  getDb().runSync(
    `INSERT INTO tasks (id, title, date, duration_min, kind, fixed_start, deadline, priority, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    t.id, t.title, t.date, t.durationMin, t.kind, t.fixedStart ?? null,
    t.deadline ?? null, t.priority, t.status, t.createdAt,
  );
}

export function updateTaskStatus(id: string, status: Task['status']): void {
  getDb().runSync('UPDATE tasks SET status = ? WHERE id = ?', status, id);
}

export function deleteTask(id: string): void {
  getDb().runSync('DELETE FROM tasks WHERE id = ?', id);
}
```

- [ ] Step 4: `src/data/settingsRepo.ts`:

```typescript
import { getDb } from './db';

export interface AppSettings {
  dayStart: string;
  dayEnd: string;
  voiceEnabled: boolean;
  speechRate: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  dayStart: '07:00',
  dayEnd: '22:00',
  voiceEnabled: true,
  speechRate: 1.0,
};

export function loadSettings(): AppSettings {
  const rows = getDb().getAllSync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    dayStart: map.dayStart ?? DEFAULT_SETTINGS.dayStart,
    dayEnd: map.dayEnd ?? DEFAULT_SETTINGS.dayEnd,
    voiceEnabled: map.voiceEnabled ? map.voiceEnabled === 'true' : DEFAULT_SETTINGS.voiceEnabled,
    speechRate: map.speechRate ? Number(map.speechRate) : DEFAULT_SETTINGS.speechRate,
  };
}

export function saveSetting(key: keyof AppSettings, value: string): void {
  getDb().runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}
```

- [ ] Step 5: `npx tsc --noEmit` → exit 0; `npm test` → all pass. Step 6: Commit → skip.

## Task P2-5: Reminder scheduling service

**Files:** Modify `src/services/notifications.ts` (replace test-only scheduler with real one).

- [ ] Step 1: Rewrite `src/services/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import { PlannedNotification } from '../core/reminder/notificationPlan';
import { toMinutes } from '../core/time';

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

function atToday(hhmm: string): Date {
  const d = new Date();
  d.setHours(Math.floor(toMinutes(hhmm) / 60), toMinutes(hhmm) % 60, 0, 0);
  return d;
}

export async function syncScheduledReminders(plan: PlannedNotification[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Promise.all(
    plan.map((p) =>
      Notifications.scheduleNotificationAsync({
        content: { title: p.title, body: p.body, sound: true, data: { taskId: p.taskId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: atToday(p.hhmm) },
      }),
    ),
  );
}

export function onNotificationReceived(handler: (body: string) => void): () => void {
  const sub = Notifications.addNotificationReceivedListener((n) => {
    const body = n.request.content.body;
    if (body) handler(body);
  });
  return () => sub.remove();
}
```

- [ ] Step 2: `app/index.tsx` (PoC) still imports `scheduleTestNotification` — it will be replaced in Task P2-7; to keep tsc green NOW, leave PoC screen untouched until P2-7 but add a temporary export shim is NOT allowed (no dead code). Instead: do P2-5 and P2-7 in the same working session, or accept tsc failing between tasks is NOT allowed → therefore Step 1 of this task also updates `app/index.tsx` imports minimally: remove the `scheduleTestNotification` button handler and let the screen show "Màn hình chính đang được xây" — SKIP this: simplest correct sequencing is to execute P2-5, P2-6, P2-7 in one continuous session and only run the tsc gate at the end of P2-7. Mark this dependency explicitly: **P2-5, P2-6, P2-7 form one atomic gate group.**
- [ ] Step 3 (after P2-7): `npx tsc --noEmit` exit 0. Commit → skip.

## Task P2-6: Stores

**Files:** `src/stores/useSettingsStore.ts`, `src/stores/useDayStore.ts`, `src/core/date.ts`.

- [ ] Step 1: `src/core/date.ts`:

```typescript
export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nowMinutes(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}
```

(TDD optional here — two trivial pure functions; include a 3-assert test file `src/core/__tests__/date.test.ts` passing explicit `Date` instances.)

- [ ] Step 2: `src/stores/useSettingsStore.ts`:

```typescript
import { create } from 'zustand';
import { AppSettings, DEFAULT_SETTINGS, loadSettings, saveSetting } from '../data/settingsRepo';

interface SettingsState extends AppSettings {
  hydrated: boolean;
  hydrate: () => void;
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  hydrate: () => set({ ...loadSettings(), hydrated: true }),
  set: (key, value) => {
    saveSetting(key, String(value));
    set({ [key]: value } as Partial<SettingsState>);
  },
}));
```

- [ ] Step 3: `src/stores/useDayStore.ts`:

```typescript
import { create } from 'zustand';
import { Task, ScheduledBlock, TaskStatus } from '../core/types';
import { scheduleDay } from '../core/scheduler/schedule';
import { shouldReschedule } from '../core/scheduler/shouldReschedule';
import { buildNotificationPlan } from '../core/reminder/notificationPlan';
import { parseTask } from '../core/parser/parseTask';
import { newId } from '../core/id';
import { todayISO, nowMinutes } from '../core/date';
import { deleteTask, insertTask, tasksForDate, updateTaskStatus } from '../data/taskRepo';
import { syncScheduledReminders } from '../services/notifications';
import { useSettingsStore } from './useSettingsStore';

interface DayState {
  date: string;
  nowMin: number;
  tasks: Task[];
  blocks: ScheduledBlock[];
  load: () => void;
  tick: () => void;
  addFromText: (text: string) => Task;
  updateStatus: (id: string, status: TaskStatus) => void;
  remove: (id: string) => void;
}

function recompute(tasks: Task[], nowMin: number): ScheduledBlock[] {
  const { dayStart, dayEnd } = useSettingsStore.getState();
  return scheduleDay(tasks, nowMin, { dayStart, dayEnd });
}

function syncReminders(blocks: ScheduledBlock[], tasks: Task[], nowMin: number): void {
  void syncScheduledReminders(buildNotificationPlan(blocks, tasks, nowMin));
}

export const useDayStore = create<DayState>((set, get) => ({
  date: todayISO(),
  nowMin: nowMinutes(),
  tasks: [],
  blocks: [],

  load: () => {
    const date = todayISO();
    const nowMin = nowMinutes();
    const tasks = tasksForDate(date);
    const blocks = recompute(tasks, nowMin);
    set({ date, nowMin, tasks, blocks });
    syncReminders(blocks, tasks, nowMin);
  },

  tick: () => {
    const nowMin = nowMinutes();
    const { tasks, blocks, date } = get();
    if (date !== todayISO()) {
      get().load();
      return;
    }
    if (shouldReschedule(blocks, tasks, nowMin)) {
      const next = recompute(tasks, nowMin);
      set({ nowMin, blocks: next });
      syncReminders(next, tasks, nowMin);
    } else {
      set({ nowMin });
    }
  },

  addFromText: (text) => {
    const parsed = parseTask(text);
    const task: Task = {
      id: newId(),
      title: parsed.title,
      date: get().date,
      durationMin: parsed.durationMin,
      kind: parsed.kind,
      ...(parsed.fixedStart !== undefined && { fixedStart: parsed.fixedStart }),
      ...(parsed.deadline !== undefined && { deadline: parsed.deadline }),
      priority: parsed.priority,
      status: 'pending',
      createdAt: Date.now(),
    };
    insertTask(task);
    const tasks = [...get().tasks, task];
    const nowMin = nowMinutes();
    const blocks = recompute(tasks, nowMin);
    set({ tasks, blocks, nowMin });
    syncReminders(blocks, tasks, nowMin);
    return task;
  },

  updateStatus: (id, status) => {
    updateTaskStatus(id, status);
    const tasks = get().tasks.map((t) => (t.id === id ? { ...t, status } : t));
    const nowMin = nowMinutes();
    const blocks = recompute(tasks, nowMin);
    set({ tasks, blocks, nowMin });
    syncReminders(blocks, tasks, nowMin);
  },

  remove: (id) => {
    deleteTask(id);
    const tasks = get().tasks.filter((t) => t.id !== id);
    const nowMin = nowMinutes();
    const blocks = recompute(tasks, nowMin);
    set({ tasks, blocks, nowMin });
    syncReminders(blocks, tasks, nowMin);
  },
}));
```

- [ ] Step 4: gate deferred to end of P2-7 (atomic group).

## Task P2-7: Theme + Today screen + root layout

**Files:** `src/theme/tokens.ts`, `src/theme/useTheme.ts`, `src/components/TimelineItem.tsx`, `src/components/NowDivider.tsx`, `src/components/EmptyDay.tsx`, replace `app/index.tsx`, replace `app/_layout.tsx`.

Design direction (spec §7 + CLAUDE.md bans): warm paper tones, typography-first, hairline dividers, tabular time digits, NO gradients/glass/emoji. Vietnamese copy written like a person.

- [ ] Step 1: `src/theme/tokens.ts`:

```typescript
export const palette = {
  light: {
    bg: '#FAF6F0',
    surface: '#FFFFFF',
    ink: '#2B2620',
    inkMuted: '#8D8375',
    hairline: '#E8E0D2',
    accent: '#B4551D',
    accentSoft: '#F5E7D9',
    danger: '#A63D33',
  },
  dark: {
    bg: '#181512',
    surface: '#221E19',
    ink: '#ECE4D8',
    inkMuted: '#988D7E',
    hairline: '#373128',
    accent: '#E08A4E',
    accentSoft: '#33271C',
    danger: '#D96C5B',
  },
};
export type ThemeColors = typeof palette.light;

export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 32 };
export const radii = { s: 8, m: 14 };
export const type = {
  title: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.4 },
  section: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  time: { fontSize: 13, fontWeight: '500' as const, fontVariant: ['tabular-nums'] as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
};
```

- [ ] Step 2: `src/theme/useTheme.ts`:

```typescript
import { useColorScheme } from 'react-native';
import { palette, ThemeColors } from './tokens';

export function useTheme(): ThemeColors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}
```

- [ ] Step 3: `app/_layout.tsx`:

```tsx
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { onNotificationReceived } from '../src/services/notifications';
import { speakVietnamese } from '../src/services/tts';
import { useDayStore } from '../src/stores/useDayStore';
import { useSettingsStore } from '../src/stores/useSettingsStore';

export default function RootLayout() {
  useEffect(() => {
    useSettingsStore.getState().hydrate();
    useDayStore.getState().load();

    const offNotification = onNotificationReceived((body) => {
      const { voiceEnabled, speechRate } = useSettingsStore.getState();
      if (voiceEnabled) void speakVietnamese(body, speechRate);
    });
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') useDayStore.getState().load();
    });
    return () => {
      offNotification();
      appState.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
```

- [ ] Step 4: `src/components/TimelineItem.tsx` — one scheduled block row: time column (start–end, tabular nums), title, state styles (done → muted + strikethrough; overflowed → deadline warning line in danger color; current → accent left bar + accentSoft background). Done/skip via ReanimatedSwipeable (right action "Xong", left action "Bỏ qua") with haptics on trigger:

```tsx
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { ScheduledBlock, Task } from '../core/types';
import { useTheme } from '../theme/useTheme';
import { radii, space, type } from '../theme/tokens';

interface Props {
  block: ScheduledBlock;
  task: Task;
  isCurrent: boolean;
  onDone: (id: string) => void;
  onSkip: (id: string) => void;
}

function ActionPane({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.action, { backgroundColor: color }]}>
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

export const TimelineItem = memo(function TimelineItem({ block, task, isCurrent, onDone, onSkip }: Props) {
  const c = useTheme();
  const finished = task.status !== 'pending';

  return (
    <ReanimatedSwipeable
      enabled={!finished}
      renderLeftActions={() => <ActionPane label="Xong" color={c.accent} />}
      renderRightActions={() => <ActionPane label="Bỏ qua" color={c.inkMuted} />}
      onSwipeableOpen={(direction) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (direction === 'left') onDone(task.id);
        else onSkip(task.id);
      }}
    >
      <View
        style={[
          styles.row,
          { backgroundColor: isCurrent ? c.accentSoft : c.bg, borderColor: c.hairline },
          isCurrent && { borderLeftWidth: 3, borderLeftColor: c.accent },
        ]}
        accessibilityLabel={`${task.title}, từ ${block.start} đến ${block.end}${finished ? ', đã xong' : ''}`}
      >
        <View style={styles.timeCol}>
          <Text style={[type.time, { color: finished ? c.inkMuted : c.ink }]}>{block.start}</Text>
          <Text style={[type.time, { color: c.inkMuted }]}>{block.end}</Text>
        </View>
        <View style={styles.body}>
          <Text
            style={[
              type.section,
              { color: finished ? c.inkMuted : c.ink },
              finished && styles.strike,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {task.deadline ? (
            <Text style={[type.caption, { color: block.overflowed ? c.danger : c.inkMuted }]}>
              {block.overflowed ? `Không kịp hạn ${task.deadline}` : `Hạn ${task.deadline}`}
            </Text>
          ) : null}
        </View>
      </View>
    </ReanimatedSwipeable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.m,
    paddingVertical: space.m,
    paddingHorizontal: space.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeCol: { width: 48, alignItems: 'flex-end', gap: 2 },
  body: { flex: 1, gap: 2 },
  strike: { textDecorationLine: 'line-through' },
  action: { justifyContent: 'center', paddingHorizontal: space.l },
  actionLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
```

- [ ] Step 5: `src/components/NowDivider.tsx` (the "now" line) and `src/components/EmptyDay.tsx` (friendly empty state, human copy — e.g. "Hôm nay chưa có gì. Thêm việc đầu tiên đi." — NOT chatbot-speak):

```tsx
// NowDivider.tsx
import { StyleSheet, Text, View } from 'react-native';
import { toHHMM } from '../core/time';
import { useTheme } from '../theme/useTheme';
import { space, type } from '../theme/tokens';

export function NowDivider({ nowMin }: { nowMin: number }) {
  const c = useTheme();
  return (
    <View style={styles.wrap} accessibilityLabel={`Bây giờ là ${toHHMM(nowMin)}`}>
      <Text style={[type.time, { color: c.accent }]}>{toHHMM(nowMin)}</Text>
      <View style={[styles.line, { backgroundColor: c.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.l, paddingVertical: space.xs },
  line: { flex: 1, height: 1.5, borderRadius: 1 },
});
```

```tsx
// EmptyDay.tsx
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { space, type } from '../theme/tokens';

export function EmptyDay() {
  const c = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[type.section, { color: c.ink }]}>Hôm nay chưa có gì.</Text>
      <Text style={[type.body, { color: c.inkMuted, textAlign: 'center' }]}>
        Thêm việc đầu tiên đi — gõ hoặc nói, kiểu "họp nhóm 3h chiều" là Cadence tự xếp lịch.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.s, padding: space.xl },
});
```

- [ ] Step 6: Replace `app/index.tsx` — Today screen. FlatList of blocks joined with tasks; NowDivider injected before the first block that ends after now; header with date (Vietnamese, e.g. "Thứ Bảy, 5 tháng 7"); footer buttons (Add primary, Settings ghost) pinned in thumb zone; layout animation on re-flow (LinearTransition.springify, disabled under reduce motion); 30-second tick.

```tsx
import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useDayStore } from '../src/stores/useDayStore';
import { toMinutes } from '../src/core/time';
import { ScheduledBlock } from '../src/core/types';
import { TimelineItem } from '../src/components/TimelineItem';
import { NowDivider } from '../src/components/NowDivider';
import { EmptyDay } from '../src/components/EmptyDay';
import { useTheme } from '../src/theme/useTheme';
import { radii, space, type } from '../src/theme/tokens';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<ScheduledBlock>);

function formatToday(): string {
  return new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function TodayScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { blocks, tasks, nowMin, tick, updateStatus } = useDayStore();

  useEffect(() => {
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [tick]);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const nowIndex = blocks.findIndex((b) => toMinutes(b.end) > nowMin);

  return (
    <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top + space.m }]}>
      <View style={styles.header}>
        <Text style={[type.caption, { color: c.inkMuted, textTransform: 'capitalize' }]}>{formatToday()}</Text>
        <Text style={[type.title, { color: c.ink }]}>Hôm nay</Text>
      </View>

      {blocks.length === 0 ? (
        <EmptyDay />
      ) : (
        <AnimatedFlatList
          data={blocks}
          keyExtractor={(b) => b.taskId}
          itemLayoutAnimation={reduceMotion ? undefined : LinearTransition.springify().damping(18)}
          renderItem={({ item, index }) => {
            const task = taskById.get(item.taskId);
            if (!task) return null;
            return (
              <>
                {index === nowIndex ? <NowDivider nowMin={nowMin} /> : null}
                <TimelineItem
                  block={item}
                  task={task}
                  isCurrent={toMinutes(item.start) <= nowMin && nowMin < toMinutes(item.end) && task.status === 'pending'}
                  onDone={(id) => updateStatus(id, 'done')}
                  onSkip={(id) => updateStatus(id, 'skipped')}
                />
              </>
            );
          }}
          ListFooterComponent={nowIndex === -1 && blocks.length > 0 ? <NowDivider nowMin={nowMin} /> : null}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.m, borderTopColor: c.hairline }]}>
        <Pressable
          accessibilityLabel="Thêm việc mới"
          style={[styles.addButton, { backgroundColor: c.accent }]}
          onPress={() => router.push('/add')}
        >
          <Text style={styles.addLabel}>Thêm việc</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Mở cài đặt"
          style={[styles.settingsButton, { borderColor: c.hairline }]}
          onPress={() => router.push('/settings')}
        >
          <Text style={[type.body, { color: c.inkMuted }]}>Cài đặt</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: space.l, paddingBottom: space.m, gap: 2 },
  footer: {
    flexDirection: 'row', gap: space.s, paddingHorizontal: space.l, paddingTop: space.m,
    borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center',
  },
  addButton: {
    flex: 1, minHeight: 52, borderRadius: radii.m, alignItems: 'center', justifyContent: 'center',
  },
  addLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  settingsButton: {
    minHeight: 52, paddingHorizontal: space.l, borderRadius: radii.m, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
```

- [ ] Step 7 (atomic gate for P2-5/6/7): `npx tsc --noEmit` exit 0; `npm test` all pass. Commit → skip.

## Task P2-8: Add Task + Settings screens

**Files:** `app/add.tsx`, `app/settings.tsx`, `src/components/ParsedPreview.tsx`.

- [ ] Step 1: `src/components/ParsedPreview.tsx` — live chips under the input showing what the parser understood (thời lượng / giờ cố định / hạn chót / ưu tiên). Chips are informative in MVP (tap-to-edit arrives in Phase 3); accent-tinted, small caps labels:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { ParsedTask } from '../core/parser/parseTask';
import { useTheme } from '../theme/useTheme';
import { radii, space, type } from '../theme/tokens';

export function ParsedPreview({ parsed }: { parsed: ParsedTask }) {
  const c = useTheme();
  const chips: string[] = [
    `${parsed.durationMin} phút`,
    parsed.fixedStart ? `lúc ${parsed.fixedStart}` : 'giờ linh hoạt',
  ];
  if (parsed.deadline) chips.push(`trước ${parsed.deadline}`);
  if (parsed.priority === 'high') chips.push('ưu tiên cao');

  return (
    <View style={styles.wrap}>
      {chips.map((label) => (
        <View key={label} style={[styles.chip, { backgroundColor: c.accentSoft }]}>
          <Text style={[type.caption, { color: c.accent }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  chip: { paddingHorizontal: space.m, paddingVertical: space.xs + 2, borderRadius: radii.s },
});
```

- [ ] Step 2: `app/add.tsx` — modal: autofocused TextInput, live ParsedPreview (recompute on each keystroke via `parseTask`), primary button "Xếp vào lịch" (haptic success), hint line with 2 example phrasings. On submit → `addFromText`, haptic, `router.back()`:

```tsx
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { parseTask } from '../src/core/parser/parseTask';
import { useDayStore } from '../src/stores/useDayStore';
import { ParsedPreview } from '../src/components/ParsedPreview';
import { useTheme } from '../src/theme/useTheme';
import { radii, space, type } from '../src/theme/tokens';

export default function AddTaskScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addFromText = useDayStore((s) => s.addFromText);
  const [text, setText] = useState('');
  const parsed = useMemo(() => (text.trim() ? parseTask(text) : null), [text]);

  function submit() {
    if (!text.trim()) return;
    addFromText(text);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: c.bg, paddingTop: space.l }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={[type.title, { color: c.ink }]}>Thêm việc</Text>
        <TextInput
          autoFocus
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="done"
          placeholder="Ví dụ: họp nhóm lúc 3h chiều 1 tiếng"
          placeholderTextColor={c.inkMuted}
          style={[styles.input, { borderColor: c.hairline, color: c.ink, backgroundColor: c.surface }]}
          accessibilityLabel="Nhập việc cần làm"
        />
        {parsed ? <ParsedPreview parsed={parsed} /> : (
          <Text style={[type.caption, { color: c.inkMuted }]}>
            Cứ viết tự nhiên: "nộp báo cáo trước 5h chiều", "tập gym 45 phút"...
          </Text>
        )}
      </View>
      <View style={{ padding: space.l, paddingBottom: insets.bottom + space.m }}>
        <Pressable
          accessibilityLabel="Xếp việc này vào lịch"
          style={[styles.submit, { backgroundColor: text.trim() ? c.accent : c.hairline }]}
          onPress={submit}
          disabled={!text.trim()}
        >
          <Text style={styles.submitLabel}>Xếp vào lịch</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, paddingHorizontal: space.l, gap: space.m },
  input: {
    minHeight: 52, borderWidth: 1, borderRadius: radii.m,
    paddingHorizontal: space.m, fontSize: 16,
  },
  submit: { minHeight: 52, borderRadius: radii.m, alignItems: 'center', justifyContent: 'center' },
  submitLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
```

- [ ] Step 3: `app/settings.tsx` — day window steppers (30-min steps for dayStart/dayEnd), voice Switch, speech-rate row (0.8 / 1.0 / 1.2 segmented), test-voice button reusing `describeVietnameseVoice`+`speakVietnamese`. All rows ≥ 48pt, hairline separators, same tokens. Persist via `useSettingsStore.set`; after changing day window call `useDayStore.getState().load()` to re-flow.
- [ ] Step 4: Gate: `npx tsc --noEmit` exit 0; `npm test` all pass. Manual pass on iPhone (Expo Go): add → appears scheduled; swipe done → re-flow animates; notification arrives; voice speaks when app open. Step 5: Commit → skip.

## Task P2-9: Wrap-up

- [ ] Step 1: Full verification run: `npm test` (expect ~46+), `npx tsc --noEmit`, `npx expo-doctor`. Paste real outputs.
- [ ] Step 2: Delete anything dead the refactor orphaned (grep for unused exports; PoC-only code must be gone: `scheduleTestNotification`, `cancelAllScheduled` if unused).
- [ ] Step 3: Append Phase 2 entry to `progress.md` (what was built, test counts, device checklist results, deviations, next steps: Phase 3 = STT dev build + chip editing + polish).
- [ ] Step 4: Hand device checklist to user (Vietnamese): add 3 tasks incl. 1 fixed + 1 deadline; check schedule ordering; swipe done/skip; kill app → notification; voice; dark mode; Reduce Motion on → no layout spring.

---

## Self-review notes

- Spec coverage: §4 storage (P2-4), §5 triggers (P2-6 tick/foreground/actions + P2-2 gate), §6 reminders (P2-3/5 + TTS in _layout), §7 all three screens (P2-7/8) with banned-pattern-free direction, §8 error paths (permission denial → app still works: syncScheduledReminders fails silently only if unpermitted — acceptable MVP, banner arrives Phase 3).
- Type consistency: PlannedNotification defined once (P2-3), imported by services (P2-5); AppSettings defined once (P2-4).
- Atomic gate: P2-5/6/7 share one tsc gate (PoC screen replacement) — flagged inside P2-5.
- No placeholders: every code step has complete code; P2-8 Step 3 describes exact behavior + reuses existing exports only.
