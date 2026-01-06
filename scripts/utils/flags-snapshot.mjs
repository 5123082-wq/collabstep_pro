import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const sourcePath = join(rootDir, 'config', 'feature-flags.ts');
const docsDir = join(rootDir, 'docs');
const outputPath = join(docsDir, 'flags-snapshot.json');

const source = readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022
  }
});

const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText, 'utf8').toString('base64')}`;
const moduleExports = await import(moduleUrl);

const { featureFlagRegistry, getFeatureFlagSnapshot, featureFlagEntries } = moduleExports;

if (!featureFlagRegistry || !getFeatureFlagSnapshot || !featureFlagEntries) {
  throw new Error('Не удалось загрузить реестр фич-флагов.');
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  flags: featureFlagEntries.map(([name, definition]) => ({
    name,
    env: definition.env,
    stage: definition.stage,
    default: definition.default,
    enabled: getFeatureFlagSnapshot(process.env)[name]
  }))
};

writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`[flags] Snapshot записан в ${outputPath}`);
