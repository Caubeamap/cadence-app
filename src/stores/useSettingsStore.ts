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
