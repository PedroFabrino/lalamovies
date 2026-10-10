import { IRequestsRepository } from './requestsRepositoryTypes';

export interface UpdateUserReportCardOptions {
  botToken: string;
  chatId: string;
  userId: string;
  requestsRepo: IRequestsRepository;
  watcherUrl?: string;
  serviceApiKey?: string;
}

export async function updateUserReportCardMessage(options: UpdateUserReportCardOptions): Promise<boolean> {
  const { botToken, chatId, userId, requestsRepo } = options;
  if (!botToken || !chatId || !userId) return false;

  const reportMessageId = requestsRepo.getTelegramReportMessageId(userId);
  if (!reportMessageId) return false;

  const userRequests = requestsRepo.findByUserId(userId, true);
  const active = userRequests.filter((r) =>
    ['queued', 'downloading', 'hardlinking', 'unarchiving', 'seeding'].includes(r.status)
  );

  const completed = userRequests
    .filter((r) => r.status === 'done')
    .sort((a, b) => {
      const timeA = a.downloadedAt ? new Date(a.downloadedAt).getTime() : 0;
      const timeB = b.downloadedAt ? new Date(b.downloadedAt).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 3);

  const pad = (n?: number | null) => (n !== undefined && n !== null ? String(n).padStart(2, '0') : '');
  const formatEp = (r: { seasonNumber?: number | null; episodeNumber?: number | null }) => {
    if (r.seasonNumber && r.episodeNumber) return ` — S${pad(r.seasonNumber)}E${pad(r.episodeNumber)}`;
    if (r.seasonNumber) return ` — Temporada ${r.seasonNumber}`;
    return '';
  };

  const lines: string[] = ['📊 *Seus Pedidos no MDM*\n'];

  if (active.length > 0) {
    lines.push('*⏳ Em Andamento:*');
    for (const r of active) {
      lines.push(`• *${r.title}*${formatEp(r)}`);
    }
    lines.push('');
  }

  if (completed.length > 0 && active.length < 3) {
    const visibleCompleted = completed.slice(0, Math.max(1, 3 - active.length));
    lines.push('*✅ Concluídos Recentemente:*');
    for (const r of visibleCompleted) {
      lines.push(`• *${r.title}*${formatEp(r)}`);
    }
    lines.push('');
  }

  if (active.length === 0 && completed.length === 0) {
    lines.push('Nenhum download ou item monitorado no momento.\nEnvie o nome de um filme, série ou anime para começar! 🍿\n');
  }

  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  lines.push(`_Atualizado às ${now}_`);

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        message_id: reportMessageId,
        text: lines.join('\n'),
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🔄 Atualizar', callback_data: 'report:refresh' }]],
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
