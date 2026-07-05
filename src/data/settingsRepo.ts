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
