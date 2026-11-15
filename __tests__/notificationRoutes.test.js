jest.mock('@/lib/middleware', () => ({
  withAuth: handler => (req, context) => handler(req, context, { id: 'student-1' }),
  ok: (data, message) => Response.json({ success: true, data, message }),
  err: (message, status) => Response.json({ success: false, message }, { status }),
}));
jest.mock('@/lib/rateLimit', () => ({ apiLimiter: jest.fn(() => null) }));
jest.mock('@/models/Notification', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

const Notification = require('@/models/Notification').default;
const { GET } = require('../app/api/notifications/route');
const { PATCH, DELETE } = require('../app/api/notifications/[id]/route');
const notificationId = '507f1f77bcf86cd799439011';

function request() {
  return new Request('http://localhost/api/notifications');
}

describe('notification routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lists active notifications with an unread count', async () => {
    const notifications = [
      { _id: 'one', read: false },
      { _id: 'two', read: true },
    ];
    const query = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(notifications),
    };
    Notification.find.mockReturnValue(query);

    const response = await GET(request());
    const body = await response.json();

    expect(Notification.find).toHaveBeenCalledWith({ userId: 'student-1', dismissed: false });
    expect(body.data).toEqual({ notifications, unreadCount: 1 });
  });

  test('marks only the authenticated user’s notification as read', async () => {
    Notification.findOneAndUpdate.mockResolvedValue({ _id: notificationId, read: true });

    const response = await PATCH(request(), { params: { id: notificationId } });
    const body = await response.json();

    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: notificationId, userId: 'student-1', dismissed: false },
      { read: true },
      { new: true }
    );
    expect(body.data.read).toBe(true);
  });

  test('dismisses only the authenticated user’s notification', async () => {
    Notification.findOneAndUpdate.mockResolvedValue({ _id: notificationId, dismissed: true });

    const response = await DELETE(request(), { params: { id: notificationId } });
    const body = await response.json();

    expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: notificationId, userId: 'student-1', dismissed: false },
      { dismissed: true },
      { new: true }
    );
    expect(body.data.dismissed).toBe(true);
  });
});
