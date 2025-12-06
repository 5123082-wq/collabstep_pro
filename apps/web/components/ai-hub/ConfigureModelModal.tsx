import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalClose } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ConfigureModelModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ConfigureModelModal({ open, onOpenChange }: ConfigureModelModalProps) {
    const [provider, setProvider] = useState<'openai' | 'yandex'>('openai');

    useEffect(() => {
        if (open) {
            const storedProvider = localStorage.getItem('ai_provider') as 'openai' | 'yandex' || 'openai';
            setProvider(storedProvider);
        }
    }, [open]);

    const handleSave = () => {
        // Безопасно: сохраняем только выбор провайдера, ключи хранятся на сервере в .env.local
        localStorage.setItem('ai_provider', provider);
        toast.success('Провайдер выбран. API ключи настраиваются в файле apps/web/.env.local');
        onOpenChange(false);
    };

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <ModalContent className="max-w-md">
                <ModalHeader>
                    <ModalTitle>Настройка модели AI</ModalTitle>
                    <ModalClose onClick={() => onOpenChange(false)} />
                </ModalHeader>
                <ModalBody>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <FormLabel>Провайдер AI</FormLabel>
                            <Select value={provider} onValueChange={(v) => setProvider(v as 'openai' | 'yandex')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="yandex">Yandex Cloud AI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="rounded-lg border p-4 bg-muted/50">
                            <h4 className="font-medium mb-2">🔒 Безопасное хранение ключей</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                                API ключи настраиваются на сервере в файле <code className="text-xs bg-background px-1 py-0.5 rounded">apps/web/.env.local</code>
                            </p>
                            <div className="text-xs space-y-1">
                                {provider === 'openai' ? (
                                    <>
                                        <p><strong>OpenAI:</strong></p>
                                        <code className="block bg-background p-2 rounded mt-1">OPENAI_API_KEY=sk-proj-...</code>
                                    </>
                                ) : (
                                    <>
                                        <p><strong>Yandex Cloud:</strong></p>
                                        <code className="block bg-background p-2 rounded mt-1">YANDEX_API_KEY=AQVN...<br/>YANDEX_FOLDER_ID=b1g...<br/>YANDEX_MODEL_URI=yandexgpt/latest</code>
                                    </>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                                ⚠️ Ключи никогда не хранятся в браузере для безопасности
                            </p>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={handleSave}>Сохранить</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
