import { usersRepository } from './users-repository';
import { projectsRepository } from './projects-repository';
import { memory } from '../data/memory';
import type { AIAgent, AIAgentType } from '../types';

export class AIAgentsRepository {
  private initialized = false;

  /**
   * Инициализирует предустановленных AI-агентов при первом использовании
   */
  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    const defaultAgents: Array<{
      name: string;
      email: string;
      title: string;
      agentType: AIAgentType;
      responseTemplates: string[];
      behavior: { autoRespond: boolean; responseStyle: 'short' | 'detailed' };
    }> = [
      {
        name: 'AI Помощник',
        email: 'ai.assistant@collabverse.ai',
        title: 'AI-ассистент проекта',
        agentType: 'assistant',
        responseTemplates: [
          'Принял к сведению. Продолжаю работу.',
          'Понял задачу. Начинаю выполнение.',
          'Задача в работе. Ожидаю обновления.',
          'Работаю над задачей. Скоро будет готово.'
        ],
        behavior: {
          autoRespond: true,
          responseStyle: 'short'
        }
      },
      {
        name: 'AI Ревьюер',
        email: 'ai.reviewer@collabverse.ai',
        title: 'AI-ревьюер задач',
        agentType: 'reviewer',
        responseTemplates: [
          'Проверил задачу. Всё соответствует требованиям.',
          'Обнаружены замечания. Требуется доработка.',
          'Задача готова к следующему этапу.',
          'Проверка завершена. Можно продолжать.'
        ],
        behavior: {
          autoRespond: false,
          responseStyle: 'short'
        }
      },
      {
        name: 'AI Напоминатель',
        email: 'ai.reminder@collabverse.ai',
        title: 'AI-напоминатель о дедлайнах',
        agentType: 'reminder',
        responseTemplates: [
          'Напоминаю: дедлайн задачи приближается.',
          'Осталось 2 дня до дедлайна.',
          'Дедлайн сегодня! Не забудьте завершить задачу.',
          'Внимание: дедлайн через несколько часов.'
        ],
        behavior: {
          autoRespond: true,
          responseStyle: 'short'
        }
      },
      {
        name: 'AI Суммаризатор',
        email: 'ai.summarizer@collabverse.ai',
        title: 'AI-суммаризатор обсуждений',
        agentType: 'summarizer',
        responseTemplates: [
          'Вот краткая сводка обсуждения...',
          'Основные моменты из комментариев...',
          'Резюме проделанной работы...'
        ],
        behavior: {
          autoRespond: false,
          responseStyle: 'detailed'
        }
      }
    ];

    for (const agentData of defaultAgents) {
      const existing = usersRepository.findById(agentData.email);
      if (!existing || !existing.isAI) {
        // Создаём пользователя-агента через usersRepository
        const user = usersRepository.create({
          id: agentData.email,
          name: agentData.name,
          email: agentData.email,
          title: agentData.title
        });
        
        // Добавляем AI-специфичные поля напрямую в память
        const userInMemory = memory.WORKSPACE_USERS.find((u) => u.id === user.id);
        if (userInMemory) {
          (userInMemory as any).isAI = true;
          (userInMemory as any).agentType = agentData.agentType;
          (userInMemory as any).responseTemplates = agentData.responseTemplates;
          (userInMemory as any).behavior = agentData.behavior;
        }
      }
    }

    this.initialized = true;
  }

  findById(id: string): AIAgent | null {
    this.ensureInitialized();
    const user = usersRepository.findById(id);
    return user && user.isAI ? (user as AIAgent) : null;
  }

  list(): AIAgent[] {
    this.ensureInitialized();
    return usersRepository
      .list()
      .filter((user) => user.isAI)
      .map((user) => user as AIAgent);
  }

  listByProject(projectId: string): AIAgent[] {
    this.ensureInitialized();
    const members = projectsRepository.listMembers(projectId);
    const agentIds = members
      .filter((m) => {
        const user = usersRepository.findById(m.userId);
        return user?.isAI;
      })
      .map((m) => m.userId);

    return agentIds
      .map((id) => this.findById(id))
      .filter((agent): agent is AIAgent => agent !== null);
  }

  findByType(agentType: AIAgentType): AIAgent | null {
    this.ensureInitialized();
    return this.list().find((agent) => agent.agentType === agentType) || null;
  }

  update(agentId: string, updates: {
    name?: string;
    title?: string;
    responseTemplates?: string[];
    behavior?: {
      autoRespond?: boolean;
      responseStyle?: 'short' | 'detailed';
    };
  }): AIAgent | null {
    this.ensureInitialized();
    const userInMemory = memory.WORKSPACE_USERS.find((u) => u.id === agentId);
    if (!userInMemory || !(userInMemory as any).isAI) {
      return null;
    }

    if (updates.name) {
      userInMemory.name = updates.name.trim();
    }
    if (updates.title !== undefined) {
      const trimmedTitle = updates.title.trim();
      if (trimmedTitle) {
        userInMemory.title = trimmedTitle;
      } else {
        delete userInMemory.title;
      }
    }
    if (updates.responseTemplates !== undefined) {
      (userInMemory as any).responseTemplates = updates.responseTemplates;
    }
    if (updates.behavior !== undefined) {
      (userInMemory as any).behavior = updates.behavior;
    }

    return this.findById(agentId);
  }
}

export const aiAgentsRepository = new AIAgentsRepository();

