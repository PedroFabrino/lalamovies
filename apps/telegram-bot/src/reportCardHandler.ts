import { MdmApiClient } from './apiClient';
import { TelegramBotClient } from './telegramClient';
import { InlineKeyboardMarkup, ReportItem, ReportWaitlistItem, UserReportResponse } from './types';

export class ReportCardHandler {
  constructor(
    private telegram: TelegramBotClient,
    private apiClient: MdmApiClient
  ) {}

  private pad(n?: number | null): string {
    return n !== undefined && n !== null ? String(n).padStart(2, '0') : '';
  }

  private escapeMd(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  private formatStatus(status: string): string {
    switch (status) {
      case 'queued':
        return 'Na fila';
      case 'downloading':
        return 'Baixando';
      case 'hardlinking':
        return 'Organizando';
      case 'unarchiving':
        return 'Extraindo';
      case 'seeding':
        return 'Finalizando';
      case 'done':
        return 'Concluído';
      default:
        return status;
    }
  }

  private formatWaitlistStatus(status: string): string {
    switch (status) {
      case 'pending_release':
        return 'Aguardando lançamento';
      case 'checking':
        return 'Monitorando';
      case 'notified':
        return 'Disponível';
      default:
        return status;
    }
  }

  private formatEpisodeInfo(item: { seasonNumber?: number | null; episodeNumber?: number | null }): string {
    if (item.seasonNumber && item.episodeNumber) {
      return ` — S${this.pad(item.seasonNumber)}E${this.pad(item.episodeNumber)}`;
    }
    if (item.seasonNumber) {
      return ` — Temporada ${item.seasonNumber}`;
    }
    return '';
  }

  renderReportCard(report: UserReportResponse): { text: string; replyMarkup: InlineKeyboardMarkup } {
    const replyMarkup: InlineKeyboardMarkup = {
      inline_keyboard: [[{ text: '🔄 Atualizar', callback_data: 'report:refresh' }]],
    };

    const hasActive = report.active.length > 0;
    const hasWaitlist = report.waitlist.length > 0;
    const hasCompleted = report.completed.length > 0;

    if (!hasActive && !hasWaitlist && !hasCompleted) {
      const text =
        `📊 *Seus Pedidos no MDM*\n\n` +
        `Nenhum download ou item monitorado no momento.\n` +
        `Envie o nome de um filme, série ou anime para começar! 🍿`;
      return { text, replyMarkup };
    }

    const lines: string[] = [`📊 *Seus Pedidos no MDM*\n`];

    if (hasActive) {
      lines.push(`*⏳ Em Andamento:*`);
      for (const item of report.active) {
        const ep = this.formatEpisodeInfo(item);
        lines.push(`• *${item.title}*${ep} _(${this.formatStatus(item.status)})_`);
      }
      lines.push('');
    }

    // Only show completed items if active items leave room (< 3 active downloads)
    if (hasCompleted && report.active.length < 3) {
      const maxCompleted = Math.max(1, 3 - report.active.length);
      const visibleCompleted = report.completed.slice(0, maxCompleted);
      lines.push(`*✅ Concluídos Recentemente:*`);
      for (const item of visibleCompleted) {
        const ep = this.formatEpisodeInfo(item);
        lines.push(`• *${item.title}*${ep}`);
      }
      lines.push('');
    }

    if (hasWaitlist) {
      lines.push(`*📋 Na Waitlist:*`);
      for (const item of report.waitlist) {
        let ep = '';
        if (item.seasonNumber && item.targetEpisode) {
          ep = ` — S${this.pad(item.seasonNumber)}E${this.pad(item.targetEpisode)}`;
        } else if (item.seasonNumber) {
          ep = ` — Temporada ${item.seasonNumber}`;
        }
        lines.push(`• *${item.title}*${ep} _(${this.formatWaitlistStatus(item.status)})_`);
      }
      lines.push('');
    }

    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    lines.push(`_Atualizado às ${now}_`);

    return { text: lines.join('\n'), replyMarkup };
  }

  async ensureOrUpdateReportCard(chatId: string | number): Promise<number | null> {
    const report = await this.apiClient.getUserReport(chatId);
    if (!report) return null;

    const { text, replyMarkup } = this.renderReportCard(report);

    if (report.telegramReportMessageId) {
      const updated = await this.telegram.editMessageText(chatId, report.telegramReportMessageId, text, {
        parseMode: 'Markdown',
        replyMarkup,
      });
      if (updated) {
        return report.telegramReportMessageId;
      }
    }

    // Send new message and pin it
    const msg = await this.telegram.sendMessage(chatId, text, {
      parseMode: 'Markdown',
      replyMarkup,
    });

    if (!msg) return null;

    await this.telegram.pinChatMessage(chatId, msg.message_id, { disable_notification: true });
    await this.apiClient.setUserReportMessageId(chatId, msg.message_id);

    return msg.message_id;
  }

  async handleRefreshCallback(
    chatId: string | number,
    messageId: number,
    callbackQueryId?: string
  ): Promise<boolean> {
    if (callbackQueryId) {
      await this.telegram.answerCallbackQuery(callbackQueryId, 'Atualizado!');
    }

    const report = await this.apiClient.getUserReport(chatId);
    if (!report) return false;

    const { text, replyMarkup } = this.renderReportCard(report);
    return this.telegram.editMessageText(chatId, messageId, text, {
      parseMode: 'Markdown',
      replyMarkup,
    });
  }
}
