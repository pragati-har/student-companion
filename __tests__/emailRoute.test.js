jest.mock('@/lib/middleware', () => ({
  err: (message, status) => Response.json({ success: false, message }, { status }),
}));
jest.mock('@/lib/email', () => {
  class EmailConfigurationError extends Error {}
  class EmailDeliveryInProgressError extends Error {}
  class EmailSendLimitError extends Error {}
  class EmailProviderError extends Error {}

  return {
    EmailConfigurationError,
    EmailDeliveryInProgressError,
    EmailSendLimitError,
    EmailProviderError,
    isValidEmailAddress: value => typeof value === 'string'
      && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value),
    isValidRequestId: value => typeof value === 'string'
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
    sendTransactionalEmail: jest.fn(),
  };
});

const {
  EmailConfigurationError,
  EmailDeliveryInProgressError,
  EmailSendLimitError,
  EmailProviderError,
  sendTransactionalEmail,
} = require('@/lib/email');
const { readEmailRequest, submitEmail } = require('../lib/emailRoute');
const requestId = '123e4567-e89b-42d3-a456-426614174000';

function request(body) {
  return new Request('http://localhost/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('shared email route behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates recipient and idempotency request id', async () => {
    await expect(readEmailRequest(request(JSON.stringify({
      recipient: 'person@example.com',
      requestId,
    }))).then(result => result.recipient)).resolves.toBe('person@example.com');

    const invalid = await readEmailRequest(request(JSON.stringify({
      recipient: 'not-an-address',
      requestId,
    })));
    expect(invalid.response.status).toBe(400);

    const invalidKey = await readEmailRequest(request(JSON.stringify({
      recipient: 'person@example.com',
      requestId: 'not-a-uuid',
    })));
    expect(invalidKey.response.status).toBe(400);
  });

  test('rejects malformed JSON without throwing', async () => {
    const result = await readEmailRequest(request('{'));
    expect(result.response.status).toBe(400);
  });

  test('returns provider acceptance without implying guaranteed delivery', async () => {
    sendTransactionalEmail.mockResolvedValue({
      emailId: 'email-accepted',
      sentTo: 'person@example.com',
      alreadySent: false,
    });

    const { response } = await submitEmail({
      userId: 'student-1',
      recipient: 'person@example.com',
      dedupeKey: 'one-action',
      subject: 'List',
      text: 'Task',
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Email accepted by Resend.');
    expect(body.data).toEqual({ sentTo: 'person@example.com', alreadySent: false });
    expect(sendTransactionalEmail).toHaveBeenCalledWith({
      userId: 'student-1',
      to: 'person@example.com',
      dedupeKey: 'one-action',
      subject: 'List',
      text: 'Task',
    });
  });

  test('maps missing configuration to a safe 503 response', async () => {
    sendTransactionalEmail.mockRejectedValue(new EmailConfigurationError('secret detail'));

    const { response } = await submitEmail({
      userId: 'student-1',
      recipient: 'person@example.com',
      dedupeKey: 'one-action',
      subject: 'List',
      text: 'Task',
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toBe('Email delivery is not configured on the server.');
    expect(JSON.stringify(body)).not.toContain('secret detail');
  });

  test('maps Resend failure and duplicate-in-progress errors safely', async () => {
    const parameters = {
      userId: 'student-1',
      recipient: 'person@example.com',
      dedupeKey: 'one-action',
      subject: 'List',
      text: 'Task',
    };

    sendTransactionalEmail.mockRejectedValueOnce(new EmailProviderError('private API response'));
    const failed = await submitEmail(parameters);
    expect(failed.response.status).toBe(502);
    expect((await failed.response.json()).message).toBe('Email could not be submitted. Please try again later.');

    sendTransactionalEmail.mockRejectedValueOnce(new EmailDeliveryInProgressError('internal detail'));
    const pending = await submitEmail(parameters);
    expect(pending.response.status).toBe(409);
    expect((await pending.response.json()).message).not.toContain('internal detail');
  });

  test('maps distributed send-limit errors to a safe 429 response', async () => {
    sendTransactionalEmail.mockRejectedValue(new EmailSendLimitError('private quota detail'));

    const { response } = await submitEmail({
      userId: 'student-1',
      recipient: 'person@example.com',
      dedupeKey: 'one-action',
      subject: 'List',
      text: 'Task',
    });

    expect(response.status).toBe(429);
    expect((await response.json()).message).toBe('Email send limit reached. Please try again later.');
  });
});
