import { err } from '@/lib/middleware';
import {
  EmailConfigurationError,
  EmailDeliveryInProgressError,
  EmailSendLimitError,
  EmailProviderError,
  isValidEmailAddress,
  isValidRequestId,
  sendTransactionalEmail,
} from '@/lib/email';

export async function readEmailRequest(req, { requireRequestId = true } = {}) {
  let body;
  try {
    body = await req.json();
  } catch {
    return { response: err('Request body must be valid JSON.', 400) };
  }

  const recipient = typeof body?.recipient === 'string' ? body.recipient.trim() : '';
  if (!isValidEmailAddress(recipient)) {
    return { response: err('Enter a valid recipient email address.', 400) };
  }

  if (requireRequestId && !isValidRequestId(body?.requestId)) {
    return { response: err('Invalid email request. Please try again.', 400) };
  }

  return { recipient, requestId: body?.requestId, body };
}

export async function submitEmail({ userId, recipient, dedupeKey, subject, text }) {
  try {
    const result = await sendTransactionalEmail({ userId, to: recipient, dedupeKey, subject, text });
    return {
      response: Response.json({
        success: true,
        message: result.alreadySent
          ? 'This email was already accepted by Resend.'
          : 'Email accepted by Resend.',
        data: { sentTo: result.sentTo, alreadySent: result.alreadySent },
      }),
    };
  } catch (error) {
    if (error instanceof EmailConfigurationError) {
      return { response: err('Email delivery is not configured on the server.', 503) };
    }
    if (error instanceof EmailDeliveryInProgressError) {
      return { response: err('This email is already being processed. Please wait before trying again.', 409) };
    }
    if (error instanceof EmailSendLimitError) {
      return { response: err('Email send limit reached. Please try again later.', 429) };
    }
    if (error instanceof EmailProviderError) {
      return { response: err('Email could not be submitted. Please try again later.', 502) };
    }

    console.error('[email] Unexpected email route failure:', error?.name || 'UnknownError');
    return { response: err('Email could not be submitted. Please try again later.', 502) };
  }
}
