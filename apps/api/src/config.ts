import path from 'node:path';
import { z } from 'zod';

export const FORBIDDEN_JWT_DEV_DEFAULT = 'super-secret-jwt-key-for-development-32chars';

const requiredString = (name: string) =>
  z.string({ message: `${name} is required` }).min(1, `${name} is required`);

export const configSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.string().optional().default('3000'),
    HOST: z.string().optional().default('0.0.0.0'),
    JWT_SECRET: requiredString('JWT_SECRET'),
    SERVICE_API_KEY: requiredString('SERVICE_API_KEY'),
    STAGING_PATH: requiredString('STAGING_PATH'),
    MEDIA_PATH: requiredString('MEDIA_PATH'),
    QB_URL: requiredString('QB_URL'),
    JELLYFIN_URL: requiredString('JELLYFIN_URL'),
    PROWLARR_URL: z.string().optional(),
    TMDB_API_KEY: z.string().optional(),
    DISCORD_WEBHOOK_URL: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    NOTIFICATION_EMAIL_TO: z.string().optional(),
    NOTIFICATION_EMAIL_FROM: z.string().optional(),
    WATCHER_URL: z.string().optional(),
    STREAMER_URL: z.string().optional(),
    SUBGEN_URL: z.string().optional(),
    OPEN_SUBTITLES_API_KEY: z.string().optional(),
    PREFERRED_INDEXER_REGEX: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' && data.JWT_SECRET === FORBIDDEN_JWT_DEV_DEFAULT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_SECRET must not use insecure default in production',
        path: ['JWT_SECRET'],
      });
    }
  });

export type AppConfig = z.infer<typeof configSchema>;

export const testConfigDefaults: Partial<AppConfig> = {
  JWT_SECRET: 'test-jwt-secret-key-32-chars-long!',
  SERVICE_API_KEY: 'test-service-api-key',
  STAGING_PATH: path.resolve(process.cwd(), 'downloads/staging'),
  MEDIA_PATH: path.resolve(process.cwd(), 'media'),
  QB_URL: 'http://localhost:8080',
  JELLYFIN_URL: 'http://localhost:8096',
};

export interface ValidateConfigOptions {
  exitOnError?: boolean;
  allowTestDefaults?: boolean;
  logger?: {
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}

export function validateConfig(
  env: NodeJS.ProcessEnv = process.env,
  options: ValidateConfigOptions = {}
): AppConfig {
  const logger = options.logger || console;
  const isTest = env.NODE_ENV === 'test';
  const allowTestDefaults = options.allowTestDefaults ?? isTest;
  const exitOnError = options.exitOnError ?? !isTest;

  const rawEnv: Record<string, string | undefined> = { ...env };
  if (!rawEnv.QB_URL && rawEnv.QBITTORRENT_URL) {
    rawEnv.QB_URL = rawEnv.QBITTORRENT_URL;
  }
  if (allowTestDefaults) {
    for (const [key, val] of Object.entries(testConfigDefaults)) {
      if (!rawEnv[key]) {
        rawEnv[key] = val;
      }
    }
  }

  const result = configSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorMessages = result.error.issues.map((issue) => {
      const field = issue.path.join('.') || 'env';
      if (issue.message.includes('received undefined') || issue.message.includes('is required')) {
        return `  - ${field}: ${field} is required`;
      }
      return `  - ${field}: ${issue.message}`;
    });
    const formattedError = `Startup configuration validation failed:\n${errorMessages.join('\n')}`;
    logger.error(formattedError);

    if (exitOnError) {
      process.exit(1);
      return {} as AppConfig;
    }
    throw new Error(formattedError);
  }

  const validConfig = result.data;

  // Warn on missing optional integrations in non-test mode
  if (!isTest) {
    const optionalIntegrations: Array<keyof AppConfig> = [
      'PROWLARR_URL',
      'DISCORD_WEBHOOK_URL',
      'RESEND_API_KEY',
      'WATCHER_URL',
      'STREAMER_URL',
    ];

    for (const opt of optionalIntegrations) {
      if (!validConfig[opt]) {
        logger.warn(`Optional environment variable ${opt} is not set.`);
      }
    }
  }

  // Update exported config singleton
  Object.assign(config, validConfig);

  return validConfig;
}

export const config: AppConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3000',
  HOST: process.env.HOST || '0.0.0.0',
  JWT_SECRET: process.env.JWT_SECRET || testConfigDefaults.JWT_SECRET || '',
  SERVICE_API_KEY: process.env.SERVICE_API_KEY || testConfigDefaults.SERVICE_API_KEY || '',
  STAGING_PATH: process.env.STAGING_PATH || testConfigDefaults.STAGING_PATH || '',
  MEDIA_PATH: process.env.MEDIA_PATH || testConfigDefaults.MEDIA_PATH || '',
  QB_URL: process.env.QB_URL || process.env.QBITTORRENT_URL || testConfigDefaults.QB_URL || '',
  JELLYFIN_URL: process.env.JELLYFIN_URL || testConfigDefaults.JELLYFIN_URL || '',
  PROWLARR_URL: process.env.PROWLARR_URL,
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NOTIFICATION_EMAIL_TO: process.env.NOTIFICATION_EMAIL_TO,
  NOTIFICATION_EMAIL_FROM: process.env.NOTIFICATION_EMAIL_FROM,
  WATCHER_URL: process.env.WATCHER_URL,
  STREAMER_URL: process.env.STREAMER_URL,
  SUBGEN_URL: process.env.SUBGEN_URL,
  OPEN_SUBTITLES_API_KEY: process.env.OPEN_SUBTITLES_API_KEY,
  PREFERRED_INDEXER_REGEX: process.env.PREFERRED_INDEXER_REGEX,
};
