import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 2;

let db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync('cadence.db');
    migrate(db);
  }
  return db;
}

function migrate(d: SQLiteDatabase): void {
  d.execSync('PRAGMA journal_mode = WAL');
  let version = d.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version < 1) {
    d.withTransactionSync(() => {
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
    });
    version = 1;
  }

  if (version < 2) {
    d.withTransactionSync(() => {
      d.execSync('ALTER TABLE tasks ADD COLUMN tag TEXT');
    });
    version = 2;
  }

  d.execSync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
