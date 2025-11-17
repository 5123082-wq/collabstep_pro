/**
 * API endpoint для генерации структуры проекта через AI
 * 
 * POST /api/ai/generate-project-structure
 * 
 * Принимает описание проекта и генерирует структуру задач
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai/client';
import { 
  generateProjectStructure,
  type ProjectStructure 
} from '@/api/src/services/ai-planning-service';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';

/**
 * Адаптер для использования AI клиента в сервисе
 */
const aiClientAdapter = {
  generateText: async (
    prompt: string, 
    options?: { maxTokens?: number; temperature?: number; systemPrompt?: string }
  ) => {
    return await generateText(prompt, options);
  }
};

export async function POST(req: NextRequest) {
  try {
    // Проверка авторизации
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return jsonError('UNAUTHORIZED', { status: 401 });
    }

    // Парсинг тела запроса
    const body = await req.json();
    const { 
      description, 
      projectName, 
      teamSize, 
      deadline,
      preferences 
    } = body;

    // Валидация
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return jsonError('INVALID_REQUEST', { 
        status: 400,
        message: 'Description is required and must be a non-empty string'
      });
    }

    if (description.length > 5000) {
      return jsonError('INVALID_REQUEST', { 
        status: 400,
        message: 'Description is too long (max 5000 characters)'
      });
    }

    // Генерация структуры проекта
    const structure: ProjectStructure = await generateProjectStructure(
      aiClientAdapter,
      description,
      {
        projectName,
        teamSize: teamSize ? parseInt(teamSize) : undefined,
        deadline,
        preferences: preferences || {
          taskGranularity: 'medium',
          includeRisks: true,
          includeRecommendations: true
        }
      }
    );

    return jsonOk({ 
      structure,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating project structure:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return jsonError('AI_SERVICE_ERROR', { 
          status: 503,
          message: 'AI service is not configured'
        });
      }
      
      if (error.message.includes('rate limit')) {
        return jsonError('AI_SERVICE_ERROR', { 
          status: 429,
          message: 'AI service rate limit exceeded'
        });
      }
    }

    return jsonError('AI_SERVICE_ERROR', { 
      status: 500,
      message: 'Failed to generate project structure'
    });
  }
}

