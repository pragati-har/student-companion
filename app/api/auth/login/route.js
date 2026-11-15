import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { signToken, buildAuthCookie } from '@/lib/auth';
import { authLimiter } from '@/lib/rateLimit';
import User from '@/models/User';

export async function POST(req) {
  const limited = authLimiter(req);
  if (limited) return limited;

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
    }

    await connectDB();

    // Explicitly select passwordHash since it's excluded by default
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
    }

    const token = signToken({ id: user._id, email: user.email, name: user.name });

    // Build clean user object (no passwordHash)
    const safeUser = { _id: user._id, name: user.name, email: user.email };

    return NextResponse.json(
      { success: true, message: 'Login successful.', data: { user: safeUser } },
      {
        status: 200,
        headers: { 'Set-Cookie': buildAuthCookie(token) },
      }
    );
  } catch (error) {
    console.error('[auth/login]', error);
    return NextResponse.json({ success: false, message: 'Login failed. Please try again.' }, { status: 500 });
  }
}
