import { withAuth, ok, err } from '@/lib/middleware';
import { apiLimiter } from '@/lib/rateLimit';
import Assignment from '@/models/Assignment';
import Subject from '@/models/Subject';

// GET /api/assignments?status=pending&page=1&limit=20
export const GET = withAuth(async (req, context, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const status    = searchParams.get('status');    // pending | completed | overdue
  const subjectId = searchParams.get('subjectId');
  const page      = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit     = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const skip      = (page - 1) * limit;

  const query = { userId: user.id };

  if (subjectId) query.subjectId = subjectId;

  const now = new Date();
  if (status === 'completed') {
    query.status = 'completed';
  } else if (status === 'overdue') {
    query.status = 'pending';
    query.deadline = { $lt: now };
  } else if (status === 'upcoming') {
    query.status = 'pending';
    query.deadline = { $gte: now };
  } else if (status === 'pending') {
    query.status = 'pending';
  }

  const [assignments, total] = await Promise.all([
    Assignment.find(query)
      .sort({ deadline: 1 })
      .skip(skip)
      .limit(limit)
      .populate('subjectId', 'name code')
      .lean(),
    Assignment.countDocuments(query),
  ]);

  return ok(assignments, 'Assignments fetched.', 200, {
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// POST /api/assignments
export const POST = withAuth(async (req, context, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const { subjectId, title, description, deadline, remindMe } = await req.json();

  const errors = {};
  if (!subjectId)          errors.subjectId = 'Subject is required.';
  if (!title?.trim())      errors.title     = 'Title is required.';
  if (!deadline)           errors.deadline  = 'Deadline is required.';
  if (deadline && new Date(deadline) < new Date()) errors.deadline = 'Deadline must be in the future.';
  if (Object.keys(errors).length > 0) return err('Validation failed.', 400, errors);

  // Verify the subject belongs to this user
  const subject = await Subject.findOne({ _id: subjectId, userId: user.id });
  if (!subject) return err('Subject not found.', 404);

  const assignment = await Assignment.create({
    userId:      user.id,
    subjectId,
    title:       title.trim(),
    description: description?.trim() || '',
    deadline:    new Date(deadline),
    remindMe:    !!remindMe,
    reminderNotified: false,
  });

  const populated = await assignment.populate('subjectId', 'name code');
  return ok(populated, 'Assignment created.', 201);
});
