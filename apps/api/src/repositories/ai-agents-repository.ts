import { usersRepository } from './users-repository';
import { projectsRepository } from './projects-repository';
import { memory } from '../data/memory';
import type { AIAgent, AIAgentType, AIAgentScope } from '../types';

export class AIAgentsRepository {
  private initialized = false;

  /**
   * Инициализирует предустановленных AI-агентов при первом использовании
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Создаём только одного нового агента с поддержкой OpenAI API
    const defaultAgents: Array<{
      name: string;
      email: string;
      title: string;
      agentType: AIAgentType;
      responseTemplates: string[];
      behavior: { autoRespond: boolean; responseStyle: 'short' | 'detailed' };
      scope: AIAgentScope;
      createdBy: string;
    }> = [
        {
          name: 'AI Ассистент',
          email: 'ai.assistant@collabverse.ai',
          title: 'AI-ассистент с OpenAI',
          agentType: 'assistant',
          responseTemplates: [
            'Принял к сведению. Продолжаю работу.',
            'Понял задачу. Начинаю выполнение.',
            'Задача в работе. Ожидаю обновления.',
            'Работаю над задачей. Скоро будет готово.',
            'Использую OpenAI для анализа и помощи.'
          ],
          behavior: {
            autoRespond: true,
            responseStyle: 'short'
          },
          scope: 'public',
          createdBy: 'system'
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
          (userInMemory as any).scope = agentData.scope;
          (userInMemory as any).createdBy = agentData.createdBy;
        }
      }
    }

    this.initialized = true;
  }

  async create(agentData: {
    name: string;
    email?: string;
    title?: string;
    agentType: AIAgentType;
    scope: AIAgentScope;
    createdBy: string;
    apiKey?: string;
    modelProvider?: 'subscription' | 'openai_api_key';
    isGlobal?: boolean;
    responseTemplates?: string[];
    behavior?: {
      autoRespond?: boolean;
      responseStyle?: 'short' | 'detailed';
    };
  }): Promise<AIAgent> {
    await this.ensureInitialized();

    // Generate email if not provided
    const email = agentData.email || `agent.${Date.now()}@collabverse.ai`;

    const existing = await usersRepository.findById(email);
    if (existing) {
      throw new Error('Agent with this email already exists');
    }

    // Create user via usersRepository
    const user = await usersRepository.create({
      id: email,
      name: agentData.name,
      email: email,
      title: agentData.title || 'AI Agent'
    });

    // Add AI-specific fields to memory
    const userInMemory = memory.WORKSPACE_USERS.find((u) => u.id === user.id);
    if (userInMemory) {
      (userInMemory as any).isAI = true;
      (userInMemory as any).agentType = agentData.agentType;
      (userInMemory as any).responseTemplates = agentData.responseTemplates || [];
      (userInMemory as any).behavior = agentData.behavior || { autoRespond: true, responseStyle: 'short' };
      (userInMemory as any).modelProvider = agentData.modelProvider || 'subscription';
      (userInMemory as any).scope = agentData.scope;
      (userInMemory as any).createdBy = agentData.createdBy;
      
      if (agentData.isGlobal) {
        (userInMemory as any).isGlobal = true;
      }
      if (agentData.apiKey) {
        (userInMemory as any).userApiKey = agentData.apiKey;
      }
    }

    const createdAgent = await this.findById(user.id);
    if (!createdAgent) {
      throw new Error('Failed to create agent');
    }

    return createdAgent;
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

  /**
   * Удаляет AI-агента из системы
   */
  async delete(agentId: string): Promise<boolean> {
    await this.ensureInitialized();
    const userInMemory = memory.WORKSPACE_USERS.find((u) => u.id === agentId);
    if (!userInMemory || !(userInMemory as any).isAI) {
      return false;
    }

    // Удаляем агента через usersRepository
    return await usersRepository.delete(agentId);
  }

  /**
   * Удаляет всех старых тестовых агентов
   */
  async deleteOldTestAgents(): Promise<number> {
    await this.ensureInitialized();
    const oldAgentEmails = [
      'ai.assistant@collabverse.ai',
      'ai.reviewer@collabverse.ai',
      'ai.reminder@collabverse.ai',
      'ai.summarizer@collabverse.ai'
    ];

    let deletedCount = 0;
    for (const email of oldAgentEmails) {
      const agent = await this.findById(email);
      if (agent) {
        const deleted = await this.delete(email);
        if (deleted) {
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }
}

export const aiAgentsRepository = new AIAgentsRepository();

