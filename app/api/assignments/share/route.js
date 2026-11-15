import mongoose from 'mongoose';
import { withAuth, err } from '@/lib/middleware';
import { buildAssignmentList } from '@/lib/share';
import Assignment from '@/models/Assignment';
import { readEmailRequest, submitEmail } from '@/lib/emailRoute';

export const POST = withAuth(async (req, context, user) => {
  const parsed = await readEmailRequest(req);
  if (parsed.response) return parsed.response;

  const { body } = parsed;
  const assignmentIds = body?.assignmentIds;
  if (
    !Array.isArray(assignmentIds)
    || assignmentIds.length === 0
    || assignmentIds.length > 50
    || assignmentIds.some(id => typeof id !== 'string' || !mongoose.isValidObjectId(id))
    || new Set(assignmentIds).size !== assignmentIds.length
  ) {
    return err('Select between 1 and 50 valid assignments to send.', 400);
  }
  const foundAssignments = await Assignment.find({
    _id: { $in: assignmentIds },
    userId: user.id,
  }).populate('subjectId', 'name code').lean();

  if (foundAssignments.length !== assignmentIds.length) {
    return err('One or more selected assignments could not be found.', 404);
  }

  const assignmentById = new Map(foundAssignments.map(assignment => [String(assignment._id), assignment]));
  const assignments = assignmentIds.map(id => assignmentById.get(id));
  const text = [
    'Here is the assignment list shared from Student Companion:',
    '',
    buildAssignmentList(assignments),
  ].join('\n');

  return (await submitEmail({
    userId: user.id,
    recipient: parsed.recipient,
    dedupeKey: `assignment-list:${parsed.requestId}`,
    subject: 'Your assignment and task list',
    text,
  })).response;
});
