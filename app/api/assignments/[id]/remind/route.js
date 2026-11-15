import { withAuth, ok, err } from '@/lib/middleware';
import Assignment from '@/models/Assignment';
import Notification from '@/models/Notification';

export const PATCH = withAuth(async (req, { params }, user) => {
  const assignment = await Assignment.findOne({ _id: params.id, userId: user.id });
  if (!assignment) return err('Assignment not found.', 404);

  if (assignment.status === 'completed') {
    return err('Cannot set reminder on a completed assignment.', 400);
  }

  const { remindMe } = await req.json();
  assignment.remindMe = !!remindMe;

  if (remindMe) {
    assignment.reminderNotified = false;
    const deadlineKey = assignment.deadline.getTime();
    await Notification.updateOne(
      { userId: user.id, key: `reminder:${assignment._id}:${deadlineKey}` },
      { $set: { dismissed: false, read: false } }
    );
  }

  await assignment.save();
  return ok(assignment, remindMe ? 'In-app reminder enabled.' : 'In-app reminder disabled.');
});
