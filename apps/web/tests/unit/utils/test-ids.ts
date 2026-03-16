let counter = 0;

/**
 * Генерирует предсказуемые, но уникальные ID для тестовых сущностей.
 * Используется только в тестах, чтобы избегать дубликатов PK.
 */
export function makeTestId(prefix = 'test'): string {
  counter += 1;
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${randomStr}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function makeTestUserId(prefix = 'user'): { id: string; email: string } {
  const id = makeTestId(prefix);
  const email = `${id}@example.com`;
  return { id, email };
}
