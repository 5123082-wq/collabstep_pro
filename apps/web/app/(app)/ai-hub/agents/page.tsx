'use client';

import { useState, useEffect, useRef } from 'react';
import { put } from '@vercel/blob/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/ui/toast';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { ContentBlock } from '@/components/ui/content-block';
import { isDemoAdminEmail } from '@/lib/auth/demo-session';
import { useOrganization } from '@/components/organizations/OrganizationContext';

type AIAgentScope = 'personal' | 'team' | 'public';

type AIAgent = {
  id: string;
  name: string;
  email: string;
  title: string;
  agentType: 'assistant' | 'reviewer' | 'reminder' | 'summarizer';
  scope?: AIAgentScope;
  isGlobal?: boolean;
  responseTemplates?: string[];
  behavior?: {
    autoRespond?: boolean;
    responseStyle?: 'short' | 'detailed';
  };
};

type ProjectInfo = {
  id: string;
  name: string;
  key: string;
};

type BrandbookProductBundle = 'merch_basic' | 'office_basic';

type BrandbookRunResult = {
  runId: string;
  status: string;
  metadata: {
    pipelineType: string;
    outputFormat: string;
    previewFormat: string;
  };
};

type BrandbookRunSummary = {
  id: string;
  status: string;
  productBundle: BrandbookProductBundle;
  createdAt: string;
  projectId?: string;
};

type BrandbookRunDetails = {
  id: string;
  status: string;
  input: {
    projectId?: string;
    taskId?: string;
    logoFileId?: string;
    productBundle: BrandbookProductBundle;
    preferences?: string[];
    outputLanguage?: string;
    watermarkText?: string;
    contactBlock?: string;
  };
  metadata?: {
    pipelineType: string;
    outputFormat: string;
    previewFormat: string;
  };
  createdAt: string;
  updatedAt: string;
};

type BrandbookRunMessagePayload = {
  id: string;
  runId: string;
  role: BrandbookChatRole;
  content: string;
  createdAt: string;
};

type BrandbookRunArtifactPayload = {
  id: string;
  runId: string;
  fileId: string;
  kind: 'preview' | 'final';
  createdAt: string;
};

type BrandbookRunApiResponse = {
  ok: boolean;
  data?: BrandbookRunResult;
  error?: string;
  details?: string;
};

type BrandbookRunListApiResponse = {
  ok: boolean;
  data?: { runs: BrandbookRunSummary[] };
  error?: string;
  details?: string;
};

type BrandbookRunDetailsApiResponse = {
  ok: boolean;
  data?: {
    run: BrandbookRunDetails;
    messages: BrandbookRunMessagePayload[];
    artifacts: BrandbookRunArtifactPayload[];
  };
  error?: string;
  details?: string;
};

type BrandbookRunForm = {
  projectId: string;
  taskId: string;
  productBundle: BrandbookProductBundle;
  preferences: string;
  outputLanguage: string;
  watermarkText: string;
  contactBlock: string;
};

type BrandbookChatRole = 'assistant' | 'user' | 'system';

type BrandbookChatMessage = {
  id: string;
  role: BrandbookChatRole;
  content: string;
  createdAt?: string;
};

const AGENT_TYPE_LABELS: Record<string, string> = {
  assistant: 'Помощник',
  reviewer: 'Ревьюер',
  reminder: 'Напоминатель',
  summarizer: 'Суммаризатор'
};

const AGENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  assistant: 'Автоматически отвечает на вопросы и помогает с задачами',
  reviewer: 'Проверяет задачи и оставляет комментарии',
  reminder: 'Напоминает о приближающихся дедлайнах',
  summarizer: 'Суммирует обсуждения и комментарии'
};

const BRANDBOOK_FORM_INITIAL: BrandbookRunForm = {
  projectId: '',
  taskId: '',
  productBundle: 'merch_basic',
  preferences: '',
  outputLanguage: '',
  watermarkText: '',
  contactBlock: ''
};

