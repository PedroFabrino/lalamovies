import { createHmac, timingSafeEqual } from 'node:crypto';

export function generateMagicLinkToken(id: string, notifyAt: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ id, notifyAt })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyMagicLinkToken(
  token: string,
  entryId: string,
  secret: string,
  graceHours = 6
): { valid: boolean; expired: boolean; payload?: { id: string; notifyAt: string } } {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, expired: false };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, expired: false };
  }

  const [payloadStr, sig] = parts;
  const expectedSig = createHmac('sha256', secret).update(payloadStr).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, expired: false };
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8')) as {
      id: string;
      notifyAt: string;
    };

    if (!parsed.id || !parsed.notifyAt || parsed.id !== entryId) {
      return { valid: false, expired: false };
    }

    const notifyTime = new Date(parsed.notifyAt).getTime();
    const now = Date.now();
    const graceMs = graceHours * 60 * 60 * 1000;

    if (now - notifyTime > graceMs) {
      return { valid: true, expired: true, payload: parsed };
    }

    return { valid: true, expired: false, payload: parsed };
  } catch {
    return { valid: false, expired: false };
  }
}

export async function deleteDiscordMessage(
  messageId: string,
  webhookUrl?: string,
  logger?: { warn: (msg: string) => void; error?: (msg: string, err?: unknown) => void }
): Promise<boolean> {
  const url = webhookUrl || process.env.WAITLIST_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!url || !messageId) {
    return false;
  }

  try {
    const cleanUrl = url.split('?')[0].replace(/\/+$/, '');
    const deleteUrl = `${cleanUrl}/messages/${encodeURIComponent(messageId)}`;
    const res = await fetch(deleteUrl, { method: 'DELETE' });
    if (res.ok || res.status === 404) {
      return true;
    }
    logger?.warn(`Failed to delete Discord message ${messageId}: HTTP ${res.status}`);
    return false;
  } catch (err) {
    logger?.warn(`Failed to delete Discord message ${messageId}: ${(err as Error).message}`);
    return false;
  }
}

export interface SendWaitlistNotificationOptions {
  id: string;
  title: string;
  year?: number | null;
  mediaType: string;
  releaseTitle: string;
  score: number;
  notifyAt: string;
  posterUrl?: string | null;
  secret: string;
  webhookUrl?: string;
  frontendUrl?: string;
  graceHours?: number;
  requesterMention?: string | null;
  adminRoleMention?: string | null;
  logger?: { warn: (msg: string) => void; error?: (msg: string, err?: unknown) => void };
}

