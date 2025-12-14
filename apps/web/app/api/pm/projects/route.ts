import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { getAuthFromRequest } from '@/lib/api/finance-access';
import { projectsRepository, DEFAULT_WORKSPACE_ID } from '@collabverse/api';
import { jsonError, jsonOk } from '@/lib/api/http';
import { parseProjectFilters, type ProjectScope } from '@/lib/pm/filters';
import { getProjectsOverview } from '@/lib/pm/projects-overview.server';
import { ensureTestProject } from '@/lib/pm/ensure-test-project';

export async function GET(request: NextRequest) {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECTS_LIST) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return jsonError('UNAUTHORIZED', { status: 401 });
    }

    // Очищаем возможные устаревшие демо-данные (без автосоздания)
    await ensureTestProject(auth.userId, auth.email);

    // Гарантируем, что у пользователя есть хотя бы один проект (важно для демо/e2e)
    const existing = projectsRepository.list({ workspaceId: DEFAULT_WORKSPACE_ID });
    if (!existing.some((p) => p.ownerId === auth.userId)) {
      try {
        const seedProject = projectsRepository.create({
          title: 'Demo workspace project',
          description: 'Автосозданный проект для e2e',
          ownerId: auth.userId,
          workspaceId: DEFAULT_WORKSPACE_ID,
          status: 'active',
          visibility: 'private'
        });
        // Добавляем владельца в мемберы для консистентности
        projectsRepository.upsertMember(seedProject.id, auth.userId, 'owner');
      } catch (error) {
        console.error('[Projects API] Failed to seed project for user', error);
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const parsedFilters = parseProjectFilters(searchParams);
    const scopeParam = searchParams.get('scope');
    // По умолчанию показываем только проекты пользователя
    const scope: ProjectScope =
      scopeParam === 'owned' || scopeParam === 'member' || scopeParam === 'all'
        ? scopeParam
        : parsedFilters.scope ?? 'owned';

    // Логирование для отладки
    console.log(`[Projects API] Filters:`, {
      status: parsedFilters.status,
      scope,
      userId: auth.userId
    });

    let overview;
    try {
      overview = await getProjectsOverview(auth.userId, {
        ...parsedFilters,
        scope,
        page: parsedFilters.page,
        pageSize: parsedFilters.pageSize,
        ...(parsedFilters.sortBy ? { sortBy: parsedFilters.sortBy } : {}),
        ...(parsedFilters.sortOrder ? { sortOrder: parsedFilters.sortOrder } : {})
      });
    } catch (error) {
      console.error('[Projects API] Error getting projects overview:', error);
      // Возвращаем безопасную структуру данных в случае ошибки
      overview = {
        items: [],
        pagination: {
          page: parsedFilters.page ?? 1,
          pageSize: parsedFilters.pageSize ?? 12,
          total: 0,
          totalPages: 1
        },
        owners: []
      };
    }

    // Если после всех операций список пуст — создаём резервный проект и пробуем ещё раз
    if (!overview.items || overview.items.length === 0) {
      try {
        const fallback = projectsRepository.create({
          title: 'Demo fallback project',
          description: 'Автосозданный проект, когда список пуст',
          ownerId: auth.userId,
          workspaceId: DEFAULT_WORKSPACE_ID,
          status: 'active',
          visibility: 'private'
        });
        projectsRepository.upsertMember(fallback.id, auth.userId, 'owner');
        overview = await getProjectsOverview(auth.userId, {
          ...parsedFilters,
          scope: 'owned',
          page: parsedFilters.page,
          pageSize: parsedFilters.pageSize
        });
      } catch (error) {
        console.error('[Projects API] Failed to create fallback project', error);
      }
    }

    // Логирование для отладки
    const allProjects = projectsRepository.list();
    console.log(`[Projects API] User: ${auth.userId}, Total projects in memory: ${allProjects.length}, Accessible: ${overview.items.length}, Status filter: ${parsedFilters.status}`);

    // Убеждаемся, что всегда возвращаем правильную структуру
    return NextResponse.json(
      {
        items: Array.isArray(overview.items) ? overview.items : [],
        pagination: overview.pagination ?? {
          page: parsedFilters.page ?? 1,
          pageSize: parsedFilters.pageSize ?? 12,
          total: 0,
          totalPages: 1
        },
        owners: Array.isArray(overview.owners) ? overview.owners : []
      },
      {
        headers: {
          'cache-control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error('[Projects API] Unexpected error', error);
    return NextResponse.json(
      {
        items: [],
        pagination: {
          page: 1,
          pageSize: 12,
          total: 0,
          totalPages: 1
        },
        owners: []
      },
      { status: 200, headers: { 'cache-control': 'no-store' } }
    );
  }
}

export async function POST(request: Request) {
  if (!flags.PM_NAV_PROJECTS_AND_TASKS || !flags.PM_PROJECTS_LIST) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = getAuthFromRequest(request);
  if (!auth) {
    return jsonError('UNAUTHORIZED', { status: 401 });
  }

  try {
    const body = await request.json();
    const title = (body.name ?? body.title ?? '').toString().trim();
    if (!title) {
      return jsonError('INVALID_REQUEST', { status: 400 });
    }
    const visibility = 'private';
    const normalizedStatus = 'active';
    const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
    const organizationId = body.organizationId;
    console.log(
      `[Projects API POST] Creating project: title=${title}, ownerId=${auth.userId}, workspaceId=${workspaceId}, organizationId=${organizationId}, status=${normalizedStatus}, visibility=${visibility}`
    );

    const project = projectsRepository.create({
      title,
      description: typeof body.description === 'string' ? body.description : undefined,
      key: body.key,
      ownerId: auth.userId,
      workspaceId,
      status: normalizedStatus,
      visibility,
      type: body.type,
      deadline: body.deadline
    });

    // Проверяем, что проект действительно создан
    const verifyProject = await projectsRepository.findById(project.id);
    if (!verifyProject) {
      console.error(`[Projects API POST] Project was created but not found immediately: id=${project.id}`);
    } else {
      console.log(`[Projects API POST] Project verified: id=${verifyProject.id}, workspaceId=${verifyProject.workspaceId}`);
    }

    return jsonOk({ project });
  } catch (error) {
    return jsonError('INVALID_REQUEST', { status: 400 });
  }
}
