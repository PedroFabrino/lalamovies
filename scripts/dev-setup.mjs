import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DEV_STORAGE_BASE = process.env.DEV_MEDIA_DATA_PATH || 'D:/MediaServer/dev_media_data';
const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const ENV_DEV_EXAMPLE = path.join(REPO_ROOT, '.env.dev.example');
const ENV_DEV = path.join(REPO_ROOT, '.env.dev');
const COMPOSE_DEV_FILE = path.join(REPO_ROOT, 'docker', 'docker-compose.dev.yml');

function ensureDirectories() {
  console.log(`[1/5] Ensuring dev storage directories in ${DEV_STORAGE_BASE}...`);
  const dirs = [
    path.join(DEV_STORAGE_BASE, 'downloads', 'staging'),
    path.join(DEV_STORAGE_BASE, 'media', 'movies'),
    path.join(DEV_STORAGE_BASE, 'media', 'shows'),
    path.join(DEV_STORAGE_BASE, 'media', 'anime'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  Created directory: ${dir}`);
    }
  }
}

function ensureSampleFixture() {
  console.log('[2/5] Ensuring sample dummy video fixture (sample.mkv)...');
  const samplePath = path.join(DEV_STORAGE_BASE, 'downloads', 'staging', 'sample.mkv');
  const targetSize = 5 * 1024 * 1024; // 5 MB

  if (!fs.existsSync(samplePath) || fs.statSync(samplePath).size !== targetSize) {
    const fd = fs.openSync(samplePath, 'w');
    // EBML header prefix for valid MKV identifier
    const mkvHeader = Buffer.from([
      0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81,
      0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x6d, 0x61, 0x74, 0x72, 0x6f, 0x73, 0x6b, 0x61,
    ]);
    fs.writeSync(fd, mkvHeader);
    const zeroes = Buffer.alloc(targetSize - mkvHeader.length);
    fs.writeSync(fd, zeroes);
    fs.closeSync(fd);
    console.log(`  Created 5 MB dummy fixture: ${samplePath}`);
  } else {
    console.log(`  Fixture already present: ${samplePath}`);
  }
}

function ensureEnvDev() {
  console.log('[3/5] Ensuring .env.dev exists...');
  if (!fs.existsSync(ENV_DEV)) {
    if (fs.existsSync(ENV_DEV_EXAMPLE)) {
      fs.copyFileSync(ENV_DEV_EXAMPLE, ENV_DEV);
      console.log('  Copied .env.dev.example -> .env.dev');
    } else {
      fs.writeFileSync(ENV_DEV, '# Dev environment\nDEV_API_PORT=3001\n');
      console.log('  Created blank .env.dev');
    }
  } else {
    console.log('  .env.dev already exists');
  }
}

async function waitForHttp(url, maxRetries = 30, intervalMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // ignore retry errors
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

async function setupJellyfinCredentials() {
  console.log('[4/5] Booting dev stack & configuring Jellyfin and database...');
  execSync(`docker compose -f "${COMPOSE_DEV_FILE}" --env-file "${ENV_DEV}" up -d`, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  console.log('  Waiting for Jellyfin on port 8097...');
  const jfReady = await waitForHttp('http://localhost:8097/System/Info/Public', 30);
  if (!jfReady) {
    console.warn('  Warning: Jellyfin timed out on port 8097');
    return;
  }

  const infoRes = await fetch('http://localhost:8097/System/Info/Public');
  const info = await infoRes.json();

  if (info.StartupWizardCompleted === false) {
    console.log('  Completing Jellyfin initial startup wizard...');
    await fetch('http://localhost:8097/Startup/FirstUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Name: 'admin', Password: 'adminpassword' }),
    });
    await fetch('http://localhost:8097/Startup/Complete', { method: 'POST' });
  }

  // Authenticate to obtain token and create API key
  const authHeaders = {
    'Content-Type': 'application/json',
    'X-Emby-Authorization': 'MediaBrowser Client="MDMDev", Device="CLI", DeviceId="mdm-dev-setup", Version="1.0.0"',
  };
  const authRes = await fetch('http://localhost:8097/Users/AuthenticateByName', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ Username: 'admin', Pw: 'adminpassword' }),
  });

  if (authRes.ok) {
    const authData = await authRes.json();
    const token = authData.AccessToken;
    const keyHeaders = {
      ...authHeaders,
      'X-Emby-Authorization': `MediaBrowser Client="MDMDev", Device="CLI", DeviceId="mdm-dev-setup", Version="1.0.0", Token="${token}"`,
    };

    // List existing keys or create new one
    const keysRes = await fetch('http://localhost:8097/Auth/Keys', { headers: keyHeaders });
    let apiKey = null;
    if (keysRes.ok) {
      const keysData = await keysRes.json();
      const existing = (keysData.Items || []).find((k) => k.AppName === 'MDMDev');
      if (existing) apiKey = existing.AccessToken;
    }

    if (!apiKey) {
      await fetch('http://localhost:8097/Auth/Keys?app=MDMDev', { method: 'POST', headers: keyHeaders });
      const refreshedRes = await fetch('http://localhost:8097/Auth/Keys', { headers: keyHeaders });
      if (refreshedRes.ok) {
        const refreshed = await refreshedRes.json();
        const found = (refreshed.Items || []).find((k) => k.AppName === 'MDMDev');
        if (found) apiKey = found.AccessToken;
      }
    }

    if (apiKey) {
      console.log(`  Jellyfin API key configured: ${apiKey.slice(0, 8)}...`);
      let envContent = fs.readFileSync(ENV_DEV, 'utf-8');
      if (envContent.includes('DEV_JELLYFIN_API_KEY=')) {
        envContent = envContent.replace(/DEV_JELLYFIN_API_KEY=.*/, `DEV_JELLYFIN_API_KEY=${apiKey}`);
      } else {
        envContent += `\nDEV_JELLYFIN_API_KEY=${apiKey}\n`;
      }
      fs.writeFileSync(ENV_DEV, envContent, 'utf-8');
    }
  }

  console.log('  Waiting for Dev API health check on port 3001...');
  const apiReady = await waitForHttp('http://localhost:3001/health', 30);
  if (apiReady) {
    console.log('  Dev API is healthy; Drizzle migrations applied to dev_app_db');
  } else {
    console.warn('  Warning: Dev API did not respond to /health in time');
  }
}

function teardownDevStack() {
  console.log('[5/5] Tearing down dev containers to reclaim host RAM...');
  execSync(`docker compose -f "${COMPOSE_DEV_FILE}" --env-file "${ENV_DEV}" down`, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  console.log('\nSetup complete! Start development stack on demand with: pnpm run dev:up');
}

async function main() {
  console.log('=== MDM Dev Stack Setup ===\n');
  ensureDirectories();
  ensureSampleFixture();
  ensureEnvDev();
  await setupJellyfinCredentials();
  teardownDevStack();
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
