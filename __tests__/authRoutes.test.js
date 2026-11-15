jest.mock('@/lib/db', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/rateLimit', () => ({ authLimiter: jest.fn(() => null) }));
jest.mock('@/lib/auth', () => ({
  signToken: jest.fn(() => 'signed-token'),
  buildAuthCookie: jest.fn(() => 'sc_token=signed-token; HttpOnly'),
}));
jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const User = require('@/models/User').default;
const { POST: register } = require('../app/api/auth/register/route');
const { POST: login } = require('../app/api/auth/login/route');

function request(body) {
  return new Request('http://localhost/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('registration and login routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers a local account and returns an auth cookie', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'student-1', name: 'Student', email: 'student@example.com' });

    const response = await register(request({
      name: 'Student',
      email: 'Student@Example.com',
      password: 'secure-password',
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toContain('sc_token=signed-token');
    expect(User.create).toHaveBeenCalledWith({
      name: 'Student',
      email: 'student@example.com',
      passwordHash: 'secure-password',
    });
    expect(body.data.user.email).toBe('student@example.com');
  });

  test('logs in an existing account with its password and returns an auth cookie', async () => {
    const user = {
      _id: 'student-1',
      name: 'Student',
      email: 'student@example.com',
      comparePassword: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

    const response = await login(request({ email: user.email, password: 'secure-password' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('sc_token=signed-token');
    expect(user.comparePassword).toHaveBeenCalledWith('secure-password');
    expect(body.data.user).toEqual({ _id: 'student-1', name: 'Student', email: 'student@example.com' });
  });
});
