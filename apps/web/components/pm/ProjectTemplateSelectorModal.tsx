'use client';

import { useEffect, useState } from 'react';
// @ts-ignore
import { Check, FileText, Globe, Megaphone, Palette, Sparkles } from 'lucide-react';
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle
} from '@/components/ui/modal';
import { cn } from '@/lib/utils';

export type ProjectTemplate = {
  id: string;
  title: string;
  kind: string;
  summary: string;
};

type ProjectTemplateSelectorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: ProjectTemplate | null) => void;
};

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  product: FileText,
  brand: Palette,
  landing: Globe,
  marketing: Megaphone,
  default: Sparkles
};

const KIND_LABELS: Record<string, string> = {
  product: 'Продукт',
  brand: 'Бренд',
  landing: 'Лендинг',
  marketing: 'Маркетинг'
};

const KIND_COLORS: Record<string, string> = {
  product: 'indigo',
  brand: 'purple',
  landing: 'emerald',
  marketing: 'orange'
};

export default function ProjectTemplateSelectorModal({
  open,
  onOpenChange,
  onSelect
}: ProjectTemplateSelectorModalProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedTemplate(null);
      return;
    }

    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/templates');
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await response.json();
        setTemplates(data.items || []);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchTemplates();
  }, [open]);

  const handleSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
  };

  const handleApply = () => {
    onSelect(selectedTemplate);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onSelect(null);
    onOpenChange(false);
  };

  const getKindIcon = (kind: string): React.ComponentType<{ className?: string }> => {
    return KIND_ICONS[kind] ?? KIND_ICONS.default!;
  };

  const getKindColor = (kind: string) => {
    return KIND_COLORS[kind] || 'indigo';
  };

  const getKindLabel = (kind: string) => {
    return KIND_LABELS[kind] || kind;
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colorMap: Record<string, { border: string; bg: string; text: string; bgIcon: string; textIcon: string }> = {
      indigo: {
        border: isSelected ? 'border-indigo-500/60' : 'border-neutral-900',
        bg: isSelected ? 'bg-indigo-500/10' : 'bg-neutral-950/60',
        text: isSelected ? 'text-indigo-300' : 'text-neutral-400',
        bgIcon: isSelected ? 'bg-indigo-500/20' : 'bg-neutral-900',
        textIcon: isSelected ? 'text-indigo-300' : 'text-neutral-400'
      },
      purple: {
        border: isSelected ? 'border-purple-500/60' : 'border-neutral-900',
        bg: isSelected ? 'bg-purple-500/10' : 'bg-neutral-950/60',
        text: isSelected ? 'text-purple-300' : 'text-neutral-400',
        bgIcon: isSelected ? 'bg-purple-500/20' : 'bg-neutral-900',
        textIcon: isSelected ? 'text-purple-300' : 'text-neutral-400'
      },
      emerald: {
        border: isSelected ? 'border-emerald-500/60' : 'border-neutral-900',
        bg: isSelected ? 'bg-emerald-500/10' : 'bg-neutral-950/60',
        text: isSelected ? 'text-emerald-300' : 'text-neutral-400',
        bgIcon: isSelected ? 'bg-emerald-500/20' : 'bg-neutral-900',
        textIcon: isSelected ? 'text-emerald-300' : 'text-neutral-400'
      },
      orange: {
        border: isSelected ? 'border-orange-500/60' : 'border-neutral-900',
        bg: isSelected ? 'bg-orange-500/10' : 'bg-neutral-950/60',
        text: isSelected ? 'text-orange-300' : 'text-neutral-400',
        bgIcon: isSelected ? 'bg-orange-500/20' : 'bg-neutral-900',
        textIcon: isSelected ? 'text-orange-300' : 'text-neutral-400'
      }
    };
    return colorMap[color] || colorMap.indigo!;
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-5xl">
        <ModalHeader>
          <ModalTitle>Выбор шаблона проекта</ModalTitle>
          <ModalDescription>
            Выберите шаблон, чтобы автоматически заполнить основные данные проекта. Вы можете изменить их позже.
          </ModalDescription>
          <ModalClose />
        </ModalHeader>

        <ModalBody className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-neutral-400">Загрузка шаблонов...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="mb-4 h-12 w-12 text-neutral-600" />
              <p className="text-sm text-neutral-400">Шаблоны не найдены</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => {
                  const Icon = getKindIcon(template.kind);
                  const color = getKindColor(template.kind);
                  const isSelected = selectedTemplate?.id === template.id;
                  const colorClasses = getColorClasses(color, isSelected);

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelect(template)}
                      className={cn(
                        'group relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-all',
                        colorClasses.border,
                        colorClasses.bg,
                        !isSelected && 'hover:border-indigo-500/40 hover:bg-neutral-950/80',
                        isSelected && 'shadow-lg'
                      )}
                    >
                      {isSelected && (
                        <div
                          className={cn(
                            'absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full',
                            colorClasses.bgIcon,
                            colorClasses.textIcon
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                      )}

                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-xl',
                          colorClasses.bgIcon,
                          colorClasses.textIcon,
                          !isSelected && 'group-hover:text-indigo-400'
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{template.title}</h3>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              isSelected ? cn(colorClasses.bgIcon, colorClasses.textIcon) : 'bg-neutral-900 text-neutral-500'
                            )}
                          >
                            {getKindLabel(template.kind)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">{template.summary}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedTemplate && (
                <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    {(() => {
                      const Icon = getKindIcon(selectedTemplate.kind);
                      const color = getKindColor(selectedTemplate.kind);
                      const colorClasses = getColorClasses(color, true);
                      return (
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colorClasses.bgIcon, colorClasses.textIcon)}>
                          <Icon className="h-5 w-5" />
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-base font-semibold text-white">{selectedTemplate.title}</h3>
                      <p className="text-xs text-neutral-400">{getKindLabel(selectedTemplate.kind)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-300">{selectedTemplate.summary}</p>
                  <div className="mt-4 rounded-lg border border-neutral-900 bg-neutral-950/50 p-3">
                    <p className="text-xs text-neutral-400">
                      При применении шаблона будут заполнены название и описание проекта. Вы сможете изменить их в
                      любой момент.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-neutral-900 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-indigo-500/40 hover:text-white"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!selectedTemplate}
            className={cn(
              'rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition',
              selectedTemplate
                ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-100 hover:border-indigo-400 hover:bg-indigo-500/25'
                : 'border-neutral-900 bg-neutral-950/60 text-neutral-600 cursor-not-allowed'
            )}
          >
            Применить шаблон
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

