import { create } from 'zustand';
import { Task, ScheduledBlock, TaskStatus } from '../core/types';
import { scheduleDay } from '../core/scheduler/schedule';
import { shouldReschedule } from '../core/scheduler/shouldReschedule';
import { buildNotificationPlan, capPlan } from '../core/reminder/notificationPlan';
import { parseTask } from '../core/parser/parseTask';
import { newId } from '../core/id';
import { todayISO, nowMinutes, addDaysISO, weekOf } from '../core/date';
import {
  deleteTask,
  insertTask,
  moveTasksToDate,
  pendingTasksBefore,
  taskCountsByDate,
  tasksForDate,
  updateTask,
  updateTaskStatus,
} from '../data/taskRepo';
import { syncScheduledReminders } from '../services/notifications';
import { useSettingsStore } from './useSettingsStore';

interface DayState {
  selectedDate: string;
  nowMin: number;
  tasks: Task[];
  blocks: ScheduledBlock[];
  weekCounts: Record<string, number>;
  carryover: number;
  load: () => void;
  selectDate: (date: string) => void;
  tick: () => void;
  addFromText: (text: string) => Task;
  updateStatus: (id: string, status: TaskStatus) => void;
  editTask: (id: string, patch: Partial<Task>) => void;
  remove: (id: string) => void;
  moveCarryoverToToday: () => void;
}

function daySettings() {
  const { dayStart, dayEnd } = useSettingsStore.getState();
  return { dayStart, dayEnd };
}

function recompute(tasks: Task[], date: string): ScheduledBlock[] {
  const nowMin = date === todayISO() ? nowMinutes() : 0;
  return scheduleDay(tasks, nowMin, daySettings());
}

// Notifications always cover today + tomorrow, whatever day is on screen,
// capped to stay under iOS's 64-pending limit.
function syncAllReminders(): void {
  const today = todayISO();
  const plans = [today, addDaysISO(today, 1)].flatMap((date) => {
    const tasks = tasksForDate(date);
    const blocks = scheduleDay(tasks, date === today ? nowMinutes() : 0, daySettings());
    return buildNotificationPlan(blocks, tasks, nowMinutes(), date, date === today);
  });
  void syncScheduledReminders(capPlan(plans));
}

export const useDayStore = create<DayState>((set, get) => {
  function refresh(selectedDate: string): void {
    const tasks = tasksForDate(selectedDate);
    set({
      selectedDate,
      tasks,
      blocks: recompute(tasks, selectedDate),
      nowMin: nowMinutes(),
      weekCounts: taskCountsByDate(weekOf(todayISO())),
      carryover: pendingTasksBefore(todayISO()).length,
    });
    syncAllReminders();
  }

  return {
    selectedDate: todayISO(),
    nowMin: nowMinutes(),
    tasks: [],
    blocks: [],
    weekCounts: {},
    carryover: 0,

    load: () => refresh(get().selectedDate),

    selectDate: (date) => refresh(date),

    tick: () => {
      const { selectedDate, tasks, blocks } = get();
      const nowMin = nowMinutes();
      if (selectedDate === todayISO() && shouldReschedule(blocks, tasks, nowMin)) {
        refresh(selectedDate);
      } else {
        set({ nowMin });
      }
    },

    addFromText: (text) => {
      const parsed = parseTask(text);
      const date = parsed.dayOffset === 1 ? addDaysISO(todayISO(), 1) : get().selectedDate;
      const task: Task = {
        id: newId(),
        title: parsed.title,
        date,
        durationMin: parsed.durationMin,
        kind: parsed.kind,
        ...(parsed.fixedStart !== undefined && { fixedStart: parsed.fixedStart }),
        ...(parsed.deadline !== undefined && { deadline: parsed.deadline }),
        priority: parsed.priority,
        status: 'pending',
        ...(parsed.tag !== undefined && { tag: parsed.tag }),
        createdAt: Date.now(),
      };
      insertTask(task);
      refresh(get().selectedDate);
      return task;
    },

    updateStatus: (id, status) => {
      updateTaskStatus(id, status);
      refresh(get().selectedDate);
    },

    editTask: (id, patch) => {
      const current = get().tasks.find((t) => t.id === id);
      if (!current) return;
      const next: Task = { ...current, ...patch };
      if (next.kind === 'flexible') delete next.fixedStart;
      if (next.kind === 'fixed') delete next.deadline;
      if (!next.tag) delete next.tag;
      updateTask(next);
      refresh(get().selectedDate);
    },

    remove: (id) => {
      deleteTask(id);
      refresh(get().selectedDate);
    },

    moveCarryoverToToday: () => {
      const today = todayISO();
      moveTasksToDate(pendingTasksBefore(today).map((t) => t.id), today);
      refresh(today);
    },
  };
});
