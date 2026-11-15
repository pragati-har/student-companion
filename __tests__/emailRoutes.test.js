jest.mock('@/lib/middleware', () => ({
  withAuth: handler => (req, context) => handler(req, context, { id: 'student-1' }),
  err: (message, status) => Response.json({ success: false, message }, { status }),
}));
jest.mock('@/lib/rateLimit', () => ({ rateLimit: () => jest.fn(() => null) }));
jest.mock('@/models/Assignment', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));
jest.mock('@/models/Attendance', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/models/Subject', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/emailRoute', () => ({
  readEmailRequest: jest.fn(),
  submitEmail: jest.fn(),
}));

const Assignment = require('@/models/Assignment').default;
const Attendance = require('@/models/Attendance').default;
const Subject = require('@/models/Subject').default;
const { readEmailRequest, submitEmail } = require('@/lib/emailRoute');
const { POST: sendList } = require('../app/api/assignments/share/route');
const { POST: sendReminder } = require('../app/api/assignments/[id]/remind-email/route');
const { POST: sendAttendanceSummary } = require('../app/api/attendance/share/route');
const assignmentId = '507f1f77bcf86cd799439011';

function request(body) {
  return new Request('http://localhost/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('protected assignment email routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readEmailRequest.mockResolvedValue({
      recipient: 'chosen@example.com',
      requestId: '123e4567-e89b-42d3-a456-426614174000',
      body: {
        recipient: 'chosen@example.com',
        requestId: '123e4567-e89b-42d3-a456-426614174000',
        assignmentIds: [assignmentId],
      },
    });
    submitEmail.mockResolvedValue({ response: Response.json({ success: true }) });
  });

  test('fetches only assignments owned by the authenticated user before emailing the list', async () => {
    const assignment = {
      _id: assignmentId,
      title: 'Lab report',
      description: 'Results',
      deadline: new Date('2026-11-04T10:00:00Z'),
      status: 'pending',
      subjectId: { name: 'Physics', code: 'PHY' },
    };
    const query = {
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([assignment]),
    };
    Assignment.find.mockReturnValue(query);

    const response = await sendList(request({}));

    expect(response.status).toBe(200);
    expect(Assignment.find).toHaveBeenCalledWith({
      _id: { $in: [assignmentId] },
      userId: 'student-1',
    });
    expect(submitEmail).toHaveBeenCalledWith(expect.objectContaining({
      recipient: 'chosen@example.com',
      subject: 'Your assignment and task list',
      text: expect.stringContaining('Lab report (Physics)'),
    }));
  });

  test('refuses to email assignments not owned by the authenticated user', async () => {
    const query = {
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    Assignment.find.mockReturnValue(query);

    const response = await sendList(request({}));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toMatch(/could not be found/i);
    expect(submitEmail).not.toHaveBeenCalled();
  });

  test('sends a reminder using the owned assignment and an explicit recipient', async () => {
    const assignment = {
      _id: assignmentId,
      title: 'Lab report',
      description: 'Include results',
      deadline: new Date('2026-11-04T10:00:00Z'),
      status: 'pending',
      subjectId: { name: 'Physics' },
    };
    Assignment.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(assignment),
    });
    readEmailRequest.mockResolvedValue({ recipient: 'chosen@example.com' });

    const response = await sendReminder(request({}), { params: { id: assignmentId } });

    expect(response.status).toBe(200);
    expect(Assignment.findOne).toHaveBeenCalledWith({ _id: assignmentId, userId: 'student-1' });
    expect(submitEmail).toHaveBeenCalledWith(expect.objectContaining({
      recipient: 'chosen@example.com',
      subject: 'Reminder: Lab report is due soon',
      dedupeKey: expect.stringContaining(`assignment-reminder:${assignmentId}:`),
      text: expect.stringContaining('Deadline:'),
    }));
  });

  test('rejects invalid recipient input before looking up assignment data', async () => {
    readEmailRequest.mockResolvedValue({
      response: Response.json({ success: false, message: 'Enter a valid recipient email address.' }, { status: 400 }),
    });

    const response = await sendReminder(request({}), { params: { id: assignmentId } });

    expect(response.status).toBe(400);
    expect(Assignment.findOne).not.toHaveBeenCalled();
    expect(submitEmail).not.toHaveBeenCalled();
  });

  test('does not email reminders for completed assignments', async () => {
    Assignment.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: assignmentId,
        title: 'Lab report',
        status: 'completed',
        deadline: new Date(),
      }),
    });
    readEmailRequest.mockResolvedValue({ recipient: 'chosen@example.com' });

    const response = await sendReminder(request({}), { params: { id: assignmentId } });

    expect(response.status).toBe(400);
    expect(submitEmail).not.toHaveBeenCalled();
  });

  test('builds attendance email content from the authenticated user’s records', async () => {
    Subject.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: 'physics-1', name: 'Physics', code: 'PHY' }]),
    });
    Attendance.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ status: 'present' }, { status: 'absent' }]),
    });

    const response = await sendAttendanceSummary(request({}));

    expect(response.status).toBe(200);
    expect(Subject.find).toHaveBeenCalledWith({ userId: 'student-1' });
    expect(Attendance.find).toHaveBeenCalledWith({ userId: 'student-1', subjectId: 'physics-1' });
    expect(submitEmail).toHaveBeenCalledWith(expect.objectContaining({
      recipient: 'chosen@example.com',
      subject: 'Your attendance summary',
      text: expect.stringContaining('Physics (PHY): 1/2 present (50%)'),
    }));
  });
});
