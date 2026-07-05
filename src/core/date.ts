export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nowMinutes(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

// Monday-first week containing the given date
export function weekOf(iso: string): string[] {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => addDaysISO(iso, i - dow));
}
