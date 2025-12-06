'use client';

import { useMemo } from 'react';

/**
 * Хук для проверки feature flag на клиенте
 * Использует переменные окружения NEXT_PUBLIC_*
 */
export function useFeatureFlag(flagName: string): boolean {
  return useMemo(() => {
    // В Next.js переменные NEXT_PUBLIC_* доступны на клиенте
    // Они подставляются во время сборки
    const envKey = `NEXT_PUBLIC_${flagName}`;
    const envValue = process.env[envKey];
    
    if (!envValue) {
      return false;
    }
    
    const normalized = String(envValue).trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }, [flagName]);
}

