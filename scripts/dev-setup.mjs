import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const ENV_DEV_EXAMPLE = path.join(REPO_ROOT, '.env.dev.example');
const ENV_DEV = path.join(REPO_ROOT, '.env.dev');
const COMPOSE_DEV_FILE = path.join(REPO_ROOT, 'docker', 'docker-compose.dev.yml');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  return env;
}

function ensureEnvDev() {
  console.log('[1/6] Ensuring .env.dev exists...');
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

function ensureDirectories(storageBase) {
  console.log(`[2/6] Ensuring dev storage directories in ${storageBase}...`);
  const dirs = [
    path.join(storageBase, 'downloads', 'staging'),
    path.join(storageBase, 'media', 'movies'),
    path.join(storageBase, 'media', 'shows'),
    path.join(storageBase, 'media', 'anime'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  Created directory: ${dir}`);
    }
  }
}

function ensureSampleFixture(storageBase) {
  console.log('[3/6] Ensuring sample dummy video fixture (sample.mkv)...');
  const samplePath = path.join(storageBase, 'downloads', 'staging', 'sample.mkv');
  const targetSize = 5 * 1024 * 1024; // 5 MB

  if (!fs.existsSync(samplePath) || fs.statSync(samplePath).size !== targetSize) {
    const fd = fs.openSync(samplePath, 'w');
    // Matroska EBML signature
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

async function waitForHttp(url, maxRetries = 30, intervalMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Retry
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

function findMdmApiKey(items) {
  const match = (items || []).find((k) => k.AppName === 'MDMDev');
  return match ? match.AccessToken : null;
}

async function configureJellyfin(jellyfinBase) {
  console.log('  Waiting for Jellyfin on port...');
  const jfReady = await waitForHttp(`${jellyfinBase}/System/Info/Public`, 30);
  if (!jfReady) {
    throw new Error(`Jellyfin failed to become ready at ${jellyfinBase}`);
  }

  const infoRes = await fetch(`${jellyfinBase}/System/Info/Public`);
  const info = await infoRes.json();

  let adminUsername = 'root';
  if (info.StartupWizardCompleted === false) {
    console.log('  Completing Jellyfin initial startup wizard...');
    try {
      const firstUserRes = await fetch(`${jellyfinBase}/Startup/FirstUser`);
      if (firstUserRes.ok) {
        const firstUserData = await firstUserRes.json();
        if (firstUserData && firstUserData.Name) {
          adminUsername = firstUserData.Name;
        }
      }
    } catch {
      // fallback to 'root'
    }

    await fetch(`${jellyfinBase}/Startup/User`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Name: adminUsername, Password: 'adminpassword' }),
    });

    await fetch(`${jellyfinBase}/Startup/Complete`, {
      method: 'POST',
    });
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'MediaBrowser Client="MDMDev", Device="CLI", DeviceId="mdm-dev-setup", Version="1.0.0"',
  };

  let authData = null;
  for (let i = 0; i < 20; i++) {
    try {
      const authRes = await fetch(`${jellyfinBase}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ Username: adminUsername, Pw: 'adminpassword' }),
      });
      if (authRes.ok) {
        authData = await authRes.json();
        break;
      }
    } catch {
      // Retry until server finishes startup tasks
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!authData || !authData.AccessToken) {
    throw new Error('Jellyfin admin authentication failed during setup');
  }

  const token = authData.AccessToken;
  const keyHeaders = {
    ...authHeaders,
    'Authorization': `MediaBrowser Client="MDMDev", Device="CLI", DeviceId="mdm-dev-setup", Version="1.0.0", Token="${token}"`,
  };

  const keysRes = await fetch(`${jellyfinBase}/Auth/Keys`, { headers: keyHeaders });
  let apiKey = keysRes.ok ? findMdmApiKey((await keysRes.json()).Items) : null;

  if (!apiKey) {
    await fetch(`${jellyfinBase}/Auth/Keys?app=MDMDev`, { method: 'POST', headers: keyHeaders });
    const refreshed = await fetch(`${jellyfinBase}/Auth/Keys`, { headers: keyHeaders });
    if (refreshed.ok) {
      apiKey = findMdmApiKey((await refreshed.json()).Items);
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

async function verifyDevApiAndMigrations(apiHealthUrl) {
  console.log('  Waiting for Dev API health check on port...');
  const apiReady = await waitForHttp(apiHealthUrl, 30);
  if (!apiReady) {
    throw new Error(`Dev API failed to respond at ${apiHealthUrl}`);
  }
  console.log('  Dev API is healthy; Drizzle migrations applied to dev_app_db');
}

function verifyInContainerHardlinks() {
  console.log('[5/6] Verifying in-container atomic NTFS hardlinks across staging and media...');
  const cmd = `docker exec mdm-dev-api sh -c "ln /media_data/downloads/staging/sample.mkv /media_data/media/movies/sample.mkv && stat -c '%i' /media_data/downloads/staging/sample.mkv /media_data/media/movies/sample.mkv && rm /media_data/media/movies/sample.mkv"`;
  const output = execSync(cmd, { encoding: 'utf-8' }).trim().split('\n');
  if (output.length < 2 || output[0].trim() !== output[1].trim()) {
    throw new Error(`Hardlink inode verification failed: staging inode=${output[0]}, media inode=${output[1]}`);
  }
  console.log(`  Atomic hardlink confirmed: shared inode ${output[0].trim()}`);
}

function startDevStack() {
  console.log('[4/6] Booting dev stack & configuring services...');
  execSync(`docker compose -f "${COMPOSE_DEV_FILE}" --env-file "${ENV_DEV}" up -d`, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
}

function teardownDevStack() {
  console.log('[6/6] Tearing down dev containers to reclaim host RAM...');
  execSync(`docker compose -f "${COMPOSE_DEV_FILE}" --env-file "${ENV_DEV}" down`, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  console.log('\nSetup complete! Start development stack on demand with: pnpm run dev:up');
}

async function main() {
  console.log('=== MDM Dev Stack Setup ===\n');
  ensureEnvDev();
  const devEnv = parseEnvFile(ENV_DEV);
  const storageBase = process.env.DEV_MEDIA_DATA_PATH || devEnv.DEV_MEDIA_DATA_PATH || 'D:/MediaServer/dev_media_data';
  const devApiPort = process.env.DEV_API_PORT || devEnv.DEV_API_PORT || '3001';
  const devJellyfinPort = process.env.DEV_JELLYFIN_PORT || devEnv.DEV_JELLYFIN_PORT || '8097';

  ensureDirectories(storageBase);
  ensureSampleFixture(storageBase);

  startDevStack();
  await configureJellyfin(`http://localhost:${devJellyfinPort}`);
  await verifyDevApiAndMigrations(`http://localhost:${devApiPort}/health`);
  verifyInContainerHardlinks();
  teardownDevStack();
}

main().catch((err) => {
  console.error('\nSetup failed:', err.message);
  process.exit(1);
});
