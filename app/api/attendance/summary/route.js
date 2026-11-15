import { withAuth, ok } from '@/lib/middleware';
import Attendance from '@/models/Attendance';
import Subject from '@/models/Subject';

// GET /api/attendance/summary
// Returns per-subject stats and overall attendance percentage
export const GET = withAuth(async (req, context, user) => {
  const subjects = await Subject.find({ userId: user.id }).lean();

  if (subjects.length === 0) {
    return ok({ subjects: [], overallPresent: 0, overallTotal: 0, overallPercent: 0 });
  }

  // One aggregation per subject
  const summaries = await Promise.all(
    subjects.map(async (sub) => {
      const records = await Attendance.find({ userId: user.id, subjectId: sub._id }).lean();
      const total   = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const percent = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;
      return {
        subject: { _id: sub._id, name: sub.name, code: sub.code },
        present,
        total,
        percent,
      };
    })
  );

  const overallPresent = summaries.reduce((s, r) => s + r.present, 0);
  const overallTotal   = summaries.reduce((s, r) => s + r.total,   0);
  const overallPercent = overallTotal > 0
    ? parseFloat(((overallPresent / overallTotal) * 100).toFixed(1))
    : 0;

  return ok({ subjects: summaries, overallPresent, overallTotal, overallPercent });
});
