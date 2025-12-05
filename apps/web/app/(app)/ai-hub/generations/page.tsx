'use client';

import React, { useState } from 'react';
import AppSection from '@/components/app/AppSection';
import { ConfigureModelModal } from '@/components/ai-hub/ConfigureModelModal';
import { StartGenerationModal } from '@/components/ai-hub/StartGenerationModal';
import { GenerationCard, GenerationTask } from '@/components/ai-hub/GenerationCard';
import { GenerationResultViewer } from '@/components/ai-hub/GenerationResultViewer';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

export default function AiGenerationsPage() {
  const [configureOpen, setConfigureOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GenerationTask | null>(null);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);

  type GenerationType = 'generate-structure' | 'generate-subtasks' | 'analyze-workload';
  type GenerationData = {
    projectName?: string;
    description?: string;
    taskTitle?: string;
    taskDescription?: string;
    teamSize?: number;
    deadline?: string;
    preferences?: Record<string, unknown>;
    tasks?: unknown[];
    members?: unknown[];
  };

  const handleStartGeneration = async (type: string, data: GenerationData) => {
    // Безопасно: провайдер выбирается на клиенте, но ключи хранятся на сервере
    const provider = localStorage.getItem('ai_provider') || 'openai';

    const newTask: GenerationTask = {
      id: nanoid(),
      type: type as GenerationType,
      status: 'loading',
      createdAt: new Date(),
      title: data.projectName || data.taskTitle || 'Анализ загруженности',
    };

    setTasks(prev => [newTask, ...prev]);

    try {
      // Безопасно: ключи НЕ отправляются с клиента, используются на сервере из .env.local
      const requestBody: {
        action: string;
        provider: string;
        data: GenerationData;
      } = {
        action: type,
        provider, // Только провайдер, без ключей
        data
      };

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData?.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();

      setTasks(prev => prev.map(t =>
        t.id === newTask.id
          ? { ...t, status: 'success', result: result.result }
          : t
      ));
      toast.success('Генерация успешно завершена');

    } catch (error: unknown) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setTasks(prev => prev.map(t =>
        t.id === newTask.id
          ? { ...t, status: 'error', error: errorMessage }
          : t
      ));
      toast.error(`Ошибка: ${errorMessage}`);
    }
  };

  const handleViewResult = (task: GenerationTask) => {
    setSelectedTask(task);
    setResultOpen(true);
  };

  return (
    <>
      <AppSection
        title="AI-генерации"
        description="Следите за статусом генераций и делитесь результатами с командой."
        actions={[
          {
            label: 'Запустить генерацию',
            onClick: () => setStartOpen(true)
          },
          {
            label: 'Настроить модель',
            onClick: () => setConfigureOpen(true)
          }
        ]}
      >
        <div className="space-y-6">
          {tasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-medium text-muted-foreground">Нет активных генераций</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Нажмите &quot;Запустить генерацию&quot;, чтобы создать новый проект или задачу с помощью AI.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map(task => (
                <GenerationCard
                  key={task.id}
                  task={task}
                  onViewResult={handleViewResult}
                />
              ))}
            </div>
          )}
        </div>
      </AppSection>

      <ConfigureModelModal
        open={configureOpen}
        onOpenChange={setConfigureOpen}
      />

      <StartGenerationModal
        open={startOpen}
        onOpenChange={setStartOpen}
        onStart={handleStartGeneration}
      />

      <GenerationResultViewer
        task={selectedTask}
        open={resultOpen}
        onOpenChange={setResultOpen}
      />
    </>
  );
}
