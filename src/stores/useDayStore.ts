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
