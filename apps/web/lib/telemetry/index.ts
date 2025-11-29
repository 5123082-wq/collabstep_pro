export type TelemetryPayload = Record<string, unknown> | undefined;

export function trackEvent(event: string, payload?: TelemetryPayload): void {
  try {
    // Логируем телеметрию только если явно включено через переменную окружения
    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_TELEMETRY_LOGS === '1') {
      // eslint-disable-next-line no-console
      console.info('[telemetry]', event, payload ?? {});
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[telemetry] failed to log event', err);
  }
}
