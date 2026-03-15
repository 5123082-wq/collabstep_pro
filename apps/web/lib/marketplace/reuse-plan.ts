import type { ProjectStage, ProjectType } from '@collabverse/api';
import {
  getTemplateById,
  readySolutions
} from '@/lib/marketplace/data';

export type CatalogApplyKind = 'template' | 'solution';

export type CatalogReuseTaskPlan = {
  title: string;
  description?: string;
  priority?: 'low' | 'med' | 'high' | 'urgent';
  labels?: string[];
  children?: CatalogReuseTaskPlan[];
};

export type CatalogReusePlan = {
  kind: CatalogApplyKind;
  sourceId: string;
  sourceTitle: string;
  sourceDescription: string;
  recommendedProjectTitle: string;
  recommendedProjectDescription: string;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  rootTaskTitle: string;
  rootTaskDescription: string;
  labels: string[];
  tasks: CatalogReuseTaskPlan[];
};

function buildTemplatePlan(sourceId: string): CatalogReusePlan | null {
  const template = getTemplateById(sourceId);
  if (!template) {
    return null;
  }

  const labels = Array.from(new Set(['catalog', 'template', ...template.tags]));

  if (template.category === 'landing') {
    return {
      kind: 'template',
      sourceId: template.id,
      sourceTitle: template.title,
      sourceDescription: template.description,
      recommendedProjectTitle: `${template.title} — запуск проекта`,
      recommendedProjectDescription: template.description,
      projectType: 'marketing',
      projectStage: 'discovery',
      rootTaskTitle: `Каталог: ${template.title}`,
      rootTaskDescription: 'Импортирован reusable template из каталога. Публикация остаётся отдельным public layer, а в PM переносится только рабочая структура.',
      labels,
      tasks: [
        {
          title: 'Разобрать структуру лендинга',
          description: 'Определить ключевые секции, CTA, сценарий прохождения и ограничения по контенту.',
          priority: 'high',
          labels: ['landing', 'structure'],
          children: [
            { title: 'Проверить hero и CTA', priority: 'high', labels: ['copy'] },
            { title: 'Согласовать блоки доверия и social proof', labels: ['ux'] }
          ]
        },
        {
          title: 'Адаптировать контент под продукт',
          description: 'Подменить тексты, офферы, бриф и графические акценты под текущий запуск.',
          priority: 'high',
          labels: ['content', 'handoff']
        },
        {
          title: 'Подготовить handoff',
          description: 'Собрать assets, интеграции и сценарии передачи в реализацию.',
          priority: 'med',
          labels: ['delivery']
        }
      ]
    };
  }

  if (template.category === 'ui_kit') {
    return {
      kind: 'template',
      sourceId: template.id,
      sourceTitle: template.title,
      sourceDescription: template.description,
      recommendedProjectTitle: `${template.title} — продуктовый контур`,
      recommendedProjectDescription: template.description,
      projectType: 'product',
      projectStage: 'design',
      rootTaskTitle: `Каталог: ${template.title}`,
      rootTaskDescription: 'Импортирован reusable UI/template package из каталога. PM-проект остаётся рабочим контуром без смешения с public publication.',
      labels,
      tasks: [
        {
          title: 'Определить пользовательские сценарии',
          description: 'Зафиксировать экраны, состояния и data-flow, которые реально нужны в проекте.',
          priority: 'high',
          labels: ['product', 'ux']
        },
        {
          title: 'Адаптировать компонентную систему',
          description: 'Подогнать tokens, таблицы, графики и ключевые паттерны под продукт.',
          priority: 'high',
          labels: ['design-system'],
          children: [
            { title: 'Проверить таблицы и filters', labels: ['dashboard'] },
            { title: 'Собрать handoff для разработки', labels: ['handoff'] }
          ]
        },
        {
          title: 'Подготовить rollout в проект',
          description: 'Определить, что идёт в ближайший спринт, а что остаётся в backlog.',
          priority: 'med',
          labels: ['planning']
        }
      ]
    };
  }

  if (template.category === 'presentation') {
    return {
      kind: 'template',
      sourceId: template.id,
      sourceTitle: template.title,
      sourceDescription: template.description,
      recommendedProjectTitle: `${template.title} — narrative pack`,
      recommendedProjectDescription: template.description,
      projectType: 'marketing',
      projectStage: 'design',
      rootTaskTitle: `Каталог: ${template.title}`,
      rootTaskDescription: 'Импортирован reusable presentation pack. В PM переносится narrative и рабочий план адаптации.',
      labels,
      tasks: [
        {
          title: 'Собрать story arc',
          description: 'Определить нарратив, структуру слайдов и обязательные доказательства.',
          priority: 'high',
          labels: ['storytelling']
        },
        {
          title: 'Адаптировать дизайн и данные',
          description: 'Подменить примеры, графики и акцентные блоки под текущий кейс.',
          priority: 'med',
          labels: ['slides', 'content']
        },
        {
          title: 'Подготовить версию для review',
          description: 'Собрать пакет для внутреннего ревью и handoff в финальную подачу.',
          priority: 'med',
          labels: ['review']
        }
      ]
    };
  }

  return {
    kind: 'template',
    sourceId: template.id,
    sourceTitle: template.title,
    sourceDescription: template.description,
    recommendedProjectTitle: `${template.title} — brand setup`,
    recommendedProjectDescription: template.description,
    projectType: 'marketing',
    projectStage: 'discovery',
    rootTaskTitle: `Каталог: ${template.title}`,
    rootTaskDescription: 'Импортирован reusable template из каталога с приоритетом на быстрый старт проекта.',
    labels,
    tasks: [
      {
        title: 'Снять бренд-бриф',
        description: 'Зафиксировать позиционирование, референсы и ограничения по стилю.',
        priority: 'high',
        labels: ['brand', 'brief']
      },
      {
        title: 'Адаптировать визуальную систему',
        description: 'Подменить логотип, цвета, носители и базовые правила использования.',
        priority: 'high',
        labels: ['identity']
      },
      {
        title: 'Подготовить пакет к внедрению',
        description: 'Собрать финальные файлы, гайд и список следующих шагов для команды.',
        priority: 'med',
        labels: ['delivery']
      }
    ]
  };
}

