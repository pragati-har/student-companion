import { withAuth } from '@/lib/middleware';
import Attendance from '@/models/Attendance';
import Subject from '@/models/Subject';
import { buildAttendanceList } from '@/lib/share';
import { readEmailRequest, submitEmail } from '@/lib/emailRoute';

const authenticatedPost = withAuth(async (req, context, user) => {
  const parsed = await readEmailRequest(req);
  if (parsed.response) return parsed.response;

  const subjects = await Subject.find({ userId: user.id }).lean();
  const summaries = await Promise.all(subjects.map(async (subject) => {
    const records = await Attendance.find({ userId: user.id, subjectId: subject._id }).lean();
    const total = records.length;
    const present = records.filter(record => record.status === 'present').length;
    return {
      subject: { name: subject.name, code: subject.code },
      present,
      total,
      percent: total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0,
    };
  }));
  const overallPresent = summaries.reduce((sum, summary) => sum + summary.present, 0);
  const overallTotal = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const overallPercent = overallTotal > 0
    ? Number(((overallPresent / overallTotal) * 100).toFixed(1))
    : 0;
  const text = [
    'Here is the attendance summary shared from Student Companion:',
    '',
    buildAttendanceList({ subjects: summaries, overallPresent, overallTotal, overallPercent }),
  ].join('\n');

  return (await submitEmail({
    userId: user.id,
    recipient: parsed.recipient,
    dedupeKey: `attendance-summary:${parsed.requestId}`,
    subject: 'Your attendance summary',
    text,
  })).response;
});

export async function POST(req, context) {
  console.info('[attendance-share] Runtime email configuration:', {
    apiKeyPresent: Boolean(process.env.RESEND_API_KEY?.trim()),
    senderConfigured: Boolean(process.env.EMAIL_FROM?.trim()),
  });
  return authenticatedPost(req, context);
}
