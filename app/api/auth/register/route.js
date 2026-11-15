import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { signToken, buildAuthCookie } from '@/lib/auth';
import { authLimiter } from '@/lib/rateLimit';
import User from '@/models/User';

export async function POST(req) {
  const limited = authLimiter(req);
  if (limited) return limited;

  try {
    const { name, email, password } = await req.json();

    // Validate inputs
    const errors = {};
    if (!name || name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'A valid email is required.';
    if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, message: 'Validation failed.', errors }, { status: 400 });
    }

    await connectDB();

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return NextResponse.json({ success: false, message: 'An account with this email already exists.' }, { status: 409 });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password, // pre-save hook hashes this
    });

    const token = signToken({ id: user._id, email: user.email, name: user.name });

    return NextResponse.json(
      { success: true, message: 'Account created successfully!', data: { user } },
      {
        status: 201,
        headers: { 'Set-Cookie': buildAuthCookie(token) },
      }
    );
  } catch (error) {
    console.error('[auth/register]', error);
    return NextResponse.json({ success: false, message: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