function buildSolutionPlan(sourceId: string): CatalogReusePlan | null {
  const solution = readySolutions.find((item) => item.id === sourceId) ?? null;
  if (!solution) {
    return null;
  }

  const common = {
    kind: 'solution' as const,
    sourceId: solution.id,
    sourceTitle: solution.title,
    sourceDescription: solution.description,
    recommendedProjectTitle: solution.title,
    recommendedProjectDescription: solution.description,
    rootTaskTitle: `Каталог: ${solution.title}`,
    rootTaskDescription: 'Импортирован reusable solution из публичной витрины каталога. Исходная публикация и PM-проект остаются разными сущностями.',
    labels: Array.from(new Set(['catalog', 'solution', ...solution.tags]))
  };

  if (solution.id === 'ops-sprint-os') {
    return {
      ...common,
      projectType: 'operations',
      projectStage: 'build',
      tasks: [
        {
          title: 'Настроить weekly cadence',
          description: 'Определить ритм спринтов, синков и decision checkpoints.',
          priority: 'high',
          labels: ['ops', 'cadence']
        },
        {
          title: 'Собрать dashboard и источники данных',
          description: 'Проверить метрики, статусы и сигналы для команды operations.',
          priority: 'high',
          labels: ['dashboard', 'metrics']
        },
        {
          title: 'Подготовить запуск команды',
          description: 'Назначить роли, backlog и первые ритуалы запуска.',
          priority: 'med',
          labels: ['team', 'launch']
        }
      ]
    };
  }

  if (solution.id === 'growth-campaign-canvas') {
    return {
      ...common,
      projectType: 'marketing',
      projectStage: 'discovery',
      tasks: [
        {
          title: 'Собрать backlog гипотез',
          description: 'Зафиксировать каналы, эксперименты и ожидаемые эффекты.',
          priority: 'high',
          labels: ['growth', 'hypotheses']
        },
        {
          title: 'Разложить кампании по спринтам',
          description: 'Перевести сценарий в календарь работ и связать с deliverables.',
          priority: 'high',
          labels: ['campaigns', 'planning']
        },
        {
          title: 'Настроить weekly review',
          description: 'Подготовить слоты для анализа результатов и следующего цикла.',
          priority: 'med',
          labels: ['review']
        }
      ]
    };
  }

  return {
    ...common,
    projectType: 'marketing',
    projectStage: 'launch',
    tasks: [
      {
        title: 'Разобрать launch milestones',
        description: 'Определить фазы запуска, критические deliverables и контрольные даты.',
        priority: 'high',
        labels: ['launch', 'milestones']
      },
      {
        title: 'Подготовить handoff между командами',
        description: 'Собрать материалы для дизайна, контента и продакшна.',
        priority: 'high',
        labels: ['handoff', 'delivery']
      },
      {
        title: 'Запустить контроль качества',
        description: 'Проверить готовность материалов и правила приёмки результата.',
        priority: 'med',
        labels: ['qa']
      }
    ]
  };
}

export function resolveCatalogReusePlan(kind: CatalogApplyKind, sourceId: string): CatalogReusePlan | null {
  if (kind === 'template') {
    return buildTemplatePlan(sourceId);
  }
  return buildSolutionPlan(sourceId);
}
