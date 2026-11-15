jest.mock('resend', () => ({ Resend: jest.fn() }));
jest.mock('@/models/EmailDelivery', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock('@/lib/emailRateLimit', () => ({
  consumeEmailSendQuota: jest.fn().mockResolvedValue(true),
}));

const { Resend } = require('resend');
const EmailDelivery = require('@/models/EmailDelivery').default;
const { consumeEmailSendQuota } = require('@/lib/emailRateLimit');
const {
  EmailConfigurationError,
  EmailDeliveryInProgressError,
  EmailSendLimitError,
  EmailProviderError,
  isValidEmailAddress,
  getEmailConfigurationStatus,
  sendTransactionalEmail,
} = require('../lib/email');

const mockSend = jest.fn();
const delivery = { _id: 'delivery-1', recipient: 'recipient@example.com', emailId: 'email-1' };

describe('Resend email delivery', () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalSender = process.env.EMAIL_FROM;

  beforeAll(() => {
    Resend.mockImplementation(() => ({ emails: { send: mockSend } }));
  });

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'Student Companion <notify@example.com>';
    jest.clearAllMocks();
    EmailDelivery.init.mockResolvedValue();
    EmailDelivery.create.mockResolvedValue(delivery);
    EmailDelivery.updateOne.mockResolvedValue({ modifiedCount: 1 });
    consumeEmailSendQuota.mockResolvedValue(true);
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalSender === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = originalSender;
  });

  test('validates recipient email addresses', () => {
    expect(isValidEmailAddress('recipient@example.com')).toBe(true);
    expect(isValidEmailAddress('not-an-email')).toBe(false);
    expect(isValidEmailAddress('recipient@example.com\r\nBcc: other@example.com')).toBe(false);
    expect(isValidEmailAddress('first..last@example.com')).toBe(false);
    expect(isValidEmailAddress('recipient@-example.com')).toBe(false);
  });

  test.each([
    ['plain address', 'notifications@your-verified-domain.com', true, true],
    ['display name', 'Student Companion <notifications@your-verified-domain.com>', true, true],
    ['trimmed outer whitespace', '  Student Companion <notifications@your-verified-domain.com>  ', true, true],
    ['trimmed address whitespace', 'Student Companion < notifications@your-verified-domain.com >', true, true],
    ['malformed address', 'Student Companion <not-an-address>', true, false],
    ['malformed display name format', 'Student Companion [notifications@your-verified-domain.com]', true, false],
    ['empty sender', '', false, false],
    ['whitespace-only sender', '   ', false, false],
  ])('validates sender configuration: %s', (_description, sender, expectedFormat, expectedAddress) => {
    process.env.EMAIL_FROM = sender;
    expect(getEmailConfigurationStatus()).toEqual({
      apiKeyPresent: true,
      senderConfigured: Boolean(sender.trim()),
      senderFormatValid: expectedFormat,
      senderAddressValid: expectedAddress,
      validationPassed: expectedFormat && expectedAddress,
    });
  });

  test('logs only safe configuration booleans during initialization', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});

    try {
      await sendTransactionalEmail({
        userId: 'student-1',
        dedupeKey: 'configuration-diagnostic',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
      });

      expect(info).toHaveBeenCalledWith('[email] Configuration diagnostics:', {
        apiKeyPresent: true,
        senderConfigured: true,
        senderFormatValid: true,
        senderAddressValid: true,
        validationPassed: true,
      });
      expect(JSON.stringify(info.mock.calls)).not.toContain('re_test_key');
      expect(JSON.stringify(info.mock.calls)).not.toContain('notify@example.com');
    } finally {
      info.mockRestore();
    }
  });

  test('submits HTML and text to Resend with a stable idempotency key', async () => {
    process.env.RESEND_API_KEY = 're_test_submission_key';

    await expect(sendTransactionalEmail({
      userId: 'student-1',
      dedupeKey: 'assignment-list:request-id',
      to: 'recipient@example.com',
      subject: 'Assignment list',
      text: 'Task <script>alert(1)</script>',
    })).resolves.toEqual({
      emailId: 'email-1',
      sentTo: 'recipient@example.com',
      alreadySent: false,
    });

    expect(Resend).toHaveBeenCalledWith('re_test_submission_key');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Student Companion <notify@example.com>',
        to: 'recipient@example.com',
        subject: 'Assignment list',
        text: 'Task <script>alert(1)</script>',
        html: expect.stringContaining('&lt;script&gt;'),
      }),
      { idempotencyKey: expect.stringMatching(/^[a-f0-9]{64}$/) }
    );
    expect(EmailDelivery.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'student-1',
      dedupeKey: 'assignment-list:request-id',
      status: 'pending',
    }));
    expect(EmailDelivery.updateOne).toHaveBeenCalledWith(
      { _id: 'delivery-1', status: 'pending' },
      { $set: { status: 'accepted', emailId: 'email-1' } }
    );
  });

  test('fails clearly when server email configuration is missing', async () => {
    delete process.env.RESEND_API_KEY;

    await expect(sendTransactionalEmail({
      userId: 'student-1',
      dedupeKey: 'request',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Test',
    })).rejects.toBeInstanceOf(EmailConfigurationError);
    expect(EmailDelivery.create).not.toHaveBeenCalled();
  });

  test('rejects malformed or header-injected sender identities', async () => {
    process.env.EMAIL_FROM = 'notify@example.com\nBcc: other@example.com';

    await expect(sendTransactionalEmail({
      userId: 'student-1',
      dedupeKey: 'invalid-sender',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Test',
    })).rejects.toBeInstanceOf(EmailConfigurationError);
    expect(EmailDelivery.create).not.toHaveBeenCalled();

    process.env.EMAIL_FROM = 'Student Companion <notify@example.com> unexpected';
    await expect(sendTransactionalEmail({
      userId: 'student-1',
      dedupeKey: 'invalid-sender-format',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Test',
    })).rejects.toBeInstanceOf(EmailConfigurationError);
  });

  test('reports Resend initialization failures separately from missing configuration', async () => {
    process.env.RESEND_API_KEY = 're_initialization_failure';
    Resend.mockImplementationOnce(() => {
      throw new Error('private initialization detail');
    });
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(sendTransactionalEmail({
        userId: 'student-1',
        dedupeKey: 'initialization-failure',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
      })).rejects.toBeInstanceOf(EmailProviderError);
      expect(EmailDelivery.create).not.toHaveBeenCalled();
      expect(errorLog).toHaveBeenCalledWith('[email] Resend client initialization failed.');
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain('private initialization detail');
    } finally {
      errorLog.mockRestore();
    }
  });

  test('returns an accepted prior result without submitting a duplicate', async () => {
    EmailDelivery.create.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: 11000 }));
    EmailDelivery.findOne.mockResolvedValue({
      status: 'accepted',
      recipient: 'recipient@example.com',
      emailId: 'prior-email',
    });

    await expect(sendTransactionalEmail({
      userId: 'student-1',
      dedupeKey: 'same-reminder',
      to: 'recipient@example.com',
      subject: 'Reminder',
      text: 'Reminder',
    })).resolves.toEqual({
      emailId: 'prior-email',
      sentTo: 'recipient@example.com',
      alreadySent: true,
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('does not submit a duplicate while an earlier request is pending', async () => {
    EmailDelivery.create.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: 11000 }));
    EmailDelivery.findOne.mockResolvedValue({
      _id: 'delivery-1',
      status: 'pending',
      updatedAt: new Date(),
    });

    await expect(sendTransactionalEmail({
      userId: 'student-1',
      dedupeKey: 'pending-request',
      to: 'recipient@example.com',
      subject: 'Reminder',
      text: 'Reminder',
    })).rejects.toBeInstanceOf(EmailDeliveryInProgressError);
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('a concurrent duplicate request waits on the atomic MongoDB reservation', async () => {
    let resolveSend;
    mockSend.mockReturnValueOnce(new Promise(resolve => { resolveSend = resolve; }));
    EmailDelivery.create
      .mockResolvedValueOnce(delivery)
      .mockRejectedValueOnce(Object.assign(new Error('duplicate key'), { code: 11000 }));
    EmailDelivery.findOne.mockResolvedValue({
      _id: 'delivery-1',
      status: 'pending',
      updatedAt: new Date(),
    });

    const first = sendTransactionalEmail({
      userId: 'student-1',
      dedupeKey: 'same-request',
      to: 'recipient@example.com',
      subject: 'Reminder',
      text: 'Reminder',
    });
    await new Promise(resolve => setImmediate(resolve));
    await expect(sendTransactionalEmail({
      userId: 'student-1',
      dedupeKey: 'same-request',
      to: 'recipient@example.com',
      subject: 'Reminder',
      text: 'Reminder',
    })).rejects.toBeInstanceOf(EmailDeliveryInProgressError);

    expect(mockSend).toHaveBeenCalledTimes(1);
    resolveSend({ data: { id: 'email-1' }, error: null });
    await expect(first).resolves.toMatchObject({ emailId: 'email-1', alreadySent: false });
  });

  test('enforces the distributed per-user quota before contacting Resend', async () => {
    consumeEmailSendQuota.mockResolvedValue(false);

    await expect(sendTransactionalEmail({
      userId: 'student-1',
      dedupeKey: 'over-limit',
      to: 'recipient@example.com',
      subject: 'Reminder',
      text: 'Reminder',
    })).rejects.toBeInstanceOf(EmailSendLimitError);

    expect(mockSend).not.toHaveBeenCalled();
    expect(EmailDelivery.updateOne).toHaveBeenCalledWith(
      { _id: 'delivery-1', status: 'pending' },
      { $set: { status: 'failed' } }
    );
  });

  test('hides Resend error details and marks a failed submission retryable', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'private provider detail' } });
    const logError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendTransactionalEmail({
      userId: 'student-1',
      dedupeKey: 'failed-request',
      to: 'recipient@example.com',
      subject: 'Reminder',
      text: 'Reminder',
    })).rejects.toThrow(EmailProviderError);

    const loggedDetails = logError.mock.calls.flat().join(' ');
    expect(loggedDetails).not.toContain('recipient@example.com');
    expect(loggedDetails).not.toContain('private provider detail');
    expect(loggedDetails).not.toContain('re_test_key');
    expect(EmailDelivery.updateOne).toHaveBeenCalledWith(
      { _id: 'delivery-1', status: 'pending' },
      { $set: { status: 'failed' } }
    );
    logError.mockRestore();
  });
});
