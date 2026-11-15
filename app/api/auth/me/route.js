import { withAuth, ok, err } from '@/lib/middleware';
import User from '@/models/User';

export const GET = withAuth(async (req, context, tokenUser) => {
  const user = await User.findById(tokenUser.id);
  if (!user) return err('User not found.', 404);
  return ok(user);
});
