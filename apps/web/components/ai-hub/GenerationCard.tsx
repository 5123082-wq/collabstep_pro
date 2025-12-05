import React from 'react';
import { ContentBlock } from '@/components/ui/content-block';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// @ts-expect-error lucide-react icon types
import { Loader2, CheckCircle, X, FileText, ListTodo, BarChart4 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface GenerationTask {
    id: string;
    type: 'generate-structure' | 'generate-subtasks' | 'analyze-workload';
    status: 'pending' | 'loading' | 'success' | 'error';
    createdAt: Date;
    title: string;
    result?: any;
    error?: string;
}

interface GenerationCardProps {
    task: GenerationTask;
    onViewResult: (task: GenerationTask) => void;
}

export function GenerationCard({ task, onViewResult }: GenerationCardProps) {
    const getIcon = () => {
        switch (task.type) {
            case 'generate-structure': return <FileText className="h-5 w-5" />;
            case 'generate-subtasks': return <ListTodo className="h-5 w-5" />;
            case 'analyze-workload': return <BarChart4 className="h-5 w-5" />;
            default: return <FileText className="h-5 w-5" />;
        }
    };

    const getStatusBadge = () => {
        switch (task.status) {
            case 'loading':
                return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Генерируется</Badge>;
            case 'success':
                return <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"><CheckCircle className="mr-1 h-3 w-3" /> Готово</Badge>;
            case 'error':
                return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"><X className="mr-1 h-3 w-3" /> Ошибка</Badge>;
            default:
                return <Badge className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100">Ожидание</Badge>;
        }
    };

    const getTypeLabel = () => {
        switch (task.type) {
            case 'generate-structure': return 'Структура проекта';
            case 'generate-subtasks': return 'Подзадачи';
            case 'analyze-workload': return 'Анализ загрузки';
            default: return task.type;
        }
    };

    return (
        <ContentBlock>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md text-muted-foreground">
                        {getIcon()}
                    </div>
                    <div>
                        <h3 className="text-base font-semibold">{task.title}</h3>
                        <p className="text-xs text-muted-foreground">
                            {getTypeLabel()} • {formatDistanceToNow(task.createdAt, { addSuffix: true, locale: ru })}
                        </p>
                    </div>
                </div>
                {getStatusBadge()}
            </div>

            <div className="mb-4">
                {task.error && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                        {task.error}
                    </p>
                )}
                {task.status === 'success' && (
                    <p className="text-sm text-muted-foreground">
                        Генерация успешно завершена. Нажмите кнопку ниже, чтобы просмотреть результат.
                    </p>
                )}
                {task.status === 'loading' && (
                    <p className="text-sm text-muted-foreground">
                        AI анализирует данные и готовит ответ...
                    </p>
                )}
            </div>

            {task.status === 'success' && (
                <Button variant="secondary" className="w-full" onClick={() => onViewResult(task)}>
                    Просмотреть результат
                </Button>
            )}
        </ContentBlock>
    );
}
