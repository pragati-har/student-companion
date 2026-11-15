import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import EmailDelivery from '@/models/EmailDelivery';
import { consumeEmailSendQuota } from '@/lib/emailRateLimit';
import { renderEmailTemplate } from '@/lib/emailTemplate';

const EMAIL_LOCAL_PATTERN = /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const EMAIL_DOMAIN_LABEL_PATTERN = /^[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?$/i;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PENDING_TIMEOUT_MS = 5 * 60 * 1000;

let resendClient;
let resendClientApiKey;

export class EmailConfigurationError extends Error {}
export class EmailDeliveryInProgressError extends Error {}
export class EmailSendLimitError extends Error {}
export class EmailProviderError extends Error {}

export function isValidEmailAddress(value) {
  if (typeof value !== 'string' || value.length > 254 || value !== value.trim()) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || local.length > 64 || !EMAIL_LOCAL_PATTERN.test(local) || domain.length > 253) return false;

  const labels = domain.split('.');
  return labels.length >= 2
    && labels.every(label => label.length > 0 && label.length <= 63 && EMAIL_DOMAIN_LABEL_PATTERN.test(label))
    && labels[labels.length - 1].length >= 2;
}

export function isValidRequestId(value) {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value);
}

function getSenderAddress(sender) {
  if (typeof sender !== 'string' || /[\r\n]/.test(sender)) return null;

  const configuredSender = sender.trim();
  if (!configuredSender) return null;

  if (configuredSender.includes('<') || configuredSender.includes('>')) {
    const formattedSender = configuredSender.match(/^(?:"([^"\r\n]+)"|([^<>\r\n]+))\s*<([^<>]+)>$/);
    if (!formattedSender || !(formattedSender[1] || formattedSender[2]).trim()) return null;
    return formattedSender[3].trim();
  }

  return configuredSender;
}

export function getEmailConfigurationStatus() {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EMAIL_FROM;
  const apiKeyPresent = typeof apiKey === 'string' && apiKey.trim().length > 0;
  const senderConfigured = typeof sender === 'string' && sender.trim().length > 0;
  const senderAddress = getSenderAddress(sender);
  const senderFormatValid = senderAddress !== null;
  const senderAddressValid = senderFormatValid && isValidEmailAddress(senderAddress);

  return {
    apiKeyPresent,
    senderConfigured,
    senderFormatValid,
    senderAddressValid,
    validationPassed: apiKeyPresent && senderConfigured && senderAddressValid,
  };
}

function getResendClient() {
  const status = getEmailConfigurationStatus();
  console.info('[email] Configuration diagnostics:', {
    apiKeyPresent: status.apiKeyPresent,
    senderConfigured: status.senderConfigured,
    senderFormatValid: status.senderFormatValid,
    senderAddressValid: status.senderAddressValid,
    validationPassed: status.validationPassed,
  });

  if (!status.validationPassed) {
    throw new EmailConfigurationError('Email service configuration is incomplete.');
  }

  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EMAIL_FROM.trim();
  if (!resendClient || resendClientApiKey !== apiKey) {
    try {
      resendClient = new Resend(apiKey);
    } catch {
      console.error('[email] Resend client initialization failed.');
      throw new EmailProviderError('Resend client could not be initialized.');
    }
    resendClientApiKey = apiKey;
  }
  return { resend: resendClient, sender };
}

function getResendIdempotencyKey(userId, dedupeKey) {
  return createHash('sha256').update(`${userId}:${dedupeKey}`).digest('hex');
}

async function reserveDelivery({ userId, dedupeKey, recipient }) {
  await EmailDelivery.init();

  try {
    return {
      delivery: await EmailDelivery.create({ userId, dedupeKey, recipient, status: 'pending' }),
      alreadySent: false,
    };
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  const existing = await EmailDelivery.findOne({ userId, dedupeKey });
  if (!existing) throw new EmailDeliveryInProgressError('A matching email submission is already in progress.');
  if (existing.status === 'accepted') return { delivery: existing, alreadySent: true };

  if (
    existing.status === 'pending'
    && Date.now() - existing.updatedAt.getTime() < PENDING_TIMEOUT_MS
  ) {
    throw new EmailDeliveryInProgressError('A matching email submission is already in progress.');
  }

  const delivery = await EmailDelivery.findOneAndUpdate(
    { _id: existing._id, status: existing.status, updatedAt: existing.updatedAt },
    { $set: { status: 'pending', recipient }, $unset: { emailId: 1 } },
    { new: true }
  );
  if (!delivery) throw new EmailDeliveryInProgressError('A matching email submission is already in progress.');

  return { delivery, alreadySent: false };
}

export async function sendTransactionalEmail({ userId, dedupeKey, to, subject, text }) {
  const { resend, sender } = getResendClient();
  const { delivery, alreadySent } = await reserveDelivery({ userId, dedupeKey, recipient: to });
  if (alreadySent) {
    return { emailId: delivery.emailId, sentTo: delivery.recipient, alreadySent: true };
  }

  try {
    if (!(await consumeEmailSendQuota(userId))) {
      await EmailDelivery.updateOne(
        { _id: delivery._id, status: 'pending' },
        { $set: { status: 'failed' } }
      );
      throw new EmailSendLimitError('Email send limit reached.');
    }

    const { data, error } = await resend.emails.send(
      {
        from: sender,
        to,
        subject: subject.replace(/[\r\n]+/g, ' ').slice(0, 200),
        text,
        html: renderEmailTemplate({ subject, text }),
      },
      { idempotencyKey: getResendIdempotencyKey(userId, dedupeKey) }
    );

    if (error || !data?.id) {
      await EmailDelivery.updateOne(
        { _id: delivery._id, status: 'pending' },
        { $set: { status: 'failed' } }
      );
      throw new EmailProviderError('Resend did not accept the email.');
    }

    await EmailDelivery.updateOne(
      { _id: delivery._id, status: 'pending' },
      { $set: { status: 'accepted', emailId: data.id } }
    );

    return { emailId: data.id, sentTo: to, alreadySent: false };
  } catch (error) {
    if (error instanceof EmailSendLimitError) throw error;

    if (!(error instanceof EmailProviderError)) {
      await EmailDelivery.updateOne(
        { _id: delivery._id, status: 'pending' },
        { $set: { status: 'failed' } }
      );
    }
    console.error('[email] Resend submission failed:', error.name || 'UnknownError');
    throw new EmailProviderError('Resend could not accept the email.');
  }
}
