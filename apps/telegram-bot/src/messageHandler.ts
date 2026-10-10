import {
  TelegramMessage,
  TelegramCallbackQuery,
} from './types';
import { TelegramBotClient } from './telegramClient';
import { MdmApiClient } from './apiClient';
import { IntentParser } from './intentParser';
import { CallbackStore } from './callbackStore';
import { CarouselHandler } from './carouselHandler';
import { EpisodicHandler } from './episodicHandler';
import { SnatchHandler } from './snatchHandler';
import { ReportCardHandler } from './reportCardHandler';

export class MessageHandler {
  constructor(
    private telegram: TelegramBotClient,
    private apiClient: MdmApiClient,
    private intentParser: IntentParser,
    private callbackStore: CallbackStore,
    private carouselHandler: CarouselHandler,
    private episodicHandler: EpisodicHandler,
    private snatchHandler: SnatchHandler,
    private reportCardHandler?: ReportCardHandler
  ) {}

  async handleMessage(msg: TelegramMessage): Promise<void> {
    const text = msg.text?.trim();
    if (!text) return;

    const chatId = msg.chat.id;

    const deletePrompt = async () => {
      if (msg.message_id && typeof this.telegram.deleteMessage === 'function') {
        await this.telegram.deleteMessage(chatId, msg.message_id).catch(() => {});
      }
    };

    // Check pairing
    const user = await this.apiClient.getUserByChatId(chatId);

    // If not paired, check if message is /link <code>
    if (!user) {
      const linkMatch = text.match(/^\/(?:link|vincular)\s+([a-zA-Z0-9]+)$/i);
      if (linkMatch) {
        const code = linkMatch[1];
        const pairRes = await this.apiClient.pairUser(code, chatId);
        if (pairRes.ok && pairRes.user) {
          await this.telegram.sendMessage(
            chatId,
            `🎉 *Conta Vinculada com Sucesso!*\n\nOlá *${pairRes.user.username}*, sua conta foi vinculada ao Telegram.\n\nAgora você pode pedir downloads por aqui! Experimente enviar:\n• _"Baixe o filme Interestelar"_\n• _"Baixe a série Lanternas"_\n• ou use comandos como /filme, /serie, /status`
          );
        } else {
          await this.telegram.sendMessage(
            chatId,
            `❌ *Erro ao vincular conta:*\n${pairRes.message || 'Código inválido ou expirado'}.\n\nGere um novo código de 6 caracteres na interface web em *Configurações > Telegram* e envie aqui como:\n\`/link 123456\``
          );
        }
        await deletePrompt();
        return;
      }

      if (text === '/login' || text === '/entrar') {
        const sessionRes = await this.apiClient.createAuthSession(chatId);
        if (sessionRes.ok && sessionRes.url) {
          await this.telegram.sendMessage(
            chatId,
            `🔐 *Entrar e Vincular Conta*\n\nClique no botão abaixo para fazer login pelo navegador e vincular sua conta automaticamente.\n\n_Este link expira em 15 minutos._`,
            {
              replyMarkup: {
                inline_keyboard: [
                  [{ text: '🔐 Entrar e Vincular Conta', url: sessionRes.url }],
                ],
              },
            }
          );
        } else {
          await this.telegram.sendMessage(
            chatId,
            `❌ Não foi possível gerar link de acesso no momento. Tente novamente mais tarde.`
          );
        }
        await deletePrompt();
        return;
      }

      // Unpaired welcome message
      const sessionRes = await this.apiClient.createAuthSession(chatId);
      const replyMarkup = sessionRes.ok && sessionRes.url
        ? {
            inline_keyboard: [
              [{ text: '🔐 Entrar pelo Navegador', url: sessionRes.url }],
            ],
          }
        : undefined;

      await this.telegram.sendMessage(
        chatId,
        `👋 *Bem-vindo ao Media Download Manager!*\n\nPara solicitar downloads diretamente pelo Telegram, você precisa vincular sua conta:\n\n• *Opção 1 (Rápida):* Clique no botão abaixo para entrar pelo navegador e vincular em 1 clique.\n• *Opção 2 (Manual):* Acesse o portal, vá em *Configurações > Telegram*, gere um código e envie aqui:\n   \`/link <SEU_CODIGO>\`\n\nExemplo: \`/link AB12CD\``,
        { replyMarkup }
      );
      await deletePrompt();
      return;
    }

    // User is paired: ensure pinned report card exists/updates
    await this.reportCardHandler?.ensureOrUpdateReportCard(chatId);

    // Clean up any previous completed/confirmation card before starting new action
    const prevEphemeral = this.callbackStore.consumeLastEphemeralMessage(chatId);
    if (prevEphemeral && typeof this.telegram.deleteMessage === 'function') {
      await this.telegram.deleteMessage(chatId, prevEphemeral).catch(() => {});
    }

    // Check if user re-runs /link or /login
    if (text.startsWith('/link') || text.startsWith('/vincular') || text === '/login' || text === '/entrar') {
      await this.telegram.sendMessage(
        chatId,
        `ℹ️ Sua conta já está vinculada como *${user.username}*!`
      );
      await deletePrompt();
      return;
    }

    // Check /apikey command
    const apiKeyMatch = text.match(/^\/(?:apikey|chave)(?:\s+(.*))?$/i);
    if (apiKeyMatch) {
      const newKey = apiKeyMatch[1]?.trim();
      if (!newKey || newKey.toLowerCase() === 'clear') {
        await this.apiClient.setUserGeminiApiKey(chatId, null);
        await this.telegram.sendMessage(
          chatId,
          `🧹 Chave pessoal do Gemini removida com sucesso.`
        );
      } else {
        await this.apiClient.setUserGeminiApiKey(chatId, newKey);
        await this.telegram.sendMessage(
          chatId,
          `🔑 Chave pessoal do Gemini salva com sucesso!`
        );
      }
      await deletePrompt();
      return;
    }

    // Check /help command
    if (text === '/help' || text === '/start' || text === '/ajuda') {
      await this.telegram.sendMessage(
        chatId,
        `🤖 *Comandos do MDM Bot:*\n\n` +
        `• *Mensagem direta:* Envie frases naturais como:\n` +
        `  _"Baixe a série Ruptura"_\n` +
        `  _"Quero ver o filme Oppenheimer"_\n` +
        `  _"Baixe Solo Leveling s01e05"_\n\n` +
        `• *Comandos rápidos:*\n` +
        `  /filme <nome> — Busca filme no TMDB\n` +
        `  /serie <nome> — Busca série no TMDB\n` +
        `  /anime <nome> — Busca anime no TMDB\n` +
        `  /status — Informações da sua conta\n` +
        `  /apikey <chave> — Define chave pessoal do Gemini\n` +
        `  /apikey clear — Remove sua chave pessoal`
      );
      await deletePrompt();
      return;
    }

    // Check /status command
    if (text === '/status') {
      const config = await this.apiClient.getTelegramConfig();
      const hasPersonalKey = Boolean(user.personalGeminiApiKey);
      const aiMode = config.globalGeminiApiKey
        ? 'Chave Global do Servidor'
        : hasPersonalKey
        ? 'Chave Pessoal Ativa'
        : 'IA desativada (Usando busca direta)';

      await this.telegram.sendMessage(
        chatId,
        `👤 *Status da Conta:*\n\n` +
        `• Usuário: *${user.username}*\n` +
        `• Papel: *${user.role}*\n` +
        `• Modo de IA: *${aiMode}*\n` +
        `• Notificações: *Ativadas*`
      );
      await deletePrompt();
      return;
    }

    // Parse NLP or slash commands
    const config = await this.apiClient.getTelegramConfig();
    const intent = await this.intentParser.parseIntent(
      text,
      user.personalGeminiApiKey,
      config.globalGeminiApiKey
    );

    if (intent.action === 'help') {
      await this.telegram.sendMessage(
        chatId,
        `Olá! Você pode me pedir qualquer filme, série ou anime digitando o nome ou usando /filme ou /serie.`
      );
      await deletePrompt();
      return;
    }

    if (intent.action === 'status') {
      await this.telegram.sendMessage(chatId, `Usuário conectado: *${user.username}*`);
      await deletePrompt();
      return;
    }

    const searchQuery = intent.title || text;
    const waitMsg = await this.telegram.sendMessage(
      chatId,
      `🔍 Buscando "*${searchQuery}*" no TMDB...`
    );
    await deletePrompt();

    const candidates = await this.apiClient.searchMetadata(
      user.id,
      searchQuery,
      intent.mediaType
    );

    if (waitMsg) {
      // If candidates exist, send carousel and delete placeholder
      if (candidates.length > 0) {
        await this.carouselHandler.sendCarousel(chatId, user.id, candidates, intent);
        if (typeof this.telegram.deleteMessage === 'function') {
          await this.telegram.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
        }
      } else {
        await this.telegram.editMessageText(
          chatId,
          waitMsg.message_id,
          `❌ Nenhum resultado encontrado para "*${searchQuery}*". Tente especificar melhor o nome.`
        );
      }
    }
  }

