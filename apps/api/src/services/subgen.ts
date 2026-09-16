export interface SubgenServiceOptions {
  subgenUrl?: string;
  fetchFn?: typeof fetch;
  logger?: {
    info: (msg: string) => void;
    error: (msg: string, err?: unknown) => void;
  };
}

export interface ISubgenService {
  triggerBatch(filePath: string): Promise<void>;
}

export class SubgenService implements ISubgenService {
  private subgenUrl: string;
  private fetchFn: typeof fetch;
  private logger?: SubgenServiceOptions['logger'];

  constructor(options: SubgenServiceOptions = {}) {
    const rawUrl = options.subgenUrl || process.env.SUBGEN_URL || 'http://mdm-subgen:9000';
    this.subgenUrl = rawUrl.replace(/\/$/, '');
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.logger = options.logger;
  }

  async triggerBatch(filePath: string): Promise<void> {
    const url = `${this.subgenUrl}/batch?directory=${encodeURIComponent(filePath)}`;
    this.logger?.info(`Dispatching Subgen batch transcription to: ${url}`);

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
          `Subgen request failed with status ${response.status}${text ? `: ${text}` : ''}`
        );
      }
    } catch (err) {
      this.logger?.error(`Failed to trigger Subgen transcription for ${filePath}`, err);
      throw err;
    }
  }
}
