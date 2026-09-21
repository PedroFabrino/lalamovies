import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDatabase } from '../db';
import { FileSystemService } from '../services/fileSystem';
import { UnarchiveService } from '../services/unarchive';
import { JellyfinService } from '../services/jellyfin';
import { RequestsRepository } from '../services/requestsRepository';
import { RequestStateMachine } from '../services/requestStateMachine';
import { runCorruptedArchiveRecovery } from '../services/unarchiveRecovery';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../../.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

async function main() {
  const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data/app.db');
  console.log(`Using database: ${dbPath}`);

  const { db, sqlite } = initDatabase(dbPath, false);
  const fileSystem = new FileSystemService();
  const unarchiveService = new UnarchiveService();
  const jellyfin = new JellyfinService();
  const requestsRepo = new RequestsRepository(db);
  const stateMachine = new RequestStateMachine(requestsRepo, undefined, jellyfin);

  console.log('Running corrupted archive recovery...');
  const result = await runCorruptedArchiveRecovery({
    db,
    unarchiveService,
    fileSystem,
    jellyfin,
    stateMachine,
    stagingPath: process.env.STAGING_PATH,
    mediaPath: process.env.MEDIA_PATH,
    logger: {
      info: (msg) => console.log(`[INFO] ${msg}`),
      warn: (msg) => console.warn(`[WARN] ${msg}`),
      error: (msg, err) => console.error(`[ERROR] ${msg}`, err),
    },
  });

  console.log(`Recovery complete! Recovered: ${result.recoveredCount}, Invalid path removed: ${result.removedInvalidPath}`);
  sqlite.close();
}

main().catch((err) => {
  console.error('Fatal error during recovery:', err);
  process.exit(1);
});
