export type NotificationEvent = 'download.completed' | 'cleanup.scheduled' | 'cleanup.done';

export interface NotificationPayload {
  title: string;
  requestId?: string;
  scheduledDeleteAt?: string;
  path?: string;
  reason?: string;
}

export interface INotificationService {
  send(event: NotificationEvent, payload: NotificationPayload): Promise<void>;
}

export class DiscordNotifier implements INotificationService {
  constructor(private webhookUrl?: string) {}

  async send(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    const url = this.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (!url) {
      return; // Silently no-op if no URL configured
    }

    let title = 'Media Download Manager';
    let description = '';
    let color = 0x3b82f6; // Blue default

    switch (event) {
      case 'download.completed':
        title = 'Download Completed';
        description = `**${payload.title}** has finished downloading and is now available in Jellyfin.`;
        color = 0x22c55e; // Green
        break;
      case 'cleanup.scheduled':
        title = 'Cleanup Warning (24h Notice)';
        description = `**${payload.title}** is scheduled for auto-deletion in 24 hours to free up disk space. If you wish to keep it, ask an admin to enable the Keep Flag in the dashboard.`;
        color = 0xf59e0b; // Amber/Orange
        break;
      case 'cleanup.done':
        title = 'Media Cleaned Up';
        description = `**${payload.title}** has been removed from the server library to reclaim disk space.`;
        color = 0xef4444; // Red
        break;
    }

    const body = {
      embeds: [
        {
          title,
          description,
          color,
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Media Download Manager',
          },
        },
      ],
    };

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Notification errors should never crash application
    }
  }
}

export class ResendNotifier implements INotificationService {
  constructor(private apiKey?: string) {}

  async send(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    const key = this.apiKey || process.env.RESEND_API_KEY;
    if (!key) {
      // Stub: log to console when key is not set
      return;
    }
    // Stub implementation ready for activation
    console.log(`[ResendNotifier] ${event}: ${payload.title}`);
  }
}

export class NotificationService implements INotificationService {
  private notifiers: INotificationService[];

  constructor(webhookUrl?: string, resendApiKey?: string) {
    this.notifiers = [
      new DiscordNotifier(webhookUrl),
      new ResendNotifier(resendApiKey),
    ];
  }

  async send(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    await Promise.all(this.notifiers.map((n) => n.send(event, payload)));
  }
}