export async function sendWaitlistNotification(
  options: SendWaitlistNotificationOptions
): Promise<string | null> {
  const webhookUrl =
    options.webhookUrl || process.env.WAITLIST_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.trim()) {
    return null;
  }

  const {
    id,
    title,
    year,
    releaseTitle,
    score,
    notifyAt,
    secret,
    posterUrl,
    graceHours = Number(process.env.NOTIFY_GRACE_HOURS) || 6,
  } = options;

  const frontendUrl = (
    options.frontendUrl ||
    process.env.FRONTEND_URL ||
    'https://lalamovies.stream'
  ).replace(/\/+$/, '');

  const token = generateMagicLinkToken(id, notifyAt, secret);
  const approveUrl = `${frontendUrl}/waitlist/${id}/approve?token=${encodeURIComponent(token)}`;
  const rejectUrl = `${frontendUrl}/waitlist/${id}/reject?token=${encodeURIComponent(token)}`;

  const titleText = year ? `${title} (${year})` : title;

  const mentions: string[] = [];
  if (options.requesterMention) {
    mentions.push(options.requesterMention);
  }
  if (options.adminRoleMention) {
    mentions.push(options.adminRoleMention);
  }
  const mentionText = mentions.length > 0 ? `${mentions.join(' ')} ` : '';

  const embed = {
    title: `Waitlist Release Found: ${titleText}`,
    description: `A qualifying 1080p+ release was discovered on trackers.\n**Auto-downloading in ${graceHours} hours** unless approved early or rejected.`,
    color: 0xeab308, // Warning yellow
    fields: [
      {
        name: 'Found Release',
        value: releaseTitle,
        inline: false,
      },
      {
        name: 'Score',
        value: `${score}`,
        inline: true,
      },
      {
        name: 'Grace Period',
        value: `${graceHours} hours`,
        inline: true,
      },
      {
        name: 'Actions',
        value: `✅ [**Approve & Download Now**](${approveUrl})\n❌ [**Reject Release**](${rejectUrl})`,
        inline: false,
      },
    ],
    thumbnail: posterUrl ? { url: posterUrl } : undefined,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Media Download Manager — Waitlist',
    },
  };

  try {
    const separator = webhookUrl.includes('?') ? '&' : '?';
    const targetUrl = `${webhookUrl}${separator}wait=true`;

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `${mentionText}**[Waitlist]** Qualifying release found for **${titleText}**! Auto-downloading in ${graceHours} hours.`,
        embeds: [embed],
      }),
    });

    if (!res.ok) {
      options.logger?.warn(`Discord webhook returned HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as { id?: string };
    return data.id || null;
  } catch (err) {
    options.logger?.warn(`Failed to send Discord webhook for waitlist entry ${id}: ${(err as Error).message}`);
    return null;
  }
}

export interface SendWaitlistErrorNotificationOptions {
  id: string;
  title: string;
  year?: number | null;
  mediaType: string;
  errorMessage: string;
  webhookUrl?: string;
  adminRoleMention?: string | null;
  logger?: { warn: (msg: string) => void; error?: (msg: string, err?: unknown) => void };
}

export async function sendWaitlistErrorNotification(
  options: SendWaitlistErrorNotificationOptions
): Promise<boolean> {
  const webhookUrl =
    options.webhookUrl || process.env.WAITLIST_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.trim()) {
    return false;
  }

  const { id, title, year, errorMessage, adminRoleMention } = options;
  const titleText = year ? `${title} (${year})` : title;
  const mentionPrefix = adminRoleMention ? `${adminRoleMention} ` : '';

  const embed = {
    title: `Waitlist Auto-Download Failed: ${titleText}`,
    description: `Auto-download submission failed after 3 attempts.\n**Error:** ${errorMessage}`,
    color: 0xef4444, // Error red
    fields: [
      { name: 'Media', value: titleText, inline: true },
      { name: 'Status', value: 'error', inline: true },
      { name: 'Details', value: errorMessage, inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Media Download Manager — Waitlist',
    },
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `${mentionPrefix}**[Waitlist Alert]** Auto-download submission failed for **${titleText}**!`,
        embeds: [embed],
      }),
    });
    return res.ok;
  } catch (err) {
    options.logger?.warn(`Failed to send Discord error notification for waitlist entry ${id}: ${(err as Error).message}`);
    return false;
  }
}

export class ResendNotifier {
  constructor(private apiKey?: string) {}

  async send(event: string, payload: { title: string; recipientEmail?: string | null }): Promise<void> {
    const key = this.apiKey || process.env.RESEND_API_KEY;
    if (!key || !key.trim()) {
      return;
    }
    console.log(
      `[ResendNotifier] ${event}: ${payload.title} (email sending is not yet implemented)`
    );
  }
}

export interface SendWaitlistCancelNotificationOptions {
  title: string;
  year?: number | null;
  webhookUrl?: string;
  resendApiKey?: string;
  recipientEmail?: string | null;
  logger?: { warn: (msg: string) => void; error?: (msg: string, err?: unknown) => void };
}

export async function sendWaitlistCancelNotification(
  options: SendWaitlistCancelNotificationOptions
): Promise<boolean> {
  const webhookUrl =
    options.webhookUrl || process.env.WAITLIST_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

  const titleText = options.year ? `${options.title} (${options.year})` : options.title;
  const message = `Your Waitlist Entry for ${titleText} was cancelled by an admin.`;

  let discordOk = false;
  if (webhookUrl && webhookUrl.trim()) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          embeds: [
            {
              title: 'Waitlist Entry Cancelled',
              description: message,
              color: 0xef4444,
              timestamp: new Date().toISOString(),
              footer: {
                text: 'Media Download Manager — Waitlist',
              },
            },
          ],
        }),
      });
      discordOk = res.ok;
    } catch (err) {
      options.logger?.warn(`Failed to send Discord cancel notification: ${(err as Error).message}`);
    }
  }

  const resend = new ResendNotifier(options.resendApiKey);
  await resend.send('waitlist.cancelled', {
    title: message,
    recipientEmail: options.recipientEmail,
  });

  return discordOk;
}