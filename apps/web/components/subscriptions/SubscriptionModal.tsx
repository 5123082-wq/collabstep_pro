'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/ui/toast';
import type { UserSubscription } from '@/lib/api/user-subscription';

type SubscriptionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PlanFeature = {
  label: string;
  included: boolean;
  value?: string;
};

type PlanConfig = {
  code: 'free' | 'pro' | 'max';
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
};

const PLANS: PlanConfig[] = [
  {
    code: 'free',
    name: 'Free',
    price: '$0',
    period: '/мес',
    description: 'Для личного использования и небольших команд',
    features: [
      { label: 'Организации', included: true, value: '1' },
      { label: 'Хранилище', included: true, value: '100 MB' },
      { label: 'Размер файла', included: true, value: '10 MB' },
      { label: 'История корзины', included: true, value: '7 дней' },
      { label: 'AI запусков в день', included: true, value: '3' },
      { label: 'AI потоков', included: true, value: '1' },
    ],
  },
  {
    code: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/мес',
    description: 'Для растущих команд и бизнеса',
    popular: true,
    features: [
      { label: 'Организации', included: true, value: 'Безлимит' },
      { label: 'Хранилище', included: true, value: '10 GB' },
      { label: 'Размер файла', included: true, value: '100 MB' },
      { label: 'История корзины', included: true, value: '30 дней' },
      { label: 'AI запусков в день', included: true, value: '50' },
      { label: 'AI потоков', included: true, value: '3' },
    ],
  },
  {
    code: 'max',
    name: 'Max',
    price: '$49',
    period: '/мес',
    description: 'Для крупных компаний и энтерпрайза',
    features: [
      { label: 'Организации', included: true, value: 'Безлимит' },
      { label: 'Хранилище', included: true, value: 'Безлимит' },
      { label: 'Размер файла', included: true, value: '500 MB' },
      { label: 'История корзины', included: true, value: 'Безлимит' },
      { label: 'AI запусков в день', included: true, value: 'Безлимит' },
      { label: 'AI потоков', included: true, value: '10' },
    ],
  },
];

import { createPortal } from 'react-dom';

export function SubscriptionModal({ open, onOpenChange }: SubscriptionModalProps) {
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/me/subscription')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.data?.subscription) {
            setCurrentSubscription(data.data.subscription);
          }
        })
        .catch((err) => console.error('Failed to fetch subscription:', err))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleUpgrade = useCallback((planCode: string) => {
    if (planCode === currentSubscription?.planCode) {
        return;
    }
    // TODO: Implement checkout flow
    toast('Платежная система находится в разработке', 'info');
  }, [currentSubscription]);

  if (!open || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-overlay backdrop-blur-sm overflow-y-auto py-10"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className="relative w-full max-w-5xl rounded-2xl border border-surface-border-subtle bg-surface-popover p-4 md:p-8 shadow-2xl mx-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-tertiary hover:bg-surface-muted hover:text-text-primary transition-colors"
          aria-label="Закрыть"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-text-primary mb-3">
            Выберите план подписки
          </h2>
          <p className="text-text-secondary text-lg">
            Раскройте полный потенциал платформы с планами Pro и Max
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentSubscription?.planCode === plan.code;
            const isPopular = plan.popular;

            return (
              <div 
                key={plan.code}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 transition-all duration-200",
                  isPopular 
                    ? "border-accent-border bg-accent-bg shadow-xl shadow-indigo-500/10 scale-105 md:scale-105 z-10" 
                    : "border-surface-border-subtle bg-content-block-bg hover:border-surface-border-strong",
                  isCurrent && "ring-2 ring-emerald-500 border-emerald-500/50"
                )}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                    ПОПУЛЯРНЫЙ
                  </div>
                )}
                
                {isCurrent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    ТЕКУЩИЙ ПЛАН
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-text-primary mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-text-primary">
                      {plan.price}
                    </span>
                    <span className="text-text-tertiary">
                      {plan.period}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-text-secondary h-10">
                    {plan.description}
                  </p>
                </div>

                <div className="flex-1 mb-8">
                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <div className={cn(
                          "mt-0.5 rounded-full p-0.5",
                          feature.included ? "bg-emerald-500/20 text-emerald-600" : "bg-neutral-500/20 text-neutral-500"
                        )}>
                          {feature.included ? (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          ) : (
                            <X className="h-3 w-3" strokeWidth={3} />
                          )}
                        </div>
                        <div className="flex-1 flex justify-between gap-2">
                          <span className={cn(
                            !feature.included && "text-text-tertiary line-through decoration-text-tertiary/30"
                          )}>
                            {feature.label}
                          </span>
                          {feature.value && (
                            <span className="font-semibold text-text-primary">
                              {feature.value}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleUpgrade(plan.code)}
                  disabled={isCurrent}
                  className={cn(
                    "w-full rounded-xl py-3 text-sm font-semibold transition-all",
                    isCurrent 
                      ? "bg-surface-chip text-text-tertiary cursor-default"
                      : isPopular
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02]"
                        : "bg-surface-base text-text-primary border border-surface-border-subtle hover:bg-surface-muted"
                  )}
                >
                  {isCurrent ? 'Ваш текущий план' : `Выбрать ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ or Enterprise Contact could go here */}
        <div className="mt-12 text-center">
            <p className="text-sm text-text-tertiary">
                Нужны индивидуальные условия? <button className="text-indigo-500 hover:underline">Свяжитесь с нами</button>
            </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
