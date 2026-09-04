import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search for .env file in cwd or repo root
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const app = buildApp();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});