import { ClosureCheckerRegistry } from './checker-registry';
import { ContractsClosureChecker } from './checkers/contracts-checker';
import { DocumentsClosureChecker } from './checkers/documents-checker';
import { WalletClosureChecker } from './checkers/wallet-checker';
import { ExpensesClosureChecker } from './checkers/expenses-checker';
import { MarketingClosureChecker } from './checkers/marketing-checker';

/**
 * Глобальный реестр всех Closure Checkers
 * Все checkers регистрируются здесь при инициализации модуля
 */
export const closureCheckerRegistry = new ClosureCheckerRegistry();

// Регистрация всех checkers
closureCheckerRegistry.register(new ContractsClosureChecker());
closureCheckerRegistry.register(new DocumentsClosureChecker());
closureCheckerRegistry.register(new WalletClosureChecker());
closureCheckerRegistry.register(new ExpensesClosureChecker());
closureCheckerRegistry.register(new MarketingClosureChecker());

// Экспорт типов и интерфейсов
export type { OrganizationClosureChecker } from './types';
export { ClosureCheckerRegistry } from './checker-registry';

// Экспорт всех checkers (для тестирования и расширения)
export { ContractsClosureChecker } from './checkers/contracts-checker';
export { DocumentsClosureChecker } from './checkers/documents-checker';
export { WalletClosureChecker } from './checkers/wallet-checker';
export { ExpensesClosureChecker } from './checkers/expenses-checker';
export { MarketingClosureChecker } from './checkers/marketing-checker';











