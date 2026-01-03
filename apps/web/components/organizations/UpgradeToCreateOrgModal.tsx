'use client';

import { useCallback } from 'react';
import { Crown, Building2, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type UpgradeToCreateOrgModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PRO_FEATURES = [
  'Неограниченное количество организаций',
  'До 50 участников в организации',
  'Расширенные права доступа',
  'Приоритетная поддержка',
  'Расширенная аналитика',
];

export function UpgradeToCreateOrgModal({ open, onOpenChange }: UpgradeToCreateOrgModalProps) {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleUpgrade = useCallback(() => {
    // TODO: Redirect to pricing/upgrade page
    window.location.href = '/pricing';
  }, []);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-elevated)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[color:var(--text-tertiary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-primary)] transition-colors"
          aria-label="Закрыть"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/30">
              <Crown className="h-8 w-8 text-amber-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 ring-2 ring-[color:var(--surface-elevated)]">
              <Building2 className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-xl font-semibold text-[color:var(--text-primary)]">
          Создайте больше организаций
        </h2>
        
        {/* Description */}
        <p className="mb-6 text-center text-sm text-[color:var(--text-secondary)]">
          На бесплатном плане можно создать только одну организацию. 
          Перейдите на Pro, чтобы управлять несколькими бизнесами.
        </p>

        {/* Features list */}
        <div className="mb-6 rounded-xl border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
              Pro план включает
            </span>
          </div>
          <ul className="space-y-2.5">
            {PRO_FEATURES.map((feature, index) => (
              <li key={index} className="flex items-center gap-2.5 text-sm text-[color:var(--text-secondary)]">
                <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Price hint */}
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold text-[color:var(--text-primary)]">$9</span>
          <span className="text-sm text-[color:var(--text-tertiary)]">/месяц</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className={cn(
              "flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              "border border-[color:var(--surface-border-subtle)]",
              "text-[color:var(--text-secondary)]",
              "hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-primary)]"
            )}
          >
            Позже
          </button>
          <button
            onClick={handleUpgrade}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              "bg-gradient-to-r from-indigo-500 to-purple-500",
              "text-white shadow-lg shadow-indigo-500/25",
              "hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02]"
            )}
          >
            <span>Перейти на Pro</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

