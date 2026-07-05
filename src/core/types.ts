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
  tag?: string;
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
