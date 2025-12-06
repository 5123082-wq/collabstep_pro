import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { join } from 'path';

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
    const indexScript = join(process.cwd(), 'scripts', 'index-assistant-docs.ts');
    
    try {
      // Запускаем в отдельном процессе, чтобы не блокировать ответ
      execSync('npx tsx scripts/index-assistant-docs.ts > /tmp/ai-assistant-indexing.log 2>&1 &', {
        cwd: process.cwd(),
        stdio: 'ignore',
        detached: true,
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
    const { existsSync, readFileSync, statSync } = await import('fs');
    const { join } = await import('path');
    
    const storeFile = join(process.cwd(), '.ai-assistant', 'chunks.json');
    
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

