'use client';

import Image from 'next/image';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { MarketplaceTemplate } from '@/lib/marketplace/types';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import { getTemplateById } from '@/lib/marketplace/data';
import TemplatePurchaseActions from './TemplatePurchaseActions';
import TemplateFileList from './TemplateFileList';
import TemplateMetaGrid from './TemplateMetaGrid';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

export default function TemplateDetailModal() {
  const selectedTemplateId = useMarketplaceStore((state) => state.selectedTemplateId);
  const closeTemplateDetail = useMarketplaceStore((state) => state.closeTemplateDetail);
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const template = selectedTemplateId ? getTemplateById(selectedTemplateId) : null;
  const isOpen = !!selectedTemplateId;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeTemplateDetail();
      }
    },
    [closeTemplateDetail]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!mounted || !template || !isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={cn(
          'absolute inset-0 bg-[color:var(--surface-overlay)] backdrop-blur-sm transition-opacity duration-200 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
        onClick={closeTemplateDetail}
      />
      <div className="relative z-10 flex h-full w-full items-center justify-center px-[72px] py-6 lg:px-[88px] lg:py-8">
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'relative flex max-h-full w-full flex-col overflow-hidden rounded-3xl border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-popover)] shadow-[0_28px_68px_-28px_rgba(15,23,42,0.9)] outline-none transition-all duration-200 ease-out',
            isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
          )}
        >
          <button
            type="button"
            onClick={closeTemplateDetail}
            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] transition-colors duration-200 hover:border-[color:var(--surface-border-strong)] hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent-border-strong)]"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">Закрыть модальное окно</span>
          </button>
          <div className="overflow-y-auto">
            <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-12 xl:p-8">
          <section className="space-y-6">
            <header className="space-y-3">
              <h1 className="text-2xl font-semibold text-neutral-50">{template.title}</h1>
              <p className="text-sm text-neutral-400">{template.description}</p>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              {template.gallery.map((image) => (
                <div
                  key={image}
                  className="relative aspect-video overflow-hidden rounded-2xl border border-neutral-800/80"
                >
                  <Image
                    src={image}
                    alt={template.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1280px) 480px, 100vw"
                  />
                </div>
              ))}
            </div>
            <TemplateMetaGrid template={template} />
            <ContentBlock
              as="section"
              header={<ContentBlockTitle>Описание</ContentBlockTitle>}
            >
              <p className="text-neutral-300">{template.description}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-400">
                {template.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </ContentBlock>
            <TemplateFileList files={template.files} />
          </section>
          <ContentBlock as="aside" size="sm" className="space-y-6">
            <TemplatePurchaseActions template={template} />
            <div className="space-y-3 text-sm text-neutral-400">
              <p>
                После оплаты шаблон появится в ваших заказах. Файлы будут доступны по защищённым ссылкам в течение 72
                часов.
              </p>
              <p>
                Для совместной работы можно добавить шаблон в существующий проект и поделиться доступом с командой.
              </p>
            </div>
          </ContentBlock>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

