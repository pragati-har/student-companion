import EmailSendQuota from '@/models/EmailSendQuota';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_EMAILS_PER_WINDOW = 10;

export async function consumeEmailSendQuota(userId) {
  await EmailSendQuota.init();

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  const isNewWindow = {
    $or: [
      { $eq: [{ $type: '$windowStartedAt' }, 'missing'] },
      { $lte: ['$windowStartedAt', windowStart] },
    ],
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const quota = await EmailSendQuota.findOneAndUpdate(
        { userId },
        [{
          $set: {
            windowStartedAt: { $cond: [isNewWindow, now, '$windowStartedAt'] },
            count: {
              $cond: [
                isNewWindow,
                1,
                { $cond: [{ $lte: ['$count', MAX_EMAILS_PER_WINDOW] }, { $add: ['$count', 1] }, '$count'] },
              ],
            },
          },
        }],
        { upsert: true, new: true, timestamps: false }
      );

      return quota.count <= MAX_EMAILS_PER_WINDOW;
    } catch (error) {
      if (error.code !== 11000 || attempt === 2) throw error;
    }
  }

  return false;
}
