import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getProjectRole } from '@/lib/api/finance-access';
import { jsonError, jsonOk } from '@/lib/api/http';
import { projectsRepository, aiAgentsRepository } from '@collabverse/api';

/**
 * GET /api/pm/projects/[id]/ai-agents
 * 
 * Получить список AI-агентов проекта
 * 
 * Response:
 * - agents: AIAgent[] - Список AI-агентов проекта
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;

  // Проверка существования проекта
  const project = projectsRepository.findById(projectId);
  if (!project) {
    return jsonError('NOT_FOUND', {
      status: 404,
      details: 'Project not found'
    });
  }

  // Проверка доступа к проекту
  const role = getProjectRole(projectId, auth.userId);
  if (!role) {
    return jsonError('ACCESS_DENIED', {
      status: 403,
      details: 'You do not have access to this project'
    });
  }

  // Получение AI-агентов проекта
  const agents = aiAgentsRepository.listByProject(projectId);

  return jsonOk({ agents });
}

/**
 * POST /api/pm/projects/[id]/ai-agents
 * 
 * Добавить AI-агента в проект
 * 
 * Body:
 * - agentId: string (обязательно) - ID AI-агента
 * 
 * Response:
 * - success: boolean
 * - agent: AIAgent
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;

  // Проверка существования проекта
  const project = projectsRepository.findById(projectId);
  if (!project) {
    return jsonError('NOT_FOUND', {
      status: 404,
      details: 'Project not found'
    });
  }

  // Проверка прав доступа (только owner/admin может добавлять агентов)
  const role = getProjectRole(projectId, auth.userId);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', {
      status: 403,
      details: 'Only project owner or admin can add AI agents'
    });
  }

  try {
    // Парсинг body
    const body = await req.json();
    const { agentId } = body;

    // Валидация
    if (!agentId || typeof agentId !== 'string') {
      return jsonError('INVALID_REQUEST', {
        status: 400,
        details: 'agentId is required and must be a string'
      });
    }

    // Проверка существования агента
    const agent = aiAgentsRepository.findById(agentId);
    if (!agent) {
      return jsonError('NOT_FOUND', {
        status: 404,
        details: 'AI agent not found'
      });
    }

    // Проверка, не добавлен ли агент уже
    const members = projectsRepository.listMembers(projectId);
    const alreadyAdded = members.some(m => m.userId === agentId);

    if (alreadyAdded) {
      return jsonError('ALREADY_EXISTS', {
        status: 409,
        details: 'AI agent already added to this project'
      });
    }

    // Добавление агента как участника проекта
    projectsRepository.addMember(projectId, agentId, 'viewer');

    return jsonOk({
      success: true,
      agent
    });

  } catch (error) {
    console.error('Add AI agent error:', error);
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: 'Failed to add AI agent to project'
    });
  }
}

/**
 * DELETE /api/pm/projects/[id]/ai-agents/[agentId]
 * 
 * Удалить AI-агента из проекта
 * 
 * Response:
 * - success: boolean
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  const projectId = params.id;
  
  // Получаем agentId из URL query параметров
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId');

  if (!agentId) {
    return jsonError('INVALID_REQUEST', {
      status: 400,
      details: 'agentId query parameter is required'
    });
  }

  // Проверка существования проекта
  const project = projectsRepository.findById(projectId);
  if (!project) {
    return jsonError('NOT_FOUND', {
      status: 404,
      details: 'Project not found'
    });
  }

  // Проверка прав доступа (только owner/admin может удалять агентов)
  const role = getProjectRole(projectId, auth.userId);
  if (role !== 'owner' && role !== 'admin') {
    return jsonError('ACCESS_DENIED', {
      status: 403,
      details: 'Only project owner or admin can remove AI agents'
    });
  }

  try {
    // Проверка, что это действительно AI-агент
    const agent = aiAgentsRepository.findById(agentId);
    if (!agent) {
      return jsonError('NOT_FOUND', {
        status: 404,
        details: 'AI agent not found'
      });
    }

    // Удаление агента из участников проекта
    const removed = projectsRepository.removeMember(projectId, agentId);

    if (!removed) {
      return jsonError('NOT_FOUND', {
        status: 404,
        details: 'AI agent not found in project'
      });
    }

    return jsonOk({ success: true });

  } catch (error) {
    console.error('Remove AI agent error:', error);
    return jsonError('INTERNAL_ERROR', {
      status: 500,
      details: 'Failed to remove AI agent from project'
    });
  }
}
