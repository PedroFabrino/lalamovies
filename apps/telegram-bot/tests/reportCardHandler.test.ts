import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportCardHandler } from '../src/reportCardHandler';
import { UserReportResponse } from '../src/types';

describe('ReportCardHandler', () => {
  let telegramMock: any;
  let apiClientMock: any;
  let handler: ReportCardHandler;

  beforeEach(() => {
    telegramMock = {
      sendMessage: vi.fn(),
      editMessageText: vi.fn(),
      pinChatMessage: vi.fn(),
      answerCallbackQuery: vi.fn(),
    };
    apiClientMock = {
      getUserReport: vi.fn(),
      setUserReportMessageId: vi.fn(),
    };
    handler = new ReportCardHandler(telegramMock, apiClientMock);
  });

  describe('renderReportCard', () => {
    it('renders onboarding message when user has no requests or waitlist items', () => {
      const report: UserReportResponse = {
        telegramReportMessageId: null,
        active: [],
        completed: [],
        waitlist: [],
      };

      const result = handler.renderReportCard(report);
      expect(result.text).toContain('Nenhum download ou item monitorado no momento');
      expect(result.text).toContain('Envie o nome de um filme, série ou anime para começar!');
      expect(result.replyMarkup.inline_keyboard[0][0].callback_data).toBe('report:refresh');
    });

    it('renders active downloads and waitlist items with proper badges', () => {
      const report: UserReportResponse = {
        telegramReportMessageId: 100,
        active: [
          {
            id: '1',
            title: 'Tougen Anki',
            mediaType: 'anime',
            seasonNumber: 1,
            episodeNumber: 3,
            status: 'downloading',
          },
          {
            id: '2',
            title: 'Interestelar',
            mediaType: 'movie',
            status: 'queued',
          },
        ],
        completed: [],
        waitlist: [
          {
            id: 'w1',
            title: 'Solo Leveling',
            mediaType: 'anime',
            seasonNumber: 2,
            targetEpisode: 1,
            status: 'pending_release',
          },
        ],
      };

      const result = handler.renderReportCard(report);
      expect(result.text).toContain('*⏳ Em Andamento:*');
      expect(result.text).toContain('• *Tougen Anki* — S01E03 _(Baixando)_');
      expect(result.text).toContain('• *Interestelar* _(Na fila)_');
      expect(result.text).toContain('*📋 Na Waitlist:*');
      expect(result.text).toContain('• *Solo Leveling* — S02E01 _(Aguardando lançamento)_');
      expect(result.text).not.toContain('*✅ Concluídos Recentemente:*');
    });

    it('omits completed items when active items count >= 3', () => {
      const report: UserReportResponse = {
        telegramReportMessageId: 100,
        active: [
          { id: '1', title: 'Show 1', mediaType: 'tv_show', status: 'downloading' },
          { id: '2', title: 'Show 2', mediaType: 'tv_show', status: 'downloading' },
          { id: '3', title: 'Show 3', mediaType: 'tv_show', status: 'downloading' },
        ],
        completed: [
          { id: 'c1', title: 'Finished Movie', mediaType: 'movie', status: 'done' },
        ],
        waitlist: [],
      };

      const result = handler.renderReportCard(report);
      expect(result.text).toContain('*⏳ Em Andamento:*');
      expect(result.text).not.toContain('*✅ Concluídos Recentemente:*');
      expect(result.text).not.toContain('Finished Movie');
    });

    it('includes completed items when active items count < 3', () => {
      const report: UserReportResponse = {
        telegramReportMessageId: 100,
        active: [
          { id: '1', title: 'Show 1', mediaType: 'tv_show', status: 'downloading' },
        ],
        completed: [
          { id: 'c1', title: 'Movie 1', mediaType: 'movie', status: 'done' },
          { id: 'c2', title: 'Movie 2', mediaType: 'movie', status: 'done' },
          { id: 'c3', title: 'Movie 3', mediaType: 'movie', status: 'done' },
        ],
        waitlist: [],
      };

      const result = handler.renderReportCard(report);
      expect(result.text).toContain('*⏳ Em Andamento:*');
      expect(result.text).toContain('*✅ Concluídos Recentemente:*');
      expect(result.text).toContain('Movie 1');
      expect(result.text).toContain('Movie 2');
    });
  });

  describe('ensureOrUpdateReportCard', () => {
    it('creates and pins a new message when telegramReportMessageId is null', async () => {
      apiClientMock.getUserReport.mockResolvedValue({
        telegramReportMessageId: null,
        active: [],
        completed: [],
        waitlist: [],
      });
      telegramMock.sendMessage.mockResolvedValue({ message_id: 555 });
      telegramMock.pinChatMessage.mockResolvedValue(true);
      apiClientMock.setUserReportMessageId.mockResolvedValue(true);

      const messageId = await handler.ensureOrUpdateReportCard('12345');

      expect(messageId).toBe(555);
      expect(telegramMock.sendMessage).toHaveBeenCalledWith(
        '12345',
        expect.stringContaining('Seus Pedidos no MDM'),
        expect.any(Object)
      );
      expect(telegramMock.pinChatMessage).toHaveBeenCalledWith('12345', 555, { disable_notification: true });
      expect(apiClientMock.setUserReportMessageId).toHaveBeenCalledWith('12345', 555);
    });

    it('edits existing message in-place when telegramReportMessageId is present', async () => {
      apiClientMock.getUserReport.mockResolvedValue({
        telegramReportMessageId: 999,
        active: [],
        completed: [],
        waitlist: [],
      });
      telegramMock.editMessageText.mockResolvedValue(true);

      const messageId = await handler.ensureOrUpdateReportCard('12345');

      expect(messageId).toBe(999);
      expect(telegramMock.editMessageText).toHaveBeenCalledWith(
        '12345',
        999,
        expect.stringContaining('Seus Pedidos no MDM'),
        expect.any(Object)
      );
      expect(telegramMock.sendMessage).not.toHaveBeenCalled();
      expect(telegramMock.pinChatMessage).not.toHaveBeenCalled();
    });

    it('recreates and pins a new card if editing existing message fails', async () => {
      apiClientMock.getUserReport.mockResolvedValue({
        telegramReportMessageId: 999,
        active: [],
        completed: [],
        waitlist: [],
      });
      // Editing failed (e.g. message deleted by user)
      telegramMock.editMessageText.mockResolvedValue(false);
      telegramMock.sendMessage.mockResolvedValue({ message_id: 1001 });
      telegramMock.pinChatMessage.mockResolvedValue(true);
      apiClientMock.setUserReportMessageId.mockResolvedValue(true);

      const messageId = await handler.ensureOrUpdateReportCard('12345');

      expect(messageId).toBe(1001);
      expect(telegramMock.sendMessage).toHaveBeenCalled();
      expect(telegramMock.pinChatMessage).toHaveBeenCalledWith('12345', 1001, { disable_notification: true });
      expect(apiClientMock.setUserReportMessageId).toHaveBeenCalledWith('12345', 1001);
    });
  });

  describe('handleRefreshCallback', () => {
    it('answers callback query and edits report card in-place', async () => {
      apiClientMock.getUserReport.mockResolvedValue({
        telegramReportMessageId: 777,
        active: [{ id: '1', title: 'New Active Show', mediaType: 'tv_show', status: 'downloading' }],
        completed: [],
        waitlist: [],
      });
      telegramMock.editMessageText.mockResolvedValue(true);

      const success = await handler.handleRefreshCallback('12345', 777, 'cb-query-1');

      expect(telegramMock.answerCallbackQuery).toHaveBeenCalledWith('cb-query-1', 'Atualizado!');
      expect(telegramMock.editMessageText).toHaveBeenCalledWith(
        '12345',
        777,
        expect.stringContaining('New Active Show'),
        expect.any(Object)
      );
      expect(success).toBe(true);
    });
  });
});
