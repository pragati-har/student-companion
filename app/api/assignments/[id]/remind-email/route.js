import mongoose from 'mongoose';
import { withAuth, err } from '@/lib/middleware';
import Assignment from '@/models/Assignment';
import { readEmailRequest, submitEmail } from '@/lib/emailRoute';

export const POST = withAuth(async (req, { params }, user) => {
  if (!mongoose.isValidObjectId(params.id)) return err('Assignment not found.', 404);

  const parsed = await readEmailRequest(req, { requireRequestId: false });
  if (parsed.response) return parsed.response;

  const assignment = await Assignment.findOne({ _id: params.id, userId: user.id })
    .populate('subjectId', 'name code');
  if (!assignment) return err('Assignment not found.', 404);
  if (assignment.status === 'completed') return err('Cannot send a reminder for a completed assignment.', 400);

  const subjectName = assignment.subjectId?.name || 'Unknown subject';
  const deadline = new Date(assignment.deadline).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const text = [
    `This is a reminder about the assignment "${assignment.title}".`,
    `Subject: ${subjectName}`,
    `Deadline: ${deadline}`,
    assignment.description ? `Details: ${assignment.description}` : '',
  ].filter(Boolean).join('\n');

  return (await submitEmail({
    userId: user.id,
    recipient: parsed.recipient,
    dedupeKey: `assignment-reminder:${assignment._id}:${new Date(assignment.deadline).getTime()}:${parsed.recipient.toLowerCase()}`,
    subject: `Reminder: ${assignment.title} is due soon`,
    text,
  })).response;
});
