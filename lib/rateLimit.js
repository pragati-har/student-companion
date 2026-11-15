/**
 * Simple in-memory rate limiter for Next.js Route Handlers.
 *
 * Usage:
 *   const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
 *   const limited = limiter(req);
 *   if (limited) return limited; // returns a 429 NextResponse
 */

import { NextResponse } from 'next/server';

const store = new Map();

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 100 } = {}) {
  return function limit(req, scope) {
    // Use the forwarded IP or fallback
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const now = Date.now();
    const key = `${ip}:${scope || req.nextUrl?.pathname || '/'}`;

    if (!store.has(key)) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return null;
    }

    const entry = store.get(key);

    if (now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return null;
    }

    entry.count += 1;
    if (entry.count > max) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) } }
      );
    }

    return null;
  };
}

// Pre-configured limiters
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
export const apiLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
