import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalClose } from '@/components/ui/modal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenerationTask } from './GenerationCard';
import { Badge } from '@/components/ui/badge';

interface GenerationResultViewerProps {
    task: GenerationTask | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GenerationResultViewer({ task, open, onOpenChange }: GenerationResultViewerProps) {
    if (!task || !task.result) return null;

    const renderContent = () => {
        if (task.type === 'generate-structure') {
            const structure = task.result;
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-sm font-medium text-muted-foreground">Оценка времени</div>
                            <div className="text-2xl font-bold">{structure.estimatedTotalDays} дней</div>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-sm font-medium text-muted-foreground">Команда</div>
                            <div className="text-2xl font-bold">{structure.suggestedTeamSize} чел.</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Этапы проекта</h3>
                        {structure.phases?.map((phase: any, i: number) => (
                            <div key={i} className="border rounded-lg p-4">
                                <h4 className="font-medium text-base mb-1">{phase.name}</h4>
                                <p className="text-sm text-muted-foreground mb-3">{phase.description}</p>
                                <div className="space-y-2 pl-4 border-l-2 border-muted">
                                    {phase.tasks?.map((t: any, j: number) => (
                                        <div key={j} className="text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{t.title}</span>
                                                <Badge className="text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80">{t.estimatedDays} дн</Badge>
                                                <Badge className={`text-xs ${t.priority === 'high' ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                                                    {t.priority}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground text-xs mt-0.5">{t.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {structure.recommendations && (
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">Рекомендации</h3>
                            <ul className="list-disc list-inside text-sm space-y-1">
                                {structure.recommendations.map((rec: string, i: number) => (
                                    <li key={i}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }

        if (task.type === 'generate-subtasks') {
            return (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Сгенерированные подзадачи</h3>
                    <div className="space-y-3">
                        {task.result.map((subtask: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                                <div className="mt-1 h-5 w-5 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    {i + 1}
                                </div>
                                <div>
                                    <h4 className="font-medium">{subtask.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{subtask.description}</p>
                                    <div className="mt-2">
                                        <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary/80">{subtask.estimatedHours} ч</Badge>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (task.type === 'analyze-workload') {
            const analysis = task.result;
            return (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Загруженность команды</h3>
                        <div className="space-y-3">
                            {analysis.members?.map((member: any, i: number) => (
                                <div key={i} className="p-3 border rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium">{member.userName}</span>
                                        <Badge className={
                                            member.overloadLevel === 'critical' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                                member.overloadLevel === 'high' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                                                    member.overloadLevel === 'low' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                        }>
                                            {member.overloadLevel === 'critical' ? 'Критическая' :
                                                member.overloadLevel === 'high' ? 'Высокая' :
                                                    member.overloadLevel === 'medium' ? 'Средняя' : 'Низкая'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                                        <div>Задач: {member.activeTasks}</div>
                                        <div>Часов: {member.estimatedHours}</div>
                                        <div>Дедлайнов: {member.upcomingDeadlines}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {analysis.recommendations && (
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">Рекомендации AI</h3>
                            <ul className="list-disc list-inside text-sm space-y-1">
                                {analysis.recommendations.map((rec: string, i: number) => (
                                    <li key={i}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }

        return <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">{JSON.stringify(task.result, null, 2)}</pre>;
    };

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <ModalContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <ModalHeader>
                    <ModalTitle>{task.title}</ModalTitle>
                    <ModalDescription>Результат генерации</ModalDescription>
                    <ModalClose onClick={() => onOpenChange(false)} />
                </ModalHeader>

                <ModalBody className="flex-1 overflow-hidden p-0">
                    <Tabs defaultValue="visual" className="h-full flex flex-col">
                        <div className="px-6 pt-2">
                            <TabsList>
                                <TabsTrigger value="visual">Визуализация</TabsTrigger>
                                <TabsTrigger value="json">JSON</TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1 p-6">
                            <TabsContent value="visual" className="mt-0">
                                {renderContent()}
                            </TabsContent>
                            <TabsContent value="json" className="mt-0">
                                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs font-mono">
                                    {JSON.stringify(task.result, null, 2)}
                                </pre>
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
