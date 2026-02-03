/**
 * Diagnose why AI Hub agents might be empty.
 * Run from repo root: pnpm --filter @collabverse/api exec node scripts/diagnose-ai-hub.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load same env as Next.js (apps/web)
dotenv.config({ path: path.resolve(__dirname, '../../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const AI_V1_KEYS = ['NEXT_PUBLIC_FEATURE_AI_V1', 'FEATURE_AI_V1'];
const aiV1 = AI_V1_KEYS.some((k) =>
  ['1', 'true', 'yes'].includes(
    String(process.env[k] || '')
      .trim()
      .toLowerCase()
  )
);
const hasAiAgentsUrl = Boolean(
  process.env.AI_AGENTS_DATABASE_URL &&
    String(process.env.AI_AGENTS_DATABASE_URL).trim()
);

console.log('=== AI Hub diagnosis ===\n');
console.log('1. Env');
console.log('   AI_AGENTS_DATABASE_URL set:', hasAiAgentsUrl);
console.log(
  '   AI_AGENTS_DATABASE_URL length:',
  process.env.AI_AGENTS_DATABASE_URL?.length ?? 0
);
console.log(
  '   FEATURE_AI_V1 / NEXT_PUBLIC_FEATURE_AI_V1:',
  AI_V1_KEYS.map((k) => `${k}=${process.env[k]}`).join(', ')
);
console.log('   Inferred AI_V1 (feature on):', aiV1);

async function main() {
  // Dynamic import so we use env already loaded
  const { aiAgentConfigsDbRepository } = await import('../src/index.ts');
  const allAgents = await aiAgentConfigsDbRepository.listAll({
    enabledOnly: true,
  });
  const withDirect = allAgents.filter((a) => a.allowDirectMessages !== false);

  console.log('\n2. Repository (listAll enabledOnly: true)');
  console.log('   Total enabled agents:', allAgents.length);
  console.log('   With allowDirectMessages !== false:', withDirect.length);
  if (allAgents.length > 0) {
    allAgents.forEach((a, i) => {
      console.log(
        `   [${i}] id=${a.id} slug=${a.slug} name=${a.name} enabled=${a.enabled} allowDM=${a.allowDirectMessages}`
      );
    });
  } else {
    console.log(
      '   No agents returned — check AI_AGENTS_DATABASE_URL and that ai_agent_config has rows.'
    );
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
