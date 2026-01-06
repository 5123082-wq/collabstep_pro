import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

// Находим корень репозитория (где находится pnpm-workspace.yaml)
function findRepoRoot(startPath: string): string {
  let current = resolve(startPath);
  while (current !== resolve(current, '..')) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = resolve(current, '..');
  }
  // Fallback: если не нашли, возвращаем apps/web (текущий cwd)
  return startPath;
}

const repoRoot = findRepoRoot(process.cwd());

/**
 * POST /api/admin/ai-assistant/reindex
 * Запустить ручную переиндексацию документации
 */
export async function POST() {
  try {
    const apiKey = process.env.AI_ASSISTANT_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI_ASSISTANT_API_KEY не установлен' },
        { status: 400 }
      );
    }
    
    // Запускаем индексацию в фоновом режиме
    try {
      // Запускаем в отдельном процессе, чтобы не блокировать ответ
      const logPath = join(tmpdir(), 'ai-assistant-indexing.log');
      const isWindows = process.platform === 'win32';
      
      // Формируем команду в зависимости от платформы
      // Путь относительно корня репозитория
      const scriptPath = join(repoRoot, 'scripts', 'build', 'index-assistant-docs.ts');
      const command = isWindows
        ? `start /b npx tsx "${scriptPath}" > "${logPath}" 2>&1`
        : `npx tsx "${scriptPath}" > "${logPath}" 2>&1 &`;
      
      execSync(command, {
        cwd: repoRoot,
        stdio: 'ignore',
        shell: isWindows ? undefined : '/bin/sh',
      });
      
      return NextResponse.json({
        success: true,
        message: 'Индексация запущена. Это может занять несколько минут.',
      });
    } catch (execError) {
      console.error('Failed to start indexing:', execError);
      return NextResponse.json(
        { error: 'Не удалось запустить индексацию' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Reindex error:', error);
    return NextResponse.json(
      { error: 'Ошибка при запуске переиндексации' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/ai-assistant/reindex/status
 * Получить статус индексации
 */
export async function GET() {
  try {
    const { readFileSync, statSync } = await import('fs');
    
    // Используем корень репозитория для хранения индексации
    const storeFile = join(repoRoot, '.ai-assistant', 'chunks.json');
    
    if (!existsSync(storeFile)) {
      return NextResponse.json({
        indexed: false,
        message: 'База знаний не проиндексирована',
      });
    }
    
    const stats = statSync(storeFile);
    const content = readFileSync(storeFile, 'utf-8');
    const store = JSON.parse(content);
    
    return NextResponse.json({
      indexed: true,
      totalChunks: store.chunks?.length || 0,
      indexedAt: store.indexedAt,
      lastModified: stats.mtime.toISOString(),
    });
  } catch (error) {
    console.error('Failed to get index status:', error);
    return NextResponse.json(
      { error: 'Не удалось получить статус индексации' },
      { status: 500 }
    );
  }
}

