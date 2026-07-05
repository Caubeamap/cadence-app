import { Task } from '../core/types';
import { getDb } from './db';

interface TaskRow {
  id: string;
  title: string;
  date: string;
  duration_min: number;
  kind: string;
  fixed_start: string | null;
  deadline: string | null;
  priority: string;
  status: string;
  created_at: number;
}

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    durationMin: r.duration_min,
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
