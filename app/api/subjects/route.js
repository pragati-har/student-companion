import { withAuth, ok, err } from '@/lib/middleware';
import { apiLimiter } from '@/lib/rateLimit';
import Subject from '@/models/Subject';

// GET /api/subjects — list subjects for the authenticated user (paginated)
export const GET = withAuth(async (req, context, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const skip  = (page - 1) * limit;

  const [subjects, total] = await Promise.all([
    Subject.find({ userId: user.id }).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Subject.countDocuments({ userId: user.id }),
  ]);

  return ok(subjects, 'Subjects fetched.', 200, {
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// POST /api/subjects — create a new subject
export const POST = withAuth(async (req, context, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const { name, code } = await req.json();

  if (!name || name.trim().length < 1) {
    return err('Subject name is required.');
  }

  try {
    const subject = await Subject.create({
      userId: user.id,
      name:   name.trim(),
      code:   code?.trim() || '',
    });
    return ok(subject, 'Subject created.', 201);
  } catch (e) {
    if (e.code === 11000) return err('You already have a subject with this name.', 409);
    throw e;
  }
});
