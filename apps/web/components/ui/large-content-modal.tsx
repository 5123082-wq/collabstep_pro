'use client';

import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type LargeContentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function LargeContentModal({
  isOpen,
  onClose,
  children,
  className,
  contentClassName
}: LargeContentModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

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
        onClose();
      }
    },
    [onClose]
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

  if (!mounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center', className)}>
      <div
        className={cn(
          'absolute inset-0 bg-[color:var(--surface-overlay)] backdrop-blur-sm transition-opacity duration-200 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full w-full items-center justify-center px-[72px] py-6 lg:px-[88px] lg:py-8">
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'relative flex max-h-full w-full flex-col overflow-hidden rounded-3xl border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-popover)] shadow-[0_28px_68px_-28px_rgba(15,23,42,0.9)] outline-none transition-all duration-200 ease-out',
            isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95',
            contentClassName
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] transition-colors duration-200 hover:border-[color:var(--surface-border-strong)] hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent-border-strong)]"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">Закрыть модальное окно</span>
          </button>
          <div className="overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

