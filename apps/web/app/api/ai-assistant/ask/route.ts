import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/ai-assistant/assistant-service';
import { flags } from '@/lib/flags';

export async function POST(req: NextRequest) {
  // Проверка feature flag
  if (!flags.AI_ASSISTANT) {
    return NextResponse.json(
      { error: 'AI Assistant is not enabled' },
      { status: 403 }
    );
  }
  
  try {
    const body = await req.json();
    const { message, context, sessionId } = body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Ограничение длины сообщения
    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message is too long (max 1000 characters)' },
        { status: 400 }
      );
    }
    
    const response = await answerQuestion({
      message: message.trim(),
      context,
      sessionId,
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}

