import { withAuth, ok, err } from '@/lib/middleware';
import { apiLimiter } from '@/lib/rateLimit';
import Attendance from '@/models/Attendance';
import Notification from '@/models/Notification';
import Subject from '@/models/Subject';

// GET /api/attendance?subjectId=...&page=1&limit=30
export const GET = withAuth(async (req, context, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get('subjectId');
  const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
  const skip  = (page - 1) * limit;

  const query = { userId: user.id };
  if (subjectId) query.subjectId = subjectId;

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('subjectId', 'name code')
      .lean(),
    Attendance.countDocuments(query),
  ]);

  return ok(records, 'Attendance fetched.', 200, {
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// POST /api/attendance — upsert (create or update) an attendance record
export const POST = withAuth(async (req, context, user) => {
  const limited = apiLimiter(req);
  if (limited) return limited;

  const { subjectId, date, status } = await req.json();

  const errors = {};
  if (!subjectId)                          errors.subjectId = 'Subject is required.';
  if (!date)                               errors.date      = 'Date is required.';
  if (!['present', 'absent'].includes(status)) errors.status = 'Status must be "present" or "absent".';
  if (Object.keys(errors).length > 0) return err('Validation failed.', 400, errors);

  // Verify subject belongs to user
  const subject = await Subject.findOne({ _id: subjectId, userId: user.id });
  if (!subject) return err('Subject not found.', 404);

  // Normalize date to midnight UTC
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);

  // Upsert — update existing or insert new
  const record = await Attendance.findOneAndUpdate(
    { userId: user.id, subjectId, date: d },
    { status },
    { upsert: true, new: true, runValidators: true }
  ).populate('subjectId', 'name code');

  const records = await Attendance.find({ userId: user.id, subjectId }).lean();
  const present = records.filter(item => item.status === 'present').length;
  const percent = records.length > 0 ? (present / records.length) * 100 : 0;
  const attendanceKey = `attendance:${subjectId}:${d.toISOString()}`;
  if (records.length > 0 && percent < 75) {
    await Notification.updateOne(
      { userId: user.id, key: attendanceKey },
      {
        $setOnInsert: {
          userId: user.id,
          key: attendanceKey,
          type: 'attendance',
          title: 'Attendance below 75%',
          message: `${subject.name} attendance is ${percent.toFixed(1)}%. Attend upcoming classes to improve it.`,
        },
      },
      { upsert: true }
    );
  } else {
    await Notification.updateOne(
      { userId: user.id, key: attendanceKey, dismissed: false },
      { dismissed: true, read: true }
    );
  }

  return ok(record, 'Attendance saved.', 200);
});
