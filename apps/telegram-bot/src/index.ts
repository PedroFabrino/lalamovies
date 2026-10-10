import 'dotenv/config';
import { TelegramBotClient } from './telegramClient';
import { MdmApiClient } from './apiClient';
import { IntentParser } from './intentParser';
import { CallbackStore } from './callbackStore';
import { CarouselHandler } from './carouselHandler';
import { EpisodicHandler } from './episodicHandler';
import { SnatchHandler } from './snatchHandler';
import { ReportCardHandler } from './reportCardHandler';
import { MessageHandler } from './messageHandler';

async function main() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const apiUrl = process.env.MAIN_API_URL || 'http://localhost:3000';
  const serviceApiKey = process.env.SERVICE_API_KEY || '';
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!botToken || !botToken.trim()) {
    console.log('[TelegramBot] TELEGRAM_BOT_TOKEN is not configured. Service is idling.');
    // Idle timer so container stays alive without crashing
    setInterval(() => {}, 60000);
    return;
  }

  console.log('[TelegramBot] Starting Media Download Manager Telegram Bot...');

  const telegram = new TelegramBotClient({ botToken: botToken.trim() });
  const apiClient = new MdmApiClient({ baseUrl: apiUrl, serviceApiKey });
  const intentParser = new IntentParser({ globalGeminiApiKey: geminiApiKey });
  const callbackStore = new CallbackStore();

  const carouselHandler = new CarouselHandler(telegram, callbackStore);
  const episodicHandler = new EpisodicHandler(telegram, apiClient, callbackStore);
  const reportCardHandler = new ReportCardHandler(telegram, apiClient);
  const snatchHandler = new SnatchHandler(telegram, apiClient, callbackStore, reportCardHandler);

  const handler = new MessageHandler(
    telegram,
    apiClient,
    intentParser,
    callbackStore,
    carouselHandler,
    episodicHandler,
    snatchHandler,
    reportCardHandler
  );

  let offset: number | undefined = undefined;
  let running = true;

  const shutdown = () => {
    console.log('[TelegramBot] Shutting down polling loop...');
    running = false;
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('[TelegramBot] Long polling started.');

  while (running) {
    try {
      const updates = await telegram.getUpdates(offset, 25);
      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) {
          handler.handleMessage(update.message).catch((err) => {
            console.error('[TelegramBot] Error handling message:', err);
          });
        } else if (update.callback_query) {
          handler.handleCallbackQuery(update.callback_query).catch((err) => {
            console.error('[TelegramBot] Error handling callback query:', err);
          });
        }
      }
    } catch (err) {
      console.error('[TelegramBot] Polling loop error:', err);
      // Brief sleep before retrying to avoid tight loop on connection errors
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log('[TelegramBot] Stopped.');
}

main().catch((err) => {
  console.error('[TelegramBot] Fatal startup error:', err);
  process.exit(1);
});
