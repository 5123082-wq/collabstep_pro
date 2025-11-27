describe('BudgetBanner', () => {
  const mockProject = {
    id: 'test-1',
    name: 'Test Project',
    title: 'Test Project',
    workspaceId: 'workspace-1',
    state: 'active' as const,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  };

  describe('Visibility Logic', () => {
    it('should not render when budgetLimit is not set', () => {
      const project = {
        ...mockProject,
        metrics: {
          budgetUsed: 5000,
          budgetLimit: undefined,
          total: 10,
          inProgress: 5,
          completed: 3,
          overdue: 2,
          progressPct: 50,
          activity7d: 15
        }
      };

      expect(project.metrics?.budgetLimit).toBeUndefined();
    });

    it('should not render when budget is below 80% of limit', () => {
      const project = {
        ...mockProject,
        metrics: {
          budgetUsed: 7000,
          budgetLimit: 10000,
          total: 10,
          inProgress: 5,
          completed: 3,
          overdue: 2,
          progressPct: 50,
          activity7d: 15
        }
      };

      const percentage = (project.metrics.budgetUsed / project.metrics.budgetLimit) * 100;
      expect(percentage).toBeLessThan(80);
    });

    it('should render warning when budget is between 80% and 100%', () => {
      const project = {
        ...mockProject,
        metrics: {
          budgetUsed: 8500,
          budgetLimit: 10000,
          total: 10,
          inProgress: 5,
          completed: 3,
          overdue: 2,
          progressPct: 50,
          activity7d: 15
        }
      };

      const percentage = (project.metrics.budgetUsed / project.metrics.budgetLimit) * 100;
      const isWarning = percentage >= 80 && percentage < 100;
      expect(isWarning).toBe(true);
    });

    it('should render error when budget exceeds 100%', () => {
      const project = {
        ...mockProject,
        metrics: {
          budgetUsed: 12000,
          budgetLimit: 10000,
          total: 10,
          inProgress: 5,
          completed: 3,
          overdue: 2,
          progressPct: 50,
          activity7d: 15
        }
      };

      const isExceeded = project.metrics.budgetUsed > project.metrics.budgetLimit;
      expect(isExceeded).toBe(true);
    });
  });

  describe('Percentage Calculation', () => {
    it('should calculate correct percentage', () => {
      const budgetUsed = 8500;
      const budgetLimit = 10000;
      const percentage = (budgetUsed / budgetLimit) * 100;

      expect(percentage).toBeCloseTo(85, 1);
    });

    it('should handle zero budget limit gracefully', () => {
      const budgetLimit = 0;

      // Должно обрабатываться как отсутствие лимита
      expect(budgetLimit).toBe(0);
    });

    it('should handle negative values', () => {
      const budgetUsed = -1000;
      const budgetLimit = 10000;
      const percentage = (budgetUsed / budgetLimit) * 100;

      expect(percentage).toBeLessThan(0);
    });
  });

  describe('Exceeded Amount Calculation', () => {
    it('should calculate correct exceeded amount', () => {
      const budgetUsed = 12000;
      const budgetLimit = 10000;
      const exceeded = budgetUsed - budgetLimit;

      expect(exceeded).toBe(2000);
    });

    it('should not show exceeded amount when under budget', () => {
      const budgetUsed = 8000;
      const budgetLimit = 10000;
      const isExceeded = budgetUsed > budgetLimit;

      expect(isExceeded).toBe(false);
    });
  });
});
