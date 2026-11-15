import { withAuth, ok, err } from '@/lib/middleware';
import { apiLimiter } from '@/lib/rateLimit';
import Subject from '@/models/Subject';
import Assignment from '@/models/Assignment';
import Attendance from '@/models/Attendance';

// Ensure the subject belongs to the requesting user
async function getOwnedSubject(subjectId, userId) {
  const subject = await Subject.findOne({ _id: subjectId, userId });
  return subject;
}

// GET /api/subjects/[id]
export const GET = withAuth(async (req, { params }, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const subject = await getOwnedSubject(params.id, user.id);
  if (!subject) return err('Subject not found.', 404);
  return ok(subject);
});

// PUT /api/subjects/[id]
export const PUT = withAuth(async (req, { params }, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const subject = await getOwnedSubject(params.id, user.id);
  if (!subject) return err('Subject not found.', 404);

  const { name, code } = await req.json();
  if (!name || name.trim().length < 1) return err('Subject name is required.');

  try {
    subject.name = name.trim();
    subject.code = code?.trim() || '';
    await subject.save();
    return ok(subject, 'Subject updated.');
  } catch (e) {
    if (e.code === 11000) return err('You already have a subject with this name.', 409);
    throw e;
  }
});

// DELETE /api/subjects/[id]
export const DELETE = withAuth(async (req, { params }, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const subject = await getOwnedSubject(params.id, user.id);
  if (!subject) return err('Subject not found.', 404);

  // Cascade delete associated assignments and attendance records
  await Promise.all([
    Assignment.deleteMany({ subjectId: params.id, userId: user.id }),
    Attendance.deleteMany({ subjectId: params.id, userId: user.id }),
    subject.deleteOne(),
  ]);

  return ok(null, 'Subject and all its data deleted.');
});
