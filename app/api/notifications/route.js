import { withAuth, ok } from '@/lib/middleware';
import { apiLimiter } from '@/lib/rateLimit';
import Notification from '@/models/Notification';

export const GET = withAuth(async (req, context, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const notifications = await Notification.find({ userId: user.id, dismissed: false })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  const unreadCount = notifications.filter(notification => !notification.read).length;

  return ok({ notifications, unreadCount }, 'Notifications fetched.');
});
