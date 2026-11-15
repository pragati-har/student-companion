jest.mock('@/lib/auth', () => ({
  getAuthUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/db', () => ({
  connectDB: jest.fn(),
}));
jest.mock('@/lib/rateLimit', () => ({
  rateLimit: () => jest.fn(() => null),
}));

const { connectDB } = require('@/lib/db');
const { POST } = require('../app/api/assignments/share/route');

describe('email route authentication', () => {
  test('rejects unauthenticated email submissions before connecting to the database', async () => {
    const request = new Request('http://localhost/api/assignments/share', { method: 'POST' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/not authenticated/i);
    expect(connectDB).not.toHaveBeenCalled();
  });
});
