import { NextResponse } from 'next/server';
import { getAuthUser } from './auth';
import { connectDB } from './db';

/**
 * Wraps a route handler with authentication.
 * Injects `req.user` (decoded JWT payload) if valid, otherwise returns 401.
 *
 * Usage:
 *   export const GET = withAuth(async (req, context, user) => { ... });
 */
export function withAuth(handler) {
  return async function (req, context) {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated. Please log in.' },
        { status: 401 }
      );
    }
    await connectDB();
    return handler(req, context, user);
  };
}

/**
 * Standard success response.
 */
export function ok(data, message = 'Success', status = 200, extra = {}) {
  return NextResponse.json({ success: true, message, data, ...extra }, { status });
}

/**
 * Standard error response.
 */
export function err(message, status = 400, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return NextResponse.json(body, { status });
}
