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

  // Store validated config singleton
  _config = validConfig;

  return validConfig;
}

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!_config) {
    throw new Error('validateConfig() must be called before accessing config');
  }
  return _config;
}

export function _resetConfigForTesting(): void {
  _config = null;
}

