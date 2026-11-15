/**
 * Tests for JWT auth helpers (lib/auth.js)
 * Uses a mocked next/headers so tests run in Node environment.
 */

// Mock next/headers before importing auth
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: jest.fn(() => null),
  })),
}));

// Provide required env vars
process.env.JWT_SECRET     = 'test-super-secret-key-for-jest-only';
process.env.JWT_EXPIRES_IN = '1h';

const {
  signToken,
  verifyToken,
  getAuthUser,
  buildAuthCookie,
  buildClearCookie,
} = require('../lib/auth');
const { cookies } = require('next/headers');

describe('JWT auth helpers', () => {
  const payload = { id: 'user123', email: 'test@example.com', name: 'Test User' };

  test('signToken returns a string', () => {
    const token = signToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  test('verifyToken decodes the correct payload', () => {
    const token   = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.name).toBe(payload.name);
  });

  test('verifyToken throws on invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });

  test('verifyToken throws on tampered token', () => {
    const token   = signToken(payload);
    const tampered = token.slice(0, -5) + 'xxxxx';
    expect(() => verifyToken(tampered)).toThrow();
  });

  test('getAuthUser awaits the Next.js 15 cookies promise', async () => {
    const token = signToken(payload);
    cookies.mockResolvedValue({
      get: jest.fn(() => ({ value: token })),
    });

    await expect(getAuthUser()).resolves.toMatchObject(payload);
  });

  test('buildAuthCookie sets HttpOnly and correct name', () => {
    const cookie = buildAuthCookie('mytoken');
    expect(cookie).toContain('sc_token=mytoken');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Lax');
  });

  test('buildClearCookie sets Max-Age=0', () => {
    const cookie = buildClearCookie();
    expect(cookie).toContain('sc_token=');
    expect(cookie).toContain('Max-Age=0');
  });
});
