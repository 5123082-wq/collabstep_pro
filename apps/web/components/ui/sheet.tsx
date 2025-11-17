'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: SheetSide;
}

type SheetSide = 'right' | 'left' | 'top' | 'bottom';

type SheetProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: SheetSide;
};

const SheetContext = createContext<SheetContextValue | null>(null);

export function Sheet({ children, open, onOpenChange, side = 'right' }: SheetProps) {
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

  const value = useMemo<SheetContextValue>(() => ({ open, onOpenChange, side }), [open, onOpenChange, side]);

  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

function useSheetContext(component: string) {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Sheet />`);
  }
  return context;
}

type SheetContentProps = React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  side?: SheetSide;
};

export function SheetContent({ children, className, side, style, ...props }: SheetContentProps) {
  const context = useSheetContext('SheetContent');
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(context.open);
  const [isVisible, setIsVisible] = useState(context.open);
  const actualSide = side ?? context.side;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (context.open) {
      setShouldRender(true);
      const id = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(id);
    }

    setIsVisible(false);
    const timeout = window.setTimeout(() => {
      setShouldRender(false);
    }, 250);

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

  if (!shouldRender || !mounted) {
    return null;
  }

  // Проверяем, переопределены ли стили позиционирования через style prop
  const hasCustomWidth = style?.width !== undefined;
  const hasCustomMaxWidth = style?.maxWidth !== undefined;
  const hasCustomRight = style?.right !== undefined;
  const hasCustomLeft = style?.left !== undefined;

  const sideClasses: Record<SheetSide, string> = {
    right: hasCustomWidth || hasCustomMaxWidth || hasCustomRight 
      ? 'inset-y-0 ml-auto h-full' 
      : 'inset-y-0 right-0 ml-auto h-full w-full max-w-[420px]',
    left: hasCustomWidth || hasCustomMaxWidth || hasCustomLeft
      ? 'inset-y-0 mr-auto h-full'
      : 'inset-y-0 left-0 mr-auto h-full w-full max-w-[420px]',
    top: 'inset-x-0 top-0 mx-auto w-full max-w-2xl',
    bottom: 'inset-x-0 bottom-0 mx-auto w-full max-w-2xl'
  };

  const containerAlign: Record<SheetSide, string> = {
    right: 'items-stretch justify-end',
    left: 'items-stretch justify-start',
    top: 'items-start justify-center',
    bottom: 'items-end justify-center'
  };

  const positionClass = sideClasses[actualSide];
  const alignment = containerAlign[actualSide];
  
  // Если есть кастомные стили, убираем w-full из классов чтобы не конфликтовать с inline стилями
  const finalPositionClass = (hasCustomWidth || hasCustomMaxWidth || hasCustomRight || hasCustomLeft) 
    ? positionClass.replace(/\bw-full\b/g, '')
    : positionClass;
  const radiusClasses: Record<SheetSide, string> = {
    right: 'rounded-l-2xl rounded-r-none',
    left: 'rounded-r-2xl rounded-l-none',
    top: 'rounded-b-2xl rounded-t-none',
    bottom: 'rounded-t-2xl rounded-b-none'
  };

  const translateClasses: Record<SheetSide, string> = {
    right: isVisible ? 'translate-x-0' : 'translate-x-full',
    left: isVisible ? 'translate-x-0' : '-translate-x-full',
    top: isVisible ? 'translate-y-0' : '-translate-y-full',
    bottom: isVisible ? 'translate-y-0' : 'translate-y-full'
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex" data-side={actualSide}>
      <div
        className={cn(
          'absolute inset-0 bg-[color:var(--surface-overlay)] backdrop-blur-sm transition-opacity duration-300 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
        onClick={() => context.onOpenChange(false)}
      />
      <div className={cn('relative flex h-full w-full', alignment)}>
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'pointer-events-auto border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-popover)] shadow-2xl outline-none transition-transform duration-300 ease-out',
            radiusClasses[actualSide],
            finalPositionClass,
            translateClasses[actualSide],
            className
          )}
          style={style}
          {...props}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'space-y-1.5 border-b border-[color:var(--surface-border-subtle)] pb-4',
        className
      )}
      {...props}
    />
  );
}

export const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('text-lg font-semibold text-[color:var(--text-primary)]', className)} {...props} />
);
