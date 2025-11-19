'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelId: string | null;
  descriptionId: string | null;
  setLabelId: (id: string | null) => void;
  setDescriptionId: (id: string | null) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext(component: string) {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error(`${component} должен использоваться внутри <Modal />`);
  }
  return context;
}

type ModalProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function Modal({ children, open, onOpenChange }: ModalProps) {
  const [labelId, setLabelId] = useState<string | null>(null);
  const [descriptionId, setDescriptionId] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const value = useMemo<ModalContextValue>(
    () => ({ open, onOpenChange, labelId, descriptionId, setLabelId, setDescriptionId }),
    [open, onOpenChange, labelId, descriptionId]
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

type ModalContentProps = React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function ModalContent({ children, className, ...props }: ModalContentProps) {
  const context = useModalContext('ModalContent');
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(context.open);
  const [isVisible, setIsVisible] = useState(context.open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (context.open) {
      setShouldRender(true);
      const animationFrame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(animationFrame);
    }

    setIsVisible(false);
    const timeout = window.setTimeout(() => {
      setShouldRender(false);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [context.open]);

  useEffect(() => {
    if (!context.open) {
      return;
    }

    const node = contentRef.current;
    if (node) {
      node.focus({ preventScroll: true });
    }
  }, [context.open]);

  if (!mounted || !shouldRender) {
    return null;
  }

  // Определяем ширину из className
  const hasLargeWidth = className?.includes('max-w-[95vw]') || className?.includes('max-w-7xl');
  const hasMediumWidth = className?.includes('max-w-5xl') || className?.includes('max-w-6xl');
  const maxWidthClass = hasLargeWidth ? 'max-w-[95vw]' : hasMediumWidth ? className?.match(/max-w-[56]xl/)?.[0] || 'max-w-5xl' : 'max-w-xl';
  
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className={cn(
          'absolute inset-0 bg-[color:var(--surface-overlay)] backdrop-blur-sm transition-opacity duration-200 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
        onClick={() => context.onOpenChange(false)}
      />
      <div className={cn('relative z-10 flex max-h-[90vh] w-full flex-col', maxWidthClass)}>
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={context.labelId ?? undefined}
          aria-describedby={context.descriptionId ?? undefined}
          tabIndex={-1}
          className={cn(
            'relative overflow-hidden rounded-3xl border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-popover)] shadow-[0_28px_68px_-28px_rgba(15,23,42,0.9)] outline-none transition-transform duration-200 ease-out',
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
            className?.replace(/max-w-\[95vw\]|max-w-7xl|max-w-[56]xl/g, '').trim() || className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col gap-1 border-b border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-6 py-5 text-[color:var(--text-primary)]',
      className
    )}
    {...props}
  />
);

export const ModalBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-4 px-6 py-5 text-[color:var(--text-secondary)]', className)} {...props} />
);

export const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col gap-3 border-t border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-base)] px-6 py-5 text-[color:var(--text-secondary)] sm:flex-row sm:items-center sm:justify-end sm:gap-4',
      className
    )}
    {...props}
  />
);

export const ModalClose = ({ className, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const context = useModalContext('ModalClose');

  return (
    <button
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          context.onOpenChange(false);
        }
      }}
      className={cn(
        'absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] transition-colors duration-200 hover:border-[color:var(--surface-border-strong)] hover:text-[color:var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent-border-strong)]',
        className
      )}
      {...props}
    >
      <span aria-hidden="true">×</span>
      <span className="sr-only">Закрыть модальное окно</span>
    </button>
  );
};

export function ModalTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const context = useModalContext('ModalTitle');
  const reactId = useId();
  const id = `modal-title-${reactId.replace(/[:]/g, '')}`;

  useEffect(() => {
    context.setLabelId(id);
    return () => context.setLabelId(null);
  }, [context, id]);

  return (
    <h2 className={cn('text-lg font-semibold leading-6 text-[color:var(--text-primary)]', className)} id={id} {...props} />
  );
}

export function ModalDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const context = useModalContext('ModalDescription');
  const reactId = useId();
  const id = `modal-description-${reactId.replace(/[:]/g, '')}`;

  useEffect(() => {
    context.setDescriptionId(id);
    return () => context.setDescriptionId(null);
  }, [context, id]);

  return (
    <p className={cn('text-sm text-[color:var(--text-secondary)]', className)} id={id} {...props} />
  );
}
