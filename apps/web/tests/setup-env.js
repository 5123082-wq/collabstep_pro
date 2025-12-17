/* eslint-env node */
/**
 * Setup file for Jest tests to load environment variables from .env.local
 * This ensures that tests can access POSTGRES_URL and other environment variables
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// Use dotenv to load environment variables from .env.local
// dotenv is already in devDependencies
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  // __dirname is apps/web/tests/, so ../.env.local points to apps/web/.env.local
  const envPath = path.join(__dirname, '../.env.local');

  // Load .env.local file, but don't override existing env vars
  const result = dotenv.config({
    path: envPath,
    override: false, // Don't override existing environment variables
  });

  if (result.error) {
    // File doesn't exist or can't be read - that's okay, tests might work without it
    // (e.g., in CI where env vars are set differently)
  }
} catch (error) {
  // dotenv might not be available in some environments
  // Fall back to manual parsing if needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // __dirname is apps/web/tests/, so ../.env.local points to apps/web/.env.local
  const envPath = path.join(__dirname, '../.env.local');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split(/\r?\n/);

    lines.forEach((line) => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        return;
      }

      // Parse KEY=VALUE format
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        // Only set if not already set (environment variables take precedence)
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}
