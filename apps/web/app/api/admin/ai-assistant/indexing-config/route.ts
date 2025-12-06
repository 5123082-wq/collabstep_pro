import { NextRequest, NextResponse } from 'next/server';
import {
  loadIndexingConfig,
  saveIndexingConfig,
  toggleDocument,
  addDocument,
  removeDocument,
  type IndexingConfig,
  type DocumentIndexConfig,
} from '@/lib/ai-assistant/indexing-config';

/**
 * GET /api/admin/ai-assistant/indexing-config
 * Получить текущую конфигурацию индексации
 */
export async function GET() {
  try {
    const config = loadIndexingConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Failed to load indexing config:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-assistant/indexing-config
 * Обновить конфигурацию индексации
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body as { config: IndexingConfig };
    
    if (!config || !config.documents) {
      return NextResponse.json(
        { error: 'Invalid configuration' },
        { status: 400 }
      );
    }
    
    saveIndexingConfig(config);
    
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Failed to save indexing config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ai-assistant/indexing-config
 * Частичное обновление конфигурации
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, path, document, enabled } = body;
    
    switch (action) {
      case 'toggle':
        if (!path || enabled === undefined) {
          return NextResponse.json(
            { error: 'Missing path or enabled flag' },
            { status: 400 }
          );
        }
        toggleDocument(path, enabled);
        break;
        
      case 'add':
        if (!document) {
          return NextResponse.json(
            { error: 'Missing document' },
            { status: 400 }
          );
        }
        addDocument(document as DocumentIndexConfig);
        break;
        
      case 'remove':
        if (!path) {
          return NextResponse.json(
            { error: 'Missing path' },
            { status: 400 }
          );
        }
        removeDocument(path);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    const config = loadIndexingConfig();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Failed to update indexing config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

