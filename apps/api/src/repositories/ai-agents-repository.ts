import { usersRepository } from './users-repository';
import { projectsRepository } from './projects-repository';
import { memory } from '../data/memory';
import type { AIAgent, AIAgentType } from '../types';

export class AIAgentsRepository {
  private initialized = false;

  /**
   * Инициализирует предустановленных AI-агентов при первом использовании
   */
  private async ensureInitialized(): Promise<void> {
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
      const existing = await usersRepository.findById(agentData.email);
      if (!existing || !(existing as any).isAI) {
        // Создаём пользователя-агента через usersRepository
        const user = await usersRepository.create({
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

  async findById(id: string): Promise<AIAgent | null> {
    await this.ensureInitialized();
    const user = await usersRepository.findById(id);
    return user && (user as any).isAI ? (user as AIAgent) : null;
  }

  async list(): Promise<AIAgent[]> {
    await this.ensureInitialized();
    const allUsers = await usersRepository.list();
    return allUsers
      .filter((user) => (user as any).isAI)
      .map((user) => user as AIAgent);
  }

  async listByProject(projectId: string): Promise<AIAgent[]> {
    await this.ensureInitialized();
    const members = projectsRepository.listMembers(projectId);
    const agentIds: string[] = [];
    for (const m of members) {
      const user = await usersRepository.findById(m.userId);
      if (user && (user as any).isAI) {
        agentIds.push(m.userId);
      }
    }

    const agents: AIAgent[] = [];
    for (const id of agentIds) {
      const agent = await this.findById(id);
      if (agent) {
        agents.push(agent);
      }
    }
    return agents;
  }

  async findByType(agentType: AIAgentType): Promise<AIAgent | null> {
    await this.ensureInitialized();
    const agents = await this.list();
    return agents.find((agent) => agent.agentType === agentType) || null;
  }

  async update(agentId: string, updates: {
    name?: string;
    title?: string;
    responseTemplates?: string[];
    behavior?: {
      autoRespond?: boolean;
      responseStyle?: 'short' | 'detailed';
    };
  }): Promise<AIAgent | null> {
    await this.ensureInitialized();
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

