import { withAuth, ok, err } from '@/lib/middleware';
import { apiLimiter } from '@/lib/rateLimit';
import Assignment from '@/models/Assignment';
import Subject from '@/models/Subject';

async function getOwnedAssignment(id, userId) {
  return Assignment.findOne({ _id: id, userId });
}

// GET /api/assignments/[id]
export const GET = withAuth(async (req, { params }, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const assignment = await getOwnedAssignment(params.id, user.id);
  if (!assignment) return err('Assignment not found.', 404);

  const populated = await assignment.populate('subjectId', 'name code');
  return ok(populated);
});

// PUT /api/assignments/[id]
export const PUT = withAuth(async (req, { params }, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const assignment = await getOwnedAssignment(params.id, user.id);
  if (!assignment) return err('Assignment not found.', 404);

  const { subjectId, title, description, deadline, remindMe } = await req.json();

  const errors = {};
  if (!title?.trim()) errors.title = 'Title is required.';
  if (!deadline)      errors.deadline = 'Deadline is required.';
  if (Object.keys(errors).length > 0) return err('Validation failed.', 400, errors);

  // Verify new subject belongs to user (if changed)
  if (subjectId && subjectId !== String(assignment.subjectId)) {
    const subject = await Subject.findOne({ _id: subjectId, userId: user.id });
    if (!subject) return err('Subject not found.', 404);
    assignment.subjectId = subjectId;
  }

  const newDeadline = new Date(deadline);
  // If the deadline changes, the scheduled in-app reminder should fire again.
  if (assignment.deadline.getTime() !== newDeadline.getTime()) {
    assignment.reminderNotified = false;
    assignment.overdueNotified = false;
  }

  assignment.title       = title.trim();
  assignment.description = description?.trim() || '';
  assignment.deadline    = newDeadline;
  assignment.remindMe    = !!remindMe;

  await assignment.save();
  const populated = await assignment.populate('subjectId', 'name code');
  return ok(populated, 'Assignment updated.');
});

// DELETE /api/assignments/[id]
export const DELETE = withAuth(async (req, { params }, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const assignment = await getOwnedAssignment(params.id, user.id);
  if (!assignment) return err('Assignment not found.', 404);
  await assignment.deleteOne();
  return ok(null, 'Assignment deleted.');
});