const AI_V1_ENABLED = (() => {
  const raw = process.env.NEXT_PUBLIC_FEATURE_AI_V1;
  if (!raw) {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
})();

export default function AiAgentsPage() {
  const { currentOrgId, isLoading: orgLoading } = useOrganization();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [agentProjects, setAgentProjects] = useState<Record<string, ProjectInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<Record<string, string>>({});
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [viewingAgent, setViewingAgent] = useState<AIAgent | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isBrandbookModalOpen, setBrandbookModalOpen] = useState(false);
  const [brandbookForm, setBrandbookForm] = useState<BrandbookRunForm>(BRANDBOOK_FORM_INITIAL);
  const [brandbookRuns, setBrandbookRuns] = useState<BrandbookRunSummary[]>([]);
  const [brandbookActiveRun, setBrandbookActiveRun] = useState<BrandbookRunDetails | null>(null);
  const [brandbookSubmitting, setBrandbookSubmitting] = useState(false);
  const [brandbookRunsLoading, setBrandbookRunsLoading] = useState(false);
  const [brandbookActiveLoading, setBrandbookActiveLoading] = useState(false);
  const [brandbookUploadPending, setBrandbookUploadPending] = useState(false);
  const [isBrandbookAdvancedOpen, setBrandbookAdvancedOpen] = useState(false);
  const [isBrandbookChatOpen, setBrandbookChatOpen] = useState(false);
  const [brandbookChatMessages, setBrandbookChatMessages] = useState<BrandbookChatMessage[]>([]);
  const [brandbookChatInput, setBrandbookChatInput] = useState('');
  const [brandbookLogoLink, setBrandbookLogoLink] = useState('');
  const [brandbookUsePlaceholder, setBrandbookUsePlaceholder] = useState(false);
  const [isBrandbookActionsOpen, setBrandbookActionsOpen] = useState(false);
  const brandbookChatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const brandbookFileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | AIAgentScope>('all');

  const [editForm, setEditForm] = useState<{
    name: string;
    title: string;
    responseTemplates: string;
    autoRespond: boolean;
    responseStyle: 'short' | 'detailed';
  }>({
    name: '',
    title: '',
    responseTemplates: '',
    autoRespond: false,
    responseStyle: 'short'
  });
  const [saving, setSaving] = useState(false);
  const organizationId = currentOrgId ?? '';

  useEffect(() => {
    void loadData();
    // Проверить, является ли пользователь админом
    void checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', { headers: { 'cache-control': 'no-store' } });
      const payload = (await response.json()) as { authenticated?: boolean; email?: string; userId?: string };
      if (payload.authenticated && payload.email) {
        setIsAdmin(isDemoAdminEmail(payload.email));
      }
      if (payload.authenticated && payload.userId) {
        setCurrentUserId(payload.userId);
      }
    } catch (err) {
      console.error('Failed to check admin status', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Загрузить всех агентов
      const agentsResponse = await fetch('/api/pm/ai-agents');
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        const agentsList = Array.isArray(agentsData.data?.agents) ? agentsData.data.agents : [];
        setAgents(agentsList);
      }

      // Загрузить проекты
      const projectsResponse = await fetch('/api/pm/projects?pageSize=100');
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        const items = Array.isArray(projectsData.items) ? projectsData.items : [];
        const projectsList: ProjectInfo[] = items
          .map((project: unknown) => {
            const typedProject = project as {
              id?: unknown;
              name?: unknown;
              title?: unknown;
              key?: unknown;
            };

            if (typeof typedProject.id !== 'string' || typeof typedProject.key !== 'string') {
              return null;
            }

            const projectName =
              typeof typedProject.name === 'string' && typedProject.name.trim()
                ? typedProject.name
                : typeof typedProject.title === 'string'
                  ? typedProject.title
                  : '';

            return {
              id: typedProject.id,
              name: projectName,
              key: typedProject.key
            };
          })
          .filter((project: ProjectInfo | null): project is ProjectInfo => project !== null);
        setProjects(projectsList);

        // Загрузить информацию о том, в каких проектах используется каждый агент
        const agentProjectsMap: Record<string, ProjectInfo[]> = {};

        // Для каждого проекта проверяем наличие агентов
        for (const project of projectsList) {
          try {
            const response = await fetch(`/api/pm/projects/${project.id}/ai-agents`);
            if (response.ok) {
              const data = await response.json();
              const projectAgents = Array.isArray(data.data?.agents) ? data.data.agents : [];
              for (const agent of projectAgents) {
                if (agent && agent.id) {
                  if (!agentProjectsMap[agent.id]) {
                    agentProjectsMap[agent.id] = [];
                  }
                  agentProjectsMap[agent.id]!.push(project);
                }
              }
            }
          } catch (err) {
            // Игнорируем ошибки доступа
          }
        }
        setAgentProjects(agentProjectsMap);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast('Не удалось загрузить данные', 'warning');
      // Убеждаемся, что состояние всегда валидно даже при ошибке
      setAgents([]);
      setProjects([]);
      setAgentProjects({});
    } finally {
      setLoading(false);
    }
  };

  const handleAddToProject = async (agentId: string, projectId: string) => {
    try {
      const response = await fetch(`/api/pm/projects/${projectId}/ai-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось добавить агента');
      }

      toast('Агент добавлен в проект', 'success');
      void loadData();
    } catch (error) {
      console.error('Error adding agent:', error);
      toast(error instanceof Error ? error.message : 'Не удалось добавить агента', 'warning');
    }
  };

  const handleRemoveFromProject = async (agentId: string, projectId: string) => {
    try {
      const response = await fetch(`/api/pm/projects/${projectId}/ai-agents?agentId=${agentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось удалить агента');
      }

      toast('Агент удалён из проекта', 'success');
      void loadData();
    } catch (error) {
      console.error('Error removing agent:', error);
      toast(error instanceof Error ? error.message : 'Не удалось удалить агента', 'warning');
    }
  };

  const handleEditAgent = (agent: AIAgent) => {
    setEditingAgent(agent);
    setEditForm({
      name: agent.name,
      title: agent.title,
      responseTemplates: agent.responseTemplates?.join('\n') || '',
      autoRespond: agent.behavior?.autoRespond ?? false,
      responseStyle: agent.behavior?.responseStyle ?? 'short'
    });
  };

  const createBrandbookMessage = (
    role: BrandbookChatRole,
    content: string,
    createdAt?: string
  ): BrandbookChatMessage => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    ...(createdAt ? { createdAt } : {})
  });

  const persistBrandbookMessage = async (
    role: BrandbookChatRole,
    content: string,
    notifyOnError = false
  ) => {
    if (!brandbookActiveRun) {
      return;
    }

    try {
      const response = await fetch(`/api/ai/agents/brandbook/runs/${brandbookActiveRun.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string; details?: string } | null;
        throw new Error(data?.error || data?.details || 'Не удалось сохранить сообщение');
      }
    } catch (error) {
      console.error('Error saving brandbook message:', error);
      if (notifyOnError) {
        toast(error instanceof Error ? error.message : 'Не удалось сохранить сообщение', 'warning');
      }
    }
  };

  const appendBrandbookMessage = (
    role: BrandbookChatRole,
    content: string,
    options?: { persist?: boolean; notifyOnError?: boolean; createdAt?: string }
  ) => {
    setBrandbookChatMessages((prev) => [
      ...prev,
      createBrandbookMessage(role, content, options?.createdAt)
    ]);

    if (options?.persist === false) {
      return;
    }

    void persistBrandbookMessage(role, content, options?.notifyOnError);
  };

  const loadBrandbookRun = async (runId: string) => {
    setBrandbookActiveLoading(true);
    try {
      const response = await fetch(`/api/ai/agents/brandbook/runs/${runId}`);
      const responsePayload = (await response.json().catch(() => null)) as BrandbookRunDetailsApiResponse | null;

      if (!response.ok) {
        const errorMessage =
          responsePayload?.error || responsePayload?.details || 'Не удалось загрузить запуск';
        throw new Error(errorMessage);
      }

      if (!responsePayload?.data?.run) {
        throw new Error('Пустой ответ от сервера');
      }

      const { run, messages } = responsePayload.data;
      setBrandbookActiveRun(run);
      setBrandbookChatMessages(
        messages.map((message) =>
          createBrandbookMessage(message.role, message.content, message.createdAt)
        )
      );
      setBrandbookChatInput('');
      setBrandbookLogoLink('');
      setBrandbookUsePlaceholder(false);
    } catch (error) {
      console.error('Error loading brandbook run:', error);
      toast(error instanceof Error ? error.message : 'Не удалось загрузить запуск', 'warning');
    } finally {
      setBrandbookActiveLoading(false);
    }
  };

  const loadBrandbookRuns = async (preferredRunId?: string) => {
    const fallbackProjectId = brandbookForm.projectId || brandbookActiveRun?.input.projectId || '';
    if ((!organizationId && !fallbackProjectId) || (orgLoading && !fallbackProjectId)) {
      if (preferredRunId) {
        void loadBrandbookRun(preferredRunId);
      }
      return;
    }

    setBrandbookRunsLoading(true);
    try {
      const params = new URLSearchParams();
      if (organizationId) {
        params.set('organizationId', organizationId);
      } else if (fallbackProjectId) {
        params.set('projectId', fallbackProjectId);
      }
      const response = await fetch(`/api/ai/agents/brandbook/runs?${params.toString()}`);
      const responsePayload = (await response.json().catch(() => null)) as BrandbookRunListApiResponse | null;

      if (!response.ok) {
        const errorMessage =
          responsePayload?.error || responsePayload?.details || 'Не удалось загрузить список запусков';
        throw new Error(errorMessage);
      }

      const runs = responsePayload?.data?.runs ?? [];
      setBrandbookRuns(runs);

      const nextRunId = preferredRunId ?? brandbookActiveRun?.id ?? runs[0]?.id;
      if (nextRunId) {
        void loadBrandbookRun(nextRunId);
      } else {
        setBrandbookActiveRun(null);
        setBrandbookChatMessages([]);
      }
    } catch (error) {
      console.error('Error loading brandbook runs:', error);
      toast(error instanceof Error ? error.message : 'Не удалось загрузить запуски', 'warning');
    } finally {
      setBrandbookRunsLoading(false);
    }
  };

  const openBrandbookChat = (runId?: string) => {
    setBrandbookChatOpen(true);
    setBrandbookActionsOpen(false);
    setBrandbookLogoLink('');
    setBrandbookUsePlaceholder(false);
    void loadBrandbookRuns(runId);
  };

  const openBrandbookModal = () => {
    setBrandbookForm(BRANDBOOK_FORM_INITIAL);
    setBrandbookAdvancedOpen(false);
    setBrandbookChatOpen(false);
    setBrandbookModalOpen(true);
  };

  const handleBrandbookRun = async () => {
    const projectId = brandbookForm.projectId.trim();
    const taskId = projectId ? brandbookForm.taskId.trim() : '';
    const productBundle = brandbookForm.productBundle;

    if (!productBundle) {
      toast('Выберите набор продукции', 'warning');
      return;
    }

    if (!projectId && orgLoading) {
      toast('Организация еще загружается, попробуйте позже', 'warning');
      return;
    }

    if (!projectId && !organizationId) {
      toast('Выберите проект или переключитесь на организацию для запуска', 'warning');
      return;
    }

    const preferences = brandbookForm.preferences
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    const outputLanguage = brandbookForm.outputLanguage.trim();
    const watermarkText = brandbookForm.watermarkText.trim();
    const contactBlock = brandbookForm.contactBlock.trim();

    const payload = {
      productBundle,
      ...(projectId ? { projectId } : {}),
      ...(projectId ? {} : organizationId ? { organizationId } : {}),
      ...(taskId ? { taskId } : {}),
      ...(preferences.length > 0 ? { preferences } : {}),
      ...(outputLanguage ? { outputLanguage } : {}),
      ...(watermarkText ? { watermarkText } : {}),
      ...(contactBlock ? { contactBlock } : {})
    };

    setBrandbookSubmitting(true);

    try {
      // TODO(analytics): добавить ai_agent_triggered для запуска Brandbook Agent.
      const response = await fetch('/api/ai/agents/brandbook/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responsePayload = (await response.json().catch(() => null)) as BrandbookRunApiResponse | null;

      if (!response.ok) {
        const errorMessage =
          responsePayload?.error || responsePayload?.details || 'Не удалось запустить Brandbook Agent';
        throw new Error(errorMessage);
      }

      if (!responsePayload?.data) {
        throw new Error('Пустой ответ от сервера');
      }

      setBrandbookModalOpen(false);
      openBrandbookChat(responsePayload.data.runId);
      toast('Запуск Brandbook Agent создан', 'success');
    } catch (error) {
      console.error('Error starting Brandbook Agent:', error);
      toast(error instanceof Error ? error.message : 'Не удалось запустить Brandbook Agent', 'warning');
    } finally {
      setBrandbookSubmitting(false);
    }
  };

  const updateActiveRunInput = (patch: Partial<BrandbookRunDetails['input']>) => {
    setBrandbookActiveRun((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        input: {
          ...prev.input,
          ...patch
        }
      };
    });
  };

  const handleBrandbookChatSend = () => {
    if (!brandbookActiveRun) {
      toast('Сначала выберите запуск', 'warning');
      return;
    }

    const message = brandbookChatInput.trim();
    if (!message) {
      return;
    }

    appendBrandbookMessage('user', message, { notifyOnError: true });
    setBrandbookChatInput('');

    const logoIdMatch = message.match(/logoFileId\s*[:=]\s*([^\s]+)/i);
    const linkMatch = message.match(/https?:\/\/[^\s]+/i);

    if (logoIdMatch) {
      const logoId = logoIdMatch[1] ? logoIdMatch[1].trim() : '';
      updateActiveRunInput({ logoFileId: logoId });
      setBrandbookLogoLink('');
      setBrandbookUsePlaceholder(false);
      appendBrandbookMessage('assistant', 'Принял logoFileId. Если есть еще пожелания — напишите.');
      return;
    }

    if (linkMatch) {
      setBrandbookLogoLink(linkMatch[0]);
      updateActiveRunInput({ logoFileId: '' });
      setBrandbookUsePlaceholder(false);
      appendBrandbookMessage('assistant', 'Ссылку получил. Если нужен формат/размер — уточните.');
      return;
    }

    if (!logoIdMatch && !linkMatch && message.length >= 12 && !/\s/.test(message)) {
      updateActiveRunInput({ logoFileId: message });
      setBrandbookLogoLink('');
      setBrandbookUsePlaceholder(false);
      appendBrandbookMessage('assistant', 'Похоже, это ID файла. Зафиксировал logoFileId.');
      return;
    }

    if (/без\s+логотипа|placeholder|mockup/i.test(message)) {
      setBrandbookUsePlaceholder(true);
      updateActiveRunInput({ logoFileId: '' });
      setBrandbookLogoLink('');
      appendBrandbookMessage('assistant', 'Ок, сделаю демо-мокап с placeholder LOGO.');
      return;
    }

    appendBrandbookMessage('assistant', 'Спасибо, понял. Готов продолжать — можно прислать логотип или уточнения.');
  };

  const handleBrandbookFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!brandbookActiveRun) {
      toast('Сначала выберите запуск', 'warning');
      return;
    }

    if (!currentUserId) {
      toast('Не удалось определить пользователя', 'warning');
      return;
    }

    const projectId = brandbookActiveRun.input.projectId ?? '';
    if (!organizationId && !projectId) {
      toast('Не удалось определить организацию', 'warning');
      return;
    }

    setBrandbookUploadPending(true);
    try {
      const uploadResponse = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          ...(projectId ? { projectId } : {}),
          ...(projectId ? {} : organizationId ? { organizationId } : {})
        })
      });

      const uploadPayload = (await uploadResponse.json().catch(() => null)) as
        | { ok: boolean; data?: { token: string; pathname: string }; error?: string; details?: string }
        | null;

      if (!uploadResponse.ok || !uploadPayload?.data?.token || !uploadPayload.data.pathname) {
        const message = uploadPayload?.error || uploadPayload?.details || 'Не удалось подготовить загрузку';
        throw new Error(message);
      }

      const uploaded = await put(uploadPayload.data.pathname, file, {
        token: uploadPayload.data.token,
        contentType: file.type || 'application/octet-stream',
        access: 'public'
      });

      const completeResponse = await fetch('/api/files/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storageKey: uploadPayload.data.pathname,
          url: uploaded.url,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          uploaderId: currentUserId,
          ...(projectId ? { projectId } : {}),
          ...(projectId ? {} : organizationId ? { organizationId } : {})
        })
      });

      const completePayload = (await completeResponse.json().catch(() => null)) as
        | { ok: boolean; data?: { file?: { id?: string } }; error?: string; details?: string }
        | null;

      if (!completeResponse.ok) {
        const message = completePayload?.error || completePayload?.details || 'Не удалось сохранить файл';
        throw new Error(message);
      }

      const fileId = completePayload?.data?.file?.id;
      if (!fileId) {
        throw new Error('Файл не сохранен');
      }

      updateActiveRunInput({ logoFileId: fileId });
      setBrandbookLogoLink('');
      setBrandbookUsePlaceholder(false);
      appendBrandbookMessage('user', `Загрузил логотип: ${file.name}`, { notifyOnError: true });
      appendBrandbookMessage('assistant', 'Принял logoFileId. Если есть еще пожелания — напишите.');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast(error instanceof Error ? error.message : 'Не удалось загрузить файл', 'warning');
    } finally {
      setBrandbookUploadPending(false);
      if (brandbookFileInputRef.current) {
        brandbookFileInputRef.current.value = '';
      }
    }
  };

  const handleBrandbookChatAction = (action: 'insert-id' | 'insert-link' | 'placeholder' | 'upload') => {
    setBrandbookActionsOpen(false);

    if (!brandbookActiveRun) {
      toast('Сначала выберите запуск', 'warning');
      return;
    }

    if (action === 'insert-id') {
      setBrandbookChatInput('logoFileId: ');
      brandbookChatInputRef.current?.focus();
      return;
    }

    if (action === 'insert-link') {
      setBrandbookChatInput('https://');
      brandbookChatInputRef.current?.focus();
      return;
    }

    if (action === 'placeholder') {
      appendBrandbookMessage('user', 'Сгенерируй мокап без логотипа (placeholder LOGO).', { notifyOnError: true });
      setBrandbookUsePlaceholder(true);
      updateActiveRunInput({ logoFileId: '' });
      setBrandbookLogoLink('');
      appendBrandbookMessage('assistant', 'Принял. Запущу демо-мокап с placeholder.');
      return;
    }

    if (action === 'upload') {
      brandbookFileInputRef.current?.click();
    }
  };

  const formatRunDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  };

  const handleSaveAgent = async () => {
    if (!editingAgent) return;

    setSaving(true);
    try {
      const responseTemplatesArray = editForm.responseTemplates
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      const response = await fetch(`/api/pm/ai-agents/${editingAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          title: editForm.title,
          responseTemplates: responseTemplatesArray,
          behavior: {
            autoRespond: editForm.autoRespond,
            responseStyle: editForm.responseStyle
          }
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось сохранить изменения');
      }

      toast('Агент успешно обновлён', 'success');
      setEditingAgent(null);
      void loadData();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast(error instanceof Error ? error.message : 'Не удалось сохранить изменения', 'warning');
    } finally {
      setSaving(false);
    }
  };

  // Filter agents based on active tab
  const filteredAgents = agents.filter(agent => {
    if (activeTab === 'all') return true;
    if (activeTab === 'personal') return agent.scope === 'personal';
    if (activeTab === 'team') return agent.scope === 'team';
    if (activeTab === 'public') return agent.scope === 'public' || agent.isGlobal;
    return true;
  });
  const tabs: Array<{ id: 'all' | AIAgentScope; label: string }> = [
    { id: 'all', label: 'Все' },
    { id: 'personal', label: 'Личные' },
    { id: 'team', label: 'Команда' },
    { id: 'public', label: 'Общедоступные' }
  ];
  const showBrandbookCard = AI_V1_ENABLED;
  const activeRunInput = brandbookActiveRun?.input;
  const activePreferences = activeRunInput?.preferences ?? [];
  const activeLogoFileId = activeRunInput?.logoFileId ?? '';
  const brandbookLogoStatus = brandbookUsePlaceholder
    ? 'placeholder LOGO'
    : activeLogoFileId
      ? `ID: ${activeLogoFileId}`
      : brandbookLogoLink
        ? 'Ссылка из Документов'
        : 'не указан';
  const canSubmitBrandbook = Boolean(brandbookForm.projectId || organizationId);
  const isBrandbookSubmitDisabled =
    brandbookSubmitting || !canSubmitBrandbook || (orgLoading && !brandbookForm.projectId);
  const isBrandbookChatReady = Boolean(brandbookActiveRun);
  const canUploadFile = Boolean(
    brandbookActiveRun &&
      currentUserId &&
      (organizationId || brandbookActiveRun.input.projectId)
  );

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">AI-агенты</h1>
          <p className="text-sm text-neutral-400">
            Настраивайте агентов, роли и наборы инструментов для автоматизации.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-6 text-center text-sm text-neutral-400">
          Загрузка агентов...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {showBrandbookCard && (
            <ContentBlock
              as="article"
              interactive
              className="group flex flex-col cursor-pointer"
              onClick={openBrandbookModal}
            >
              <header className="mb-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-200 shrink-0">
                    AI
                  </span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300 shrink-0">
                    MVP
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-50 mb-1">Brandbook Agent</h3>
                <p className="text-sm text-neutral-400">
                  Генеративный брендбук мерча на основе логотипа
                </p>
                <p className="mt-2 text-sm text-neutral-400 line-clamp-2">
                  Один итоговый one-pager, водяной знак и контактный блок.
                </p>
              </header>

              <div className="mb-4">
                <p className="mb-1.5 text-xs font-medium text-neutral-400">Наборы</p>
                <div className="flex flex-wrap gap-1.5 text-xs text-neutral-500">
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-2 py-0.5">
                    merch_basic
                  </span>
                  <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-2 py-0.5">
                    office_basic
                  </span>
                </div>
              </div>

              <div className="mt-auto" onClick={(event) => event.stopPropagation()}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={openBrandbookModal}
                  className="w-full"
                >
                  Запустить
                </Button>
              </div>
            </ContentBlock>
          )}
          {filteredAgents.length === 0 && !showBrandbookCard ? (
            <div className="col-span-full rounded-xl border border-neutral-800 bg-neutral-950/40 p-6 text-center text-sm text-neutral-400">
              {activeTab === 'all' 
                ? 'Нет доступных AI-агентов' 
                : 'В этой категории пока нет агентов'}
            </div>
          ) : (
            filteredAgents.map((agent) => {
              if (!agent || !agent.id) {
                return null;
              }
              const agentProjectsList: ProjectInfo[] = Array.isArray(agentProjects[agent.id]) ? agentProjects[agent.id]! : [];
              return (
                <ContentBlock
                  key={agent.id}
                  as="article"
                  interactive
                  className="group flex flex-col cursor-pointer"
                  onClick={() => setViewingAgent(agent)}
                >
                  <header className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-200 shrink-0">
                          AI
                        </span>
                        {/* Scope badge */}
                        {agent.scope === 'personal' && (
                           <span className="text-[10px] text-neutral-500 border border-neutral-800 rounded px-1.5 py-0.5">Личный</span>
                        )}
                        {agent.scope === 'team' && (
                           <span className="text-[10px] text-blue-400 border border-blue-900/30 bg-blue-500/10 rounded px-1.5 py-0.5">Команда</span>
                        )}
                         {(agent.scope === 'public' || agent.isGlobal) && (
                           <span className="text-[10px] text-emerald-400 border border-emerald-900/30 bg-emerald-500/10 rounded px-1.5 py-0.5">Общий</span>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-neutral-50 mb-1">{agent.name}</h3>
                    
                    <p className="text-xs uppercase tracking-wide text-indigo-300">
                      {AGENT_TYPE_LABELS[agent.agentType]}
                    </p>
                    <p className="mt-1.5 text-sm text-neutral-400 line-clamp-2">
                      {agent.title}
                    </p>
                  </header>

                  <div className="mb-3 flex flex-wrap gap-1.5 text-xs text-neutral-500">
                    {agent.behavior?.autoRespond && (
                      <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-2 py-0.5">
                        ✓ Автоответы
                      </span>
                    )}
                    <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-2 py-0.5">
                      {agent.behavior?.responseStyle === 'detailed' ? 'Подробный' : 'Краткий'}
                    </span>
                  </div>

                  {/* Проекты, где используется агент */}
                  <div className="mb-3 min-h-[3rem]" onClick={(e) => e.stopPropagation()}>
                    {agentProjectsList.length > 0 ? (
                      <>
                        <p className="mb-1.5 text-xs font-medium text-neutral-400">В проектах:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {agentProjectsList.slice(0, 2).map((project: ProjectInfo) => (
                            <span
                              key={project.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/60 px-2 py-0.5 text-xs text-neutral-300"
                            >
                              {project.key}
                              <button
                                type="button"
                                onClick={() => void handleRemoveFromProject(agent.id, project.id)}
                                className="text-neutral-500 hover:text-neutral-200"
                                title="Удалить из проекта"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          {agentProjectsList.length > 2 && (
                            <span className="inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-900/60 px-2 py-0.5 text-xs text-neutral-400">
                              +{agentProjectsList.length - 2}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="h-0" aria-hidden="true" />
                    )}
                  </div>

                  {/* Добавить в проект */}
                  <div className="mt-auto space-y-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={selectedProjects[agent.id] || ''}
                      onChange={(e) => {
                        setSelectedProjects({ ...selectedProjects, [agent.id]: e.target.value });
                      }}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Добавить в проект...</option>
                      {projects
                        .filter((p) => !agentProjectsList.some((ap) => ap.id === p.id))
                        .map((project: ProjectInfo) => (
                          <option key={project.id} value={project.id}>
                            {project.key}: {project.name}
                          </option>
                        ))}
                    </select>
                    {selectedProjects[agent.id] && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const projectId = selectedProjects[agent.id];
                          if (projectId) {
                            void handleAddToProject(agent.id, projectId);
                            setSelectedProjects({ ...selectedProjects, [agent.id]: '' });
                          }
                        }}
                        className="w-full"
                      >
                        Добавить
                      </Button>
                    )}
                  </div>
                </ContentBlock>
              );
            })
          )}
        </div>
      )}

      {showBrandbookCard && (
        <Modal open={isBrandbookModalOpen} onOpenChange={setBrandbookModalOpen}>
          <ModalContent className="max-w-2xl">
            <form
              className="flex max-h-[85vh] flex-col"
              onSubmit={(event) => {
                event.preventDefault();
                void handleBrandbookRun();
              }}
            >
              <ModalHeader>
                <ModalTitle>Запуск Brandbook Agent</ModalTitle>
                <ModalDescription>
                  Стартовые настройки перед запуском. После старта откроется чат с агентом.
                </ModalDescription>
              </ModalHeader>
              <ModalBody className="flex-1 space-y-5 overflow-y-auto">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-neutral-100">Быстрый запуск</div>
                    <p className="text-xs text-neutral-500">
                      Опишите пожелания и выберите набор. Логотип добавите в чате после запуска.
                    </p>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-300">
                        Набор
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['merch_basic', 'office_basic'] as const).map((bundle) => (
                          <button
                            key={bundle}
                            type="button"
                            onClick={() =>
                              setBrandbookForm((prev) => ({ ...prev, productBundle: bundle }))
                            }
                            className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                              brandbookForm.productBundle === bundle
                                ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-200'
                                : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                            }`}
                          >
                            {bundle}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                      Пожелания
                    </label>
                    <Textarea
                      value={brandbookForm.preferences}
                      onChange={(event) =>
                        setBrandbookForm((prev) => ({ ...prev, preferences: event.target.value }))
                      }
                      rows={4}
                      className="bg-neutral-900 border-neutral-700"
                      placeholder="Например: минимализм, светлый фон, акцентный цвет..."
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                  <button
                    type="button"
                    onClick={() => setBrandbookAdvancedOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between text-sm font-medium text-neutral-200"
                  >
                    Дополнительные параметры
                    <span className="text-xs text-neutral-500">
                      {isBrandbookAdvancedOpen ? 'Скрыть' : 'Показать'}
                    </span>
                  </button>
                  {isBrandbookAdvancedOpen && (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-neutral-300">
                            Язык результата
                          </label>
                          <Input
                            value={brandbookForm.outputLanguage}
                            onChange={(event) =>
                              setBrandbookForm((prev) => ({ ...prev, outputLanguage: event.target.value }))
                            }
                            placeholder="ru / en / ..."
                            className="bg-neutral-900 border-neutral-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-neutral-300">
                            Текст водяного знака
                          </label>
                          <Input
                            value={brandbookForm.watermarkText}
                            onChange={(event) =>
                              setBrandbookForm((prev) => ({ ...prev, watermarkText: event.target.value }))
                            }
                            placeholder="Опционально"
                            className="bg-neutral-900 border-neutral-700"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300">
                          Контактный блок
                        </label>
                        <Input
                          value={brandbookForm.contactBlock}
                          onChange={(event) =>
                            setBrandbookForm((prev) => ({ ...prev, contactBlock: event.target.value }))
                          }
                          placeholder="Опционально"
                          className="bg-neutral-900 border-neutral-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-neutral-300">
                          Привязка к проекту/задаче
                        </div>
                        <p className="text-xs text-neutral-500">
                          Опционально: выберите проект, если хотите делиться историей с командой.
                        </p>
                        <div className="space-y-3">
                          <select
                            value={brandbookForm.projectId}
                            onChange={(event) => {
                              const nextProjectId = event.target.value;
                              setBrandbookForm((prev) => ({
                                ...prev,
                                projectId: nextProjectId,
                                ...(nextProjectId ? {} : { taskId: '' })
                              }));
                            }}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="">Без проекта (демо-режим)</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.key}: {project.name || project.key}
                              </option>
                            ))}
                          </select>
                          {brandbookForm.projectId && (
                            <Input
                              value={brandbookForm.taskId}
                              onChange={(event) =>
                                setBrandbookForm((prev) => ({ ...prev, taskId: event.target.value }))
                              }
                              placeholder="taskId (опционально)"
                              className="bg-neutral-900 border-neutral-700"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </ModalBody>
              <ModalFooter>
                <div className="mr-auto text-xs text-neutral-500">
                  Логотип можно добавить в чате. Привязка к проекту необязательна.
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setBrandbookModalOpen(false)}
                  type="button"
                  disabled={brandbookSubmitting}
                >
                  Закрыть
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isBrandbookSubmitDisabled}
                  loading={brandbookSubmitting}
                >
                  Запустить
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      )}

      {showBrandbookCard && (
        <Modal open={isBrandbookChatOpen} onOpenChange={setBrandbookChatOpen}>
          <ModalContent className="max-w-5xl h-[85vh]">
            <div className="flex h-full flex-col overflow-hidden md:flex-row">
              <aside className="flex w-full flex-col border-b border-neutral-800 bg-neutral-950/60 md:w-64 md:border-b-0 md:border-r md:max-h-none max-h-[35vh]">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Запуски
                  </div>
                  <Button variant="secondary" size="sm" onClick={openBrandbookModal}>
                    Новый
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-4">
                  {brandbookRunsLoading ? (
                    <div className="px-3 py-2 text-xs text-neutral-500">Загружаем историю...</div>
                  ) : brandbookRuns.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-neutral-500">
                      Запусков пока нет. Создайте первый.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {brandbookRuns.map((run) => {
                        const isActive = brandbookActiveRun?.id === run.id;
                        const projectLabel = run.projectId
                          ? projects.find((project) => project.id === run.projectId)?.key ?? 'Проект'
                          : '';
                        const runTitle = run.productBundle === 'merch_basic' ? 'Merch basic' : 'Office basic';

                        return (
                          <button
                            key={run.id}
                            type="button"
                            onClick={() => void loadBrandbookRun(run.id)}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                              isActive
                                ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-100'
                                : 'border-neutral-800 bg-neutral-900/40 text-neutral-300 hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                                {formatRunDate(run.createdAt)}
                              </div>
                              <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                                {run.status}
                              </span>
                            </div>
                            <div className="mt-1 text-sm font-medium text-neutral-100">{runTitle}</div>
                            {projectLabel && (
                              <div className="mt-1 text-[11px] text-neutral-500">Проект: {projectLabel}</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </aside>

              <section className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-4">
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">Brandbook Agent</div>
                    <div className="text-xs text-neutral-500">
                      {brandbookActiveRun
                        ? `runId ${brandbookActiveRun.id}`
                        : 'Выберите запуск слева или создайте новый'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {brandbookActiveRun && (
                      <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-300">
                        {brandbookActiveRun.status}
                      </span>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => setBrandbookChatOpen(false)}>
                      Закрыть
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {brandbookActiveLoading ? (
                    <div className="text-sm text-neutral-500">Загрузка запуска...</div>
                  ) : !brandbookActiveRun ? (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                      Создайте запуск, чтобы начать диалог с агентом.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-400">
                        <div className="flex flex-wrap gap-3">
                          <span>Набор: {brandbookActiveRun.input.productBundle}</span>
                          <span>Пожелания: {activePreferences.length}</span>
                          <span>Логотип: {brandbookLogoStatus}</span>
                          {brandbookActiveRun.input.projectId && (
                            <span>
                              Проект:{' '}
                              {projects.find((project) => project.id === brandbookActiveRun.input.projectId)?.key ||
                                'Проект'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-300">
                        <div>runId: {brandbookActiveRun.id}</div>
                        <div>status: {brandbookActiveRun.status}</div>
                        <div>pipelineType: {brandbookActiveRun.metadata?.pipelineType ?? '—'}</div>
                        <div>outputFormat: {brandbookActiveRun.metadata?.outputFormat ?? '—'}</div>
                        <div>previewFormat: {brandbookActiveRun.metadata?.previewFormat ?? '—'}</div>
                      </div>

                      <div className="space-y-4">
                        {brandbookChatMessages.length === 0 ? (
                          <div className="text-sm text-neutral-500">Сообщений пока нет.</div>
                        ) : (
                          brandbookChatMessages.map((message) => {
                            const isUser = message.role === 'user';
                            const isSystem = message.role === 'system';
                            return (
                              <div
                                key={message.id}
                                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                                    isUser
                                      ? 'bg-indigo-500/20 text-indigo-100'
                                      : isSystem
                                        ? 'bg-neutral-900/40 text-neutral-300'
                                        : 'bg-neutral-900/70 text-neutral-200'
                                  }`}
                                >
                                  {message.content}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-800 bg-neutral-950/40 px-6 py-4">
                  <div className="flex items-end gap-2">
                    <DropdownMenu open={isBrandbookActionsOpen} onOpenChange={setBrandbookActionsOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-10 w-10 rounded-full p-0"
                          disabled={!isBrandbookChatReady || brandbookActiveLoading}
                        >
                          +
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem
                          onClick={() => handleBrandbookChatAction('upload')}
                          disabled={!canUploadFile || brandbookUploadPending || brandbookActiveLoading}
                        >
                          {brandbookUploadPending ? 'Загрузка...' : 'Загрузить логотип'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleBrandbookChatAction('insert-id')}>
                          Вставить ID логотипа
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBrandbookChatAction('insert-link')}>
                          Вставить ссылку из Документов
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBrandbookChatAction('placeholder')}>
                          Сделать демо-мокап без логотипа
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Textarea
                      ref={brandbookChatInputRef}
                      value={brandbookChatInput}
                      onChange={(event) => setBrandbookChatInput(event.target.value)}
                      rows={2}
                      disabled={!isBrandbookChatReady || brandbookActiveLoading}
                      className="min-h-[56px] flex-1 resize-none bg-neutral-900/60 border-neutral-800"
                      placeholder={
                        isBrandbookChatReady
                          ? 'Напишите сообщение агенту...'
                          : 'Выберите запуск, чтобы начать диалог.'
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleBrandbookChatSend();
                        }
                      }}
                    />

                    <Button
                      variant="primary"
                      onClick={handleBrandbookChatSend}
                      disabled={!isBrandbookChatReady || brandbookActiveLoading}
                    >
                      Отправить
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] text-neutral-500">
                    Логотип не обязателен: можно продолжить диалог и вернуться к нему позже.
                  </p>
                </div>

                <input
                  ref={brandbookFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!canUploadFile || brandbookUploadPending}
                  onChange={handleBrandbookFileSelect}
                />
              </section>
            </div>
          </ModalContent>
        </Modal>
      )}

      {/* Модальное окно просмотра/редактирования агента */}
      {viewingAgent && (
        <Modal open={!!viewingAgent} onOpenChange={(open) => !open && setViewingAgent(null)}>
          <ModalContent className="max-w-3xl">
            <ModalHeader>
              <ModalTitle>{viewingAgent.name}</ModalTitle>
              <ModalDescription>
                {viewingAgent.title} • {AGENT_TYPE_LABELS[viewingAgent.agentType]}
              </ModalDescription>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-6">
                {/* Основная информация */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-neutral-200">Описание</h4>
                  <p className="text-sm text-neutral-400">{AGENT_TYPE_DESCRIPTIONS[viewingAgent.agentType]}</p>
                </div>
                
                {/* Scope info */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-neutral-200">Доступ</h4>
                  <div className="text-sm text-neutral-400">
                     {viewingAgent.scope === 'personal' && 'Личный агент (видите только вы)'}
                     {viewingAgent.scope === 'team' && 'Доступен команде'}
                     {(viewingAgent.scope === 'public' || viewingAgent.isGlobal) && 'Общедоступный агент'}
                     {!viewingAgent.scope && !viewingAgent.isGlobal && 'Общедоступный (legacy)'}
                  </div>
                </div>

                {/* Поведение */}
                {viewingAgent.behavior && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-neutral-200">Поведение</h4>
                    <div className="space-y-2 text-sm text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span>Автоответы:</span>
                        <span className={viewingAgent.behavior.autoRespond ? 'text-emerald-400' : 'text-neutral-500'}>
                          {viewingAgent.behavior.autoRespond ? 'Включены' : 'Выключены'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Стиль ответов:</span>
                        <span className="text-neutral-300">
                          {viewingAgent.behavior.responseStyle === 'detailed' ? 'Подробный' : 'Краткий'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Проекты */}
                {agentProjects[viewingAgent.id] && agentProjects[viewingAgent.id]!.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-neutral-200">
                      Используется в проектах ({agentProjects[viewingAgent.id]!.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {agentProjects[viewingAgent.id]!.map((project: ProjectInfo) => (
                        <div
                          key={project.id}
                          className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-sm"
                        >
                          <span className="text-neutral-300">
                            {project.key}: {project.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              void handleRemoveFromProject(viewingAgent.id, project.id);
                            }}
                            className="text-neutral-500 hover:text-neutral-200"
                            title="Удалить из проекта"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Добавить в проект */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-neutral-200">Добавить в проект</h4>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedProjects[viewingAgent.id] || ''}
                      onChange={(e) => {
                        setSelectedProjects({ ...selectedProjects, [viewingAgent.id]: e.target.value });
                      }}
                      className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Выберите проект...</option>
                      {projects
                        .filter((p) => !(agentProjects[viewingAgent.id] || []).some((ap) => ap.id === p.id))
                        .map((project: ProjectInfo) => (
                          <option key={project.id} value={project.id}>
                            {project.key}: {project.name}
                          </option>
                        ))}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const projectId = selectedProjects[viewingAgent.id];
                        if (projectId) {
                          void handleAddToProject(viewingAgent.id, projectId);
                          setSelectedProjects({ ...selectedProjects, [viewingAgent.id]: '' });
                        }
                      }}
                      disabled={!selectedProjects[viewingAgent.id]}
                    >
                      Добавить
                    </Button>
                  </div>
                </div>

                {/* Шаблоны ответов */}
                {viewingAgent.responseTemplates && viewingAgent.responseTemplates.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-neutral-200">
                      Шаблоны ответов ({viewingAgent.responseTemplates.length})
                    </h4>
                    <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                      {viewingAgent.responseTemplates.map((template, idx) => (
                        <div key={idx} className="text-sm text-neutral-400">
                          • {template}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => setViewingAgent(null)}
              >
                Закрыть
              </Button>
              {isAdmin && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleEditAgent(viewingAgent);
                    setViewingAgent(null);
                  }}
                >
                  Редактировать
                </Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Модальное окно редактирования агента */}
      {editingAgent && (
        <Modal open={!!editingAgent} onOpenChange={(open) => !open && setEditingAgent(null)}>
          <ModalContent className="max-w-2xl">
            <ModalHeader>
              <ModalTitle>Редактировать агента: {editingAgent.name}</ModalTitle>
              <ModalDescription>
                Измените настройки агента. Изменения вступят в силу сразу после сохранения.
              </ModalDescription>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Название
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Название агента"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Описание
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Описание роли агента"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Шаблоны ответов (по одному на строку)
                  </label>
                  <Textarea
                    value={editForm.responseTemplates}
                    onChange={(e) => setEditForm({ ...editForm, responseTemplates: e.target.value })}
                    rows={6}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Принял к сведению. Продолжаю работу.&#10;Понял задачу. Начинаю выполнение."
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Каждая строка будет использоваться как отдельный шаблон ответа
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.autoRespond}
                      onChange={(e) => setEditForm({ ...editForm, autoRespond: e.target.checked })}
                      className="h-4 w-4 rounded border-neutral-800 bg-neutral-900/60 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-neutral-300">Автоматически отвечать на упоминания</span>
                  </label>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-300">
                      Стиль ответов
                    </label>
                    <select
                      value={editForm.responseStyle}
                      onChange={(e) => setEditForm({ ...editForm, responseStyle: e.target.value as 'short' | 'detailed' })}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="short">Краткий</option>
                      <option value="detailed">Подробный</option>
                    </select>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => setEditingAgent(null)}
                disabled={saving}
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAgent}
                disabled={saving || !editForm.name.trim()}
                loading={saving}
              >
                Сохранить
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </section>
  );
}
