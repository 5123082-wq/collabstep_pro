import { NextResponse } from 'next/server';
import { flags } from '@/lib/flags';
import { projectCatalogService, templatesRepository, userTemplatesRepository } from '@collabverse/api';
import { getAuthFromRequest } from '@/lib/api/finance-access';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!flags.PROJECTS_V1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    // Get admin templates (available to all users)
    const adminTemplates = templatesRepository.list();

    // Get user templates (only for authenticated users)
    const auth = getAuthFromRequest(request);
    let userTemplates: Array<{ id: string; title: string; kind: string; summary: string; _type: 'user' }> = [];
    
    if (auth) {
      const userTemplatesData = await userTemplatesRepository.list(auth.userId);
      userTemplates = userTemplatesData.map((template) => ({
        id: template.id,
        title: template.title,
        kind: template.kind || '',
        summary: template.summary || '',
        _type: 'user' as const
      }));
    }

    // Combine templates with type markers
    const allTemplates = [
      ...adminTemplates.map((template) => ({ ...template, _type: 'admin' as const })),
      ...userTemplates
    ];

    return NextResponse.json({ 
      items: allTemplates,
      sections: {
        admin: adminTemplates,
        user: userTemplates
      }
    });
  } catch (error) {
    console.error('[API /templates] Ошибка при получении шаблонов:', error);
    // Fallback to admin templates only
    return NextResponse.json({ 
      items: projectCatalogService.getTemplates().map((t) => ({ ...t, _type: 'admin' as const })),
      sections: {
        admin: projectCatalogService.getTemplates(),
        user: []
      }
    });
  }
}
