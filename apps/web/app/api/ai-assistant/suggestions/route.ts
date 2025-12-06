import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/flags';

// Контекстные подсказки по разделам
const SECTION_SUGGESTIONS: Record<string, string[]> = {
  pm: [
    'Как создать новый проект?',
    'Как добавить задачу в проект?',
    'Как назначить исполнителя?',
    'Как настроить канбан-доску?',
  ],
  finance: [
    'Как добавить расход?',
    'Как создать счёт?',
    'Как настроить бюджет проекта?',
    'Как отслеживать финансы?',
  ],
  docs: [
    'Как загрузить документ?',
    'Как поделиться документом?',
    'Где найти бренд-репозиторий?',
  ],
  community: [
    'Как создать событие?',
    'Как присоединиться к комнате?',
    'Как работает рейтинг?',
  ],
  marketplace: [
    'Как разместить вакансию?',
    'Как найти специалиста?',
    'Как работает система контрактов?',
  ],
  admin: [
    'Как управлять пользователями?',
    'Как настроить роли?',
    'Как посмотреть статистику?',
  ],
  default: [
    'Как начать работу с платформой?',
    'Где найти документацию?',
    'Как получить помощь?',
    'Какие функции доступны?',
  ],
};

// Маппинг путей к разделам
const PATH_TO_SECTION: Record<string, string> = {
  '/pm': 'pm',
  '/finance': 'finance',
  '/docs': 'docs',
  '/community': 'community',
  '/market': 'marketplace',
  '/marketplace': 'marketplace',
  '/admin': 'admin',
  '/org': 'admin',
};

function detectSection(pathname: string): string {
  for (const [prefix, section] of Object.entries(PATH_TO_SECTION)) {
    if (pathname.startsWith(prefix)) {
      return section;
    }
  }
  return 'default';
}

export async function GET(req: NextRequest) {
  // Возвращаем пустой массив если фича выключена
  if (!flags.AI_ASSISTANT) {
    return NextResponse.json({ suggestions: [], section: null });
  }
  
  const pathname = req.nextUrl.searchParams.get('pathname') || '/';
  const section = detectSection(pathname);
  const suggestions = SECTION_SUGGESTIONS[section] ?? SECTION_SUGGESTIONS.default ?? [];
  
  return NextResponse.json({
    suggestions: suggestions.map((text: string, index: number) => ({
      id: `suggestion-${section}-${index}`,
      text,
    })),
    section: section !== 'default' ? section : null,
  });
}

