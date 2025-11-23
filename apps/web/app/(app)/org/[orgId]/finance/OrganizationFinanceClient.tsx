'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Organization } from '@collabverse/api';
import { Loader2, TrendingUp, CreditCard, History } from 'lucide-react';

interface OrganizationFinanceClientProps {
  organization: Organization;
}

interface BalanceData {
  cents: number;
  amount: string;
  currency: string;
}

export function OrganizationFinanceClient({ organization }: OrganizationFinanceClientProps) {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/balance?entityId=${organization.id}&entityType=organization`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Failed to fetch balance', error);
    } finally {
      setLoading(false);
    }
  }, [organization.id]);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  const handleTopUp = async () => {
    if (!topUpAmount || isNaN(Number(topUpAmount))) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/finance/top-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: organization.id,
          entityType: 'organization',
          amount: topUpAmount,
          sourceRef: 'manual_topup' // Placeholder
        })
      });
      if (res.ok) {
        setTopUpAmount('');
        await fetchBalance();
      }
    } catch (error) {
      console.error('Top up failed', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Balance Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Текущий баланс</h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="mt-4 flex items-baseline">
            <span className="text-3xl font-bold text-gray-900">
              {balance?.amount}
            </span>
            <span className="ml-2 text-sm font-medium text-gray-500">
              {balance?.currency}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Доступно для создания задач и выплат
          </p>
        </div>

        {/* Top Up Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Пополнить счет</h3>
            <CreditCard className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-4 space-y-4">
             <div className="flex gap-2">
                <input 
                    type="number" 
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="Сумма"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button 
                    onClick={handleTopUp}
                    disabled={processing || !topUpAmount}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Пополнить'}
                </button>
             </div>
             <p className="text-xs text-gray-400">
                Тестовое пополнение (без интеграции Stripe)
             </p>
          </div>
        </div>
      </div>

      {/* Transactions History Placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
         <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" />
            <h3 className="font-medium text-gray-900">История операций</h3>
         </div>
         <div className="p-6 text-center text-sm text-gray-500">
            Список транзакций пуст
         </div>
      </div>
    </div>
  );
}

