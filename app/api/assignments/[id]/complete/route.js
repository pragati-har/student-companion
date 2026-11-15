import { withAuth, ok, err } from '@/lib/middleware';
import Assignment from '@/models/Assignment';

export const PATCH = withAuth(async (req, { params }, user) => {
  const assignment = await Assignment.findOne({ _id: params.id, userId: user.id });
  if (!assignment) return err('Assignment not found.', 404);

  assignment.status = 'completed';
  // Stop scheduled in-app reminders once completed.
  assignment.remindMe = false;
  await assignment.save();

  return ok(assignment, 'Marked as completed.');
});
