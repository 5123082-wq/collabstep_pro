import { usersRepository } from './users-repository';
import { projectsRepository } from './projects-repository';
import { memory } from '../data/memory';
import type { AIAgent, AIAgentType, AIAgentScope, WorkspaceUser } from '../types';

type MutableAIAgent = WorkspaceUser & Partial<AIAgent>;

const isAIAgent = (user: WorkspaceUser | null): user is AIAgent => Boolean(user && user.isAI);

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
      if (!isAIAgent(existing)) {
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
          const agent = userInMemory as MutableAIAgent;
          agent.isAI = true;
          agent.agentType = agentData.agentType;
          agent.responseTemplates = agentData.responseTemplates;
          agent.behavior = agentData.behavior;
          agent.scope = agentData.scope;
          agent.createdBy = agentData.createdBy;
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
      const agent = userInMemory as MutableAIAgent;
      agent.isAI = true;
      agent.agentType = agentData.agentType;
      agent.responseTemplates = agentData.responseTemplates || [];
      agent.behavior = agentData.behavior || { autoRespond: true, responseStyle: 'short' };
      agent.modelProvider = agentData.modelProvider || 'subscription';
      agent.scope = agentData.scope;
      agent.createdBy = agentData.createdBy;
      
      if (agentData.isGlobal) {
        agent.isGlobal = true;
      }
      if (agentData.apiKey) {
        agent.userApiKey = agentData.apiKey;
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
    return isAIAgent(user) ? user : null;
  }

  async list(): Promise<AIAgent[]> {
    await this.ensureInitialized();
    const allUsers = await usersRepository.list();
    return allUsers.filter(isAIAgent);
  }

  async listByProject(projectId: string): Promise<AIAgent[]> {
    await this.ensureInitialized();
    const members = await projectsRepository.listMembers(projectId);
    const agentIds: string[] = [];
    for (const m of members) {
      const user = await usersRepository.findById(m.userId);
      if (isAIAgent(user)) {
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
    if (!userInMemory || !isAIAgent(userInMemory)) {
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
      userInMemory.responseTemplates = updates.responseTemplates;
    }
    if (updates.behavior !== undefined) {
      userInMemory.behavior = updates.behavior;
    }

    return this.findById(agentId);
  }

  /**
   * Удаляет AI-агента из системы
   */
  async delete(agentId: string): Promise<boolean> {
    await this.ensureInitialized();
    const userInMemory = memory.WORKSPACE_USERS.find((u) => u.id === agentId);
    if (!userInMemory || !isAIAgent(userInMemory)) {
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