  async handleCallbackQuery(cb: TelegramCallbackQuery): Promise<void> {
    const data = cb.data;
    if (!data || !cb.message) return;

    const chatId = cb.message.chat.id;
    const messageId = cb.message.message_id;

    if (data === 'report:refresh') {
      if (this.reportCardHandler) {
        await this.reportCardHandler.handleRefreshCallback(chatId, messageId, cb.id);
      } else {
        await this.telegram.answerCallbackQuery(cb.id);
      }
      return;
    }

    await this.telegram.answerCallbackQuery(cb.id);

    const parts = data.split(':');
    const prefix = parts[0];
    const token = parts[1];
    const action = parts[2];

    if (prefix === 'c') {
      // Carousel callback
      await this.carouselHandler.handleCarouselCallback(
        chatId,
        messageId,
        action,
        token,
        async (session, selected) => {
          if (selected.mediaType === 'movie') {
            await this.snatchHandler.executeSnatch({
              chatId,
              userId: session.userId,
              candidate: selected,
            });
          } else {
            await this.episodicHandler.promptEpisodicChoice(
              chatId,
              session.userId,
              selected,
              session.intent,
              async (epSession) => {
                await this.snatchHandler.executeSnatch({
                  chatId,
                  userId: epSession.userId,
                  candidate: epSession.candidate,
                  seasonNumber: epSession.seasonNumber,
                  episodeNumber: epSession.episodeNumber,
                  isSeasonPack: epSession.isSeasonPack,
                  watchNext: epSession.watchNext,
                });
              }
            );
          }
        }
      );
    } else if (prefix === 'e') {
      // Episodic callback
      await this.episodicHandler.handleEpisodicCallback(
        chatId,
        messageId,
        action,
        token,
        async (session) => {
          await this.snatchHandler.executeSnatch({
            chatId,
            userId: session.userId,
            candidate: session.candidate,
            seasonNumber: session.seasonNumber,
            episodeNumber: session.episodeNumber,
            isSeasonPack: session.isSeasonPack,
            watchNext: session.watchNext,
          });
        }
      );
    } else if (prefix === 'r') {
      // Release override callback
      await this.snatchHandler.handleReleaseCallback(chatId, messageId, action, token);
    } else if (prefix === 'w') {
      // Waitlist confirmation callback
      await this.snatchHandler.handleWaitlistCallback(chatId, messageId, action, token);
    }
  }
}
