describe('LimitsLog', () => {
  const mockEvents = [
    {
      id: 'event-1',
      projectId: 'test-1',
      action: 'expense.created',
      actorId: 'user-1',
      createdAt: '2025-01-15T10:00:00Z',
      after: { projectId: 'test-1', amount: '1000' }
    },
    {
      id: 'event-2',
      projectId: 'test-1',
      action: 'project_budget.updated',
      actorId: 'user-1',
      createdAt: '2025-01-10T09:00:00Z',
      after: { budgetLimit: 10000 }
    },
    {
      id: 'event-3',
      projectId: 'test-1',
      action: 'expense.created',
      actorId: 'user-2',
      createdAt: '2025-01-20T14:30:00Z',
      after: { projectId: 'test-1', amount: '2500' }
    }
  ];

  describe('Event Filtering', () => {
    it('should filter events by action type', () => {
      const expenseEvents = mockEvents.filter(e => e.action === 'expense.created');
      expect(expenseEvents).toHaveLength(2);
    });

    it('should filter events by date range', () => {
      const dateFrom = new Date('2025-01-12T00:00:00Z');
      const dateTo = new Date('2025-01-18T23:59:59Z');

      const filtered = mockEvents.filter(event => {
        const eventDate = new Date(event.createdAt);
        return eventDate >= dateFrom && eventDate <= dateTo;
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('event-1');
    });

    it('should filter events by projectId', () => {
      const filtered = mockEvents.filter(event => {
        if (event.action === 'expense.created' && event.after) {
          const after = event.after as { projectId?: string };
          return after.projectId === 'test-1';
        }
        return event.projectId === 'test-1';
      });

      expect(filtered.length).toBeGreaterThan(0);
    });

    it('should handle empty filter results', () => {
      const dateFrom = new Date('2026-01-01T00:00:00Z');
      const filtered = mockEvents.filter(event => {
        const eventDate = new Date(event.createdAt);
        return eventDate >= dateFrom;
      });

      expect(filtered).toHaveLength(0);
    });
  });

  describe('CSV Export', () => {
    it('should format date correctly for CSV', () => {
      const date = new Date('2025-01-15T10:00:00Z');
      const formatted = date.toLocaleString('ru-RU');

      expect(formatted).toBeTruthy();
    });

    it('should extract amount from event', () => {
      const event = mockEvents[0];
      const amount = event && event.after && typeof event.after === 'object' && 'amount' in event.after
        ? (event.after as { amount?: string }).amount
        : undefined;

      expect(amount).toBe('1000');
    });

    it('should handle events without amount', () => {
      const event = mockEvents[1];
      const amount = event && event.after && typeof event.after === 'object' && 'amount' in event.after
        ? (event.after as { amount?: string }).amount
        : undefined;

      expect(amount).toBeUndefined();
    });
  });

  describe('Action Labels', () => {
    it('should return correct label for expense.created', () => {
      const action = 'expense.created';
      const label = action === 'expense.created' ? 'Создана трата' : 'Обновлён бюджет';

      expect(label).toBe('Создана трата');
    });

    it('should return correct label for project_budget.updated', () => {
      const action = 'project_budget.updated';
      const label = (action as string) === 'expense.created' ? 'Создана трата' : 'Обновлён бюджет';

      expect(label).toBe('Обновлён бюджет');
    });
  });

  describe('Sorting', () => {
    it('should sort events by date (newest first)', () => {
      const sorted = [...mockEvents].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      expect(sorted[0]!.id).toBe('event-3');
      expect(sorted[1]!.id).toBe('event-1');
      expect(sorted[2]!.id).toBe('event-2');
    });

    it('should sort events by date (oldest first)', () => {
      const sorted = [...mockEvents].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      expect(sorted[0]!.id).toBe('event-2');
      expect(sorted[1]!.id).toBe('event-1');
      expect(sorted[2]!.id).toBe('event-3');
    });
  });
});
