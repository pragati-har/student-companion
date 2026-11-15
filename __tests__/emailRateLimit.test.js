jest.mock('@/models/EmailSendQuota', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

const EmailSendQuota = require('@/models/EmailSendQuota').default;
const { consumeEmailSendQuota } = require('../lib/emailRateLimit');

describe('distributed email send quota', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    EmailSendQuota.init.mockResolvedValue();
  });

  test('atomically permits only ten sends per user in the shared time window', async () => {
    let count = 0;
    EmailSendQuota.findOneAndUpdate.mockImplementation(() => {
      count = Math.min(count + 1, 11);
      return Promise.resolve({ count });
    });

    const outcomes = await Promise.all(
      Array.from({ length: 20 }, () => consumeEmailSendQuota('student-1'))
    );

    expect(outcomes.filter(Boolean)).toHaveLength(10);
    expect(outcomes.filter(value => !value)).toHaveLength(10);
    expect(EmailSendQuota.findOneAndUpdate).toHaveBeenCalledTimes(20);

    const [filter, pipeline, options] = EmailSendQuota.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ userId: 'student-1' });
    expect(pipeline[0].$set.count.$cond[2].$cond[1]).toEqual({ $add: ['$count', 1] });
    expect(options).toMatchObject({ upsert: true, new: true, timestamps: false });
  });

  test('retries a concurrent first-upsert unique-key race', async () => {
    EmailSendQuota.findOneAndUpdate
      .mockRejectedValueOnce(Object.assign(new Error('duplicate key'), { code: 11000 }))
      .mockResolvedValueOnce({ count: 1 });

    await expect(consumeEmailSendQuota('student-1')).resolves.toBe(true);
    expect(EmailSendQuota.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });
});
