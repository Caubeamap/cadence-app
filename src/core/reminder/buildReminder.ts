export function buildReminder(title: string, remainingAfter: number, nextDeadline?: string): string {
  const head = `Tới giờ ${title} rồi.`;
  if (remainingAfter <= 0) return head;
  const tail = nextDeadline
    ? `Xong việc này còn ${remainingAfter} việc nữa, gần nhất cần xong trước ${nextDeadline}.`
    : `Xong việc này còn ${remainingAfter} việc nữa.`;
  return `${head} ${tail}`;
}
