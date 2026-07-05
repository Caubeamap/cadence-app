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
