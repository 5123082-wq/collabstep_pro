import { NextResponse } from 'next/server';
import { healthCheck, getAssistantStatus } from '@/lib/ai-assistant/assistant-service';
import { flags } from '@/lib/flags';

export async function GET() {
  // Проверка feature flag
  if (!flags.AI_ASSISTANT) {
    return NextResponse.json({
      enabled: false,
      status: 'disabled',
      details: null,
    });
  }
  
  try {
    const [health, status] = await Promise.all([
      healthCheck(),
      getAssistantStatus(),
    ]);
    
    return NextResponse.json({
      enabled: true,
      status: health.status,
      details: {
        ...health.details,
        indexed: status.indexed,
        stats: status.stats,
      },
    });
  } catch (error) {
    console.error('AI Assistant status check error:', error);
    return NextResponse.json({
      enabled: true,
      status: 'error',
      details: null,
    });
  }
}

