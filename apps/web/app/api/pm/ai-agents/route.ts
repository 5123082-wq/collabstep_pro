import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { aiAgentsRepository } from '@collabverse/api';
import { jsonOk, jsonError } from '@/lib/api/http';
import type { AIAgentType } from '@collabverse/api';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return jsonError('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { name, email, title, agentType, apiKey, responseTemplates, behavior, modelProvider, scope } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return jsonError('Имя агента обязательно', { status: 400 });
    }

    // Email validation removed as it is optional/auto-generated
    // if (!email || typeof email !== 'string' || !email.includes('@')) {
    //   return jsonError('Введите корректный email', { status: 400 });
    // }

    const validTypes: AIAgentType[] = ['assistant', 'reviewer', 'reminder', 'summarizer'];
    if (!agentType || !validTypes.includes(agentType)) {
      return jsonError('Некорректный тип агента', { status: 400 });
    }
    
    // Validate API Key logic
    const provider = modelProvider || 'subscription';
    if (provider === 'openai_api_key' && !apiKey) {
        return jsonError('API ключ обязателен при использовании собственного ключа', { status: 400 });
    }

    try {
      const agent = await aiAgentsRepository.create({
        name,
        email, // Optional now
        title,
        agentType,
        apiKey,
        responseTemplates,
        behavior,
        modelProvider: provider,
        isGlobal: scope === 'public', // User created agents are global if scope is public
        scope: scope || 'personal',
        createdBy: auth.userId
      });

      return jsonOk({ agent });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return jsonError('Агент с таким email уже существует', { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to create AI agent:', error);
    return jsonError('Внутренняя ошибка сервера', { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return jsonError('Unauthorized', { status: 401 });
    }

    const agents = await aiAgentsRepository.list();

    // Filter agents based on visibility
    const visibleAgents = agents.filter(agent => {
      // 1. Public/Global agents are visible to everyone
      if (agent.scope === 'public' || agent.isGlobal) {
        return true;
      }

      // 2. Team agents are visible to everyone (simplified for now)
      if (agent.scope === 'team') {
        return true;
      }

      // 3. Personal agents are visible only to the creator
      if (agent.scope === 'personal') {
        return agent.createdBy === auth.userId;
      }

      // 4. Legacy agents (no scope) - assume visible or public? 
      //    Let's default to visible if not specified, or treat as public legacy
      if (!agent.scope) {
        return true; 
      }

      return false;
    });

    return jsonOk({ agents: visibleAgents });
  } catch (error) {
    console.error('Failed to list AI agents:', error);
    return jsonError('Внутренняя ошибка сервера', { status: 500 });
  }
}
