import mongoose from 'mongoose';
import { withAuth, ok, err } from '@/lib/middleware';
import { apiLimiter } from '@/lib/rateLimit';
import Notification from '@/models/Notification';

export const PATCH = withAuth(async (req, { params }, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;
  if (!mongoose.isValidObjectId(params.id)) return err('Notification not found.', 404);

  const notification = await Notification.findOneAndUpdate(
    { _id: params.id, userId: user.id, dismissed: false },
    { read: true },
    { new: true }
  );
  if (!notification) return err('Notification not found.', 404);

  return ok(notification, 'Notification marked as read.');
});

export const DELETE = withAuth(async (req, { params }, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;
  if (!mongoose.isValidObjectId(params.id)) return err('Notification not found.', 404);

  const notification = await Notification.findOneAndUpdate(
    { _id: params.id, userId: user.id, dismissed: false },
    { dismissed: true },
    { new: true }
  );
  if (!notification) return err('Notification not found.', 404);

  return ok(notification, 'Notification dismissed.');
});
