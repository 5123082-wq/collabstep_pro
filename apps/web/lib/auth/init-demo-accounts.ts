let initialized = false;

/**
 * Emergency admin больше не материализуется в users/organizations storage.
 * Функция сохранена как no-op для обратной совместимости старых call sites.
 */
export async function ensureDemoAccountsInitialized(): Promise<void> {
  if (initialized) {
    return;
  }
  initialized = true;
}
