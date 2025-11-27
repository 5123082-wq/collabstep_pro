import {
  DbExpenseStore,
  MemoryExpenseStore,
  type DbExpenseStoreDependencies,
  type ExpenseStore
} from '../repositories/expense-store';

type Logger = Pick<Console, 'info' | 'warn'>;

export type ExpenseStoreDriver = 'memory' | 'db';

let cachedStore: ExpenseStore | null = null;
let cachedDriver: ExpenseStoreDriver | null = null;
let dependenciesFactory: (() => DbExpenseStoreDependencies | null) | null = null;

function detectDefaultDriver(): ExpenseStoreDriver {
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase();

  if (vercelEnv === 'production' || vercelEnv === 'staging') {
    return 'db';
  }

  if (nodeEnv === 'production' || nodeEnv === 'staging') {
    return 'db';
  }

  return 'memory';
}

export function resolveExpenseStoreDriver(): ExpenseStoreDriver {
  const explicit = (process.env.FIN_EXPENSES_STORAGE ?? '').toLowerCase();
  if (explicit === 'memory' || explicit === 'db') {
    return explicit;
  }
  return detectDefaultDriver();
}

function instantiateDbStore(logger: Logger): ExpenseStore {
  const dependencies = dependenciesFactory?.();
  if (!dependencies) {
    logger.warn('[ExpenseStoreFactory] DB dependencies unavailable, falling back to in-memory store');
    return new MemoryExpenseStore();
  }
  return new DbExpenseStore(dependencies);
}

function createExpenseStore(driver: ExpenseStoreDriver, logger: Logger): ExpenseStore {
  if (driver === 'db') {
    return instantiateDbStore(logger);
  }
  return new MemoryExpenseStore();
}

export function getExpenseStore(): ExpenseStore {
  if (cachedStore) {
    return cachedStore;
  }

  const driver = resolveExpenseStoreDriver();
  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined ||
    typeof (globalThis as Record<string, unknown>).jest !== 'undefined';
  const logger: Logger = isTestEnv ? { info: () => {}, warn: console.warn } : console;
  logger.info('[ExpenseStoreFactory] selecting expense store', { driver, nodeEnv: process.env.NODE_ENV });
  const store = createExpenseStore(driver, logger);
  cachedStore = store;
  cachedDriver = driver;
  return store;
}

export function getCachedExpenseStoreDriver(): ExpenseStoreDriver | null {
  return cachedDriver;
}

export function setDbExpenseStoreDependenciesFactory(
  factory: (() => DbExpenseStoreDependencies | null) | null
): void {
  dependenciesFactory = factory;
  resetExpenseStore();
}

export function resetExpenseStore(): void {
  cachedStore = null;
  cachedDriver = null;
}
