'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';
import { Sparkles, MessageSquare } from 'lucide-react';

type TaskAIActionsProps = {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  onDescriptionGenerated?: (description: string) => void;
  onChecklistGenerated?: (checklist: string) => void;
  onCommentsSummarized?: (summary: string) => void;
  className?: string;
  variant?: 'inline' | 'dropdown';
};

/**
 * Компонент AI действий для задач
 * 
 * Предоставляет кнопки для:
 * - Генерации описания задачи
 * - Генерации чек-листа
 * - Суммирования комментариев
 */
export default function TaskAIActions({
  taskId,
  taskTitle,
  projectId,
  onDescriptionGenerated,
  onCommentsSummarized,
  className,
  variant = 'inline'
}: TaskAIActionsProps) {
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [summarizingComments, setSummarizingComments] = useState(false);

  /**
   * Генерация описания задачи через AI
   */
  const handleGenerateDescription = async () => {
    setGeneratingDescription(true);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle,
          projectId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate description');
      }

      const data = await response.json();
      
      if (onDescriptionGenerated) {
        onDescriptionGenerated(data.description);
      }

      toast('Описание успешно сгенерировано', 'success');
    } catch (error) {
      console.error('Failed to generate description:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('AI_NOT_CONFIGURED')) {
          toast('AI не настроен. Обратитесь к администратору.', 'warning');
        } else if (error.message.includes('AI_RATE_LIMIT')) {
          toast('Превышен лимит запросов AI. Попробуйте позже.', 'warning');
        } else {
          toast('Ошибка генерации описания', 'warning');
        }
      } else {
        toast('Ошибка генерации описания', 'warning');
      }
    } finally {
      setGeneratingDescription(false);
    }
  };

  /**
   * Суммирование комментариев через AI
   */
  const handleSummarizeComments = async () => {
    setSummarizingComments(true);
    try {
      const response = await fetch('/api/ai/summarize-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to summarize comments');
      }

      const data = await response.json();
      
      if (onCommentsSummarized) {
        onCommentsSummarized(data.summary);
      }

      toast(`Суммировано ${data.commentsCount} комментариев`, 'success');
    } catch (error) {
      console.error('Failed to summarize comments:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('AI_NOT_CONFIGURED')) {
          toast('AI не настроен. Обратитесь к администратору.', 'warning');
        } else if (error.message.includes('AI_RATE_LIMIT')) {
          toast('Превышен лимит запросов AI. Попробуйте позже.', 'warning');
        } else if (error.message.includes('NOT_FOUND')) {
          toast('Задача не найдена', 'warning');
        } else if (error.message.includes('ACCESS_DENIED')) {
          toast('Нет доступа к этому проекту', 'warning');
        } else {
          toast('Ошибка суммирования комментариев', 'warning');
        }
      } else {
        toast('Ошибка суммирования комментариев', 'warning');
      }
    } finally {
      setSummarizingComments(false);
    }
  };

  const isAnyActionInProgress = 
    generatingDescription || summarizingComments;

  if (variant === 'inline') {
    return (
      <div className={className}>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleGenerateDescription}
            disabled={isAnyActionInProgress}
            variant="secondary"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generatingDescription ? 'Генерация...' : 'Сгенерировать описание'}
          </Button>

          <Button
            onClick={handleSummarizeComments}
            disabled={isAnyActionInProgress}
            variant="secondary"
            size="sm"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {summarizingComments ? 'Суммирование...' : 'Суммировать комментарии'}
          </Button>
        </div>
      </div>
    );
  }

  // Dropdown variant (для будущей реализации)
  return (
    <div className={className}>
      <Button
        onClick={handleGenerateDescription}
        disabled={isAnyActionInProgress}
        variant="ghost"
        size="sm"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        AI Помощник
      </Button>
    </div>
  );
}

