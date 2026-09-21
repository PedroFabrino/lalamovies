import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateConfig, FORBIDDEN_JWT_DEV_DEFAULT } from '../src/config';

describe('Config Validation', () => {
  const baseValidEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'development',
    JWT_SECRET: 'my-valid-secret-key-that-is-secure',
    SERVICE_API_KEY: 'my-service-key',
    STAGING_PATH: '/path/to/staging',
    MEDIA_PATH: '/path/to/media',
    QB_URL: 'http://localhost:8080',
    JELLYFIN_URL: 'http://localhost:8096',
  };

  let mockExit: ReturnType<typeof vi.spyOn>;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;
  let mockConsoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  it('passes when all required env vars are present', () => {
    const valid = validateConfig(baseValidEnv, { allowTestDefaults: false, exitOnError: false });
    expect(valid.JWT_SECRET).toBe('my-valid-secret-key-that-is-secure');
    expect(valid.SERVICE_API_KEY).toBe('my-service-key');
    expect(valid.STAGING_PATH).toBe('/path/to/staging');
    expect(valid.MEDIA_PATH).toBe('/path/to/media');
    expect(valid.QB_URL).toBe('http://localhost:8080');
    expect(valid.JELLYFIN_URL).toBe('http://localhost:8096');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('fails and calls process.exit(1) when a required env var is missing', () => {
    const invalidEnv = { ...baseValidEnv };
    delete invalidEnv.JWT_SECRET;

    validateConfig(invalidEnv, { allowTestDefaults: false, exitOnError: true });
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('throws descriptive error when exitOnError is false and var is missing', () => {
    const invalidEnv = { ...baseValidEnv };
    delete invalidEnv.QB_URL;

    expect(() =>
      validateConfig(invalidEnv, { allowTestDefaults: false, exitOnError: false })
    ).toThrow(/QB_URL is required/);
  });

  it('rejects forbidden default JWT_SECRET in production', () => {
    const prodEnv = {
      ...baseValidEnv,
      NODE_ENV: 'production',
      JWT_SECRET: FORBIDDEN_JWT_DEV_DEFAULT,
    };

    validateConfig(prodEnv, { allowTestDefaults: false, exitOnError: true });
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('allows non-default JWT_SECRET in production', () => {
    const prodEnv = {
      ...baseValidEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'production-secure-random-jwt-key-999',
    };

    const valid = validateConfig(prodEnv, { allowTestDefaults: false, exitOnError: true });
    expect(valid.JWT_SECRET).toBe('production-secure-random-jwt-key-999');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('warns on missing optional integration env vars', () => {
    validateConfig(baseValidEnv, { allowTestDefaults: false, exitOnError: false });
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Optional environment variable PROWLARR_URL is not set')
    );
  });
});
