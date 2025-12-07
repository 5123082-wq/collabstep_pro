import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
const examplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
  } else {
    fs.writeFileSync(envPath, '', 'utf8');
  }
}

const requiredVars = new Map([
  ['NAV_V1', 'on'],
  ['APP_LOCALE', 'ru'],
  ['FEATURE_PROJECTS_V1', '1'],
  ['NEXT_PUBLIC_FEATURE_PROJECTS_V1', '1'],
  ['NEXT_PUBLIC_FEATURE_CREATE_WIZARD', '1'],
  ['NEXT_PUBLIC_FEATURE_PROJECT_DASHBOARD', '1'],
  ['NEXT_PUBLIC_FEATURE_TASKS_WORKSPACE', '1'],
  ['AUTH_DEV', 'on'],
  ['DEMO_ADMIN_EMAIL', 'admin.demo@collabverse.test'],
  ['DEMO_ADMIN_PASSWORD', 'admin.demo'],
]);

const raw = fs.readFileSync(envPath, 'utf8');
const lines = raw.split(/\r?\n/);
const seen = new Set();

// Parse existing env vars
const envVars = new Map();
lines.forEach((line) => {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (match) {
    envVars.set(match[1], match[2].trim());
  }
});

const updated = lines.map((line) => {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) {
    return line;
  }

  const key = match[1];
  if (!requiredVars.has(key)) {
    return `${key}=${match[2].trim()}`;
  }

  seen.add(key);
  return `${key}=${requiredVars.get(key)}${''}`;
});

for (const [key, value] of requiredVars.entries()) {
  if (!seen.has(key) && !updated.some((line) => line.startsWith(`${key}=`))) {
    updated.push(`${key}=${value}`);
  }
}

const normalized = updated
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .replace(/\s+$/, '');

fs.writeFileSync(
  envPath,
  normalized.endsWith('\n') ? normalized : `${normalized}\n`,
  'utf8'
);

// Check AUTH_STORAGE and POSTGRES_URL configuration
const finalRaw = fs.readFileSync(envPath, 'utf8');
const finalLines = finalRaw.split(/\r?\n/);
const finalEnvVars = new Map();
finalLines.forEach((line) => {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (match) {
    finalEnvVars.set(match[1], match[2].trim());
  }
});

const authStorage = finalEnvVars.get('AUTH_STORAGE');
const postgresUrl = finalEnvVars.get('POSTGRES_URL');
const databaseUrl = finalEnvVars.get('DATABASE_URL');
const hasDbConnection = !!(postgresUrl || databaseUrl);

// Warn if AUTH_STORAGE=db but no database connection
if (authStorage === 'db' && !hasDbConnection) {
  console.warn(
    '\n⚠️  WARNING: AUTH_STORAGE=db but POSTGRES_URL or DATABASE_URL is not set!'
  );
  console.warn('   The application will not be able to use database storage.');
  console.warn('   Please set POSTGRES_URL in your .env file.\n');
}

// Suggest setting AUTH_STORAGE=db if database connection exists
if (hasDbConnection && authStorage !== 'db') {
  console.warn(
    '\n💡 INFO: POSTGRES_URL is set but AUTH_STORAGE is not set to "db".'
  );
  console.warn(
    '   For database authentication, set AUTH_STORAGE=db in your .env file.\n'
  );
}
