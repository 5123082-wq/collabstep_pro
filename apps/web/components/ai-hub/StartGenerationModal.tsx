import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalClose } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface StartGenerationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStart: (type: string, data: any) => void;
}

export function StartGenerationModal({ open, onOpenChange, onStart }: StartGenerationModalProps) {
    const [type, setType] = useState('generate-structure');
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [taskTitle, setTaskTitle] = useState('');

    const handleSubmit = () => {
        if (type === 'generate-structure' && !description) {
            toast.error('Описание проекта обязательно');
            return;
        }
        if (type === 'generate-subtasks' && !taskTitle) {
            toast.error('Название задачи обязательно');
            return;
        }

        const data: any = {};
        if (type === 'generate-structure') {
            data.projectName = projectName;
            data.description = description;
        } else if (type === 'generate-subtasks') {
            data.taskTitle = taskTitle;
            data.taskDescription = description;
        }

        onStart(type, data);
        onOpenChange(false);
        // Reset form
        setProjectName('');
        setDescription('');
        setTaskTitle('');
    };

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <ModalContent className="max-w-lg">
                <ModalHeader>
                    <ModalTitle>Запустить AI генерацию</ModalTitle>
                    <ModalClose onClick={() => onOpenChange(false)} />
                </ModalHeader>
                <ModalBody>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <FormLabel>Тип генерации</FormLabel>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="generate-structure">Планирование проекта</SelectItem>
                                    <SelectItem value="generate-subtasks">Генерация подзадач</SelectItem>
                                    <SelectItem value="analyze-workload">Анализ загруженности (Демо)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {type === 'generate-structure' && (
                            <>
                                <div className="grid gap-2">
                                    <FormLabel>Название проекта (опционально)</FormLabel>
                                    <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Например: Новый веб-сайт" />
                                </div>
                                <div className="grid gap-2">
                                    <FormLabel>Описание проекта</FormLabel>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Опишите цели, требования и основные этапы..."
                                        className="min-h-[100px]"
                                    />
                                </div>
                            </>
                        )}

                        {type === 'generate-subtasks' && (
                            <>
                                <div className="grid gap-2">
                                    <FormLabel>Название задачи</FormLabel>
                                    <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Например: Разработать страницу входа" />
                                </div>
                                <div className="grid gap-2">
                                    <FormLabel>Описание задачи (опционально)</FormLabel>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Дополнительный контекст..."
                                    />
                                </div>
                            </>
                        )}

                        {type === 'analyze-workload' && (
                            <div className="text-sm text-muted-foreground">
                                В демо-режиме будет использован набор тестовых данных для демонстрации анализа загруженности.
                            </div>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={handleSubmit}>Запустить</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
