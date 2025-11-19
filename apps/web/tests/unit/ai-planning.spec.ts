/**
 * Unit tests for AI Planning functionality
 * 
 * Tests for:
 * - Project structure generation
 * - Task assignment recommendations
 * - Workload analysis
 * - Bulk operations
 * - Subtasks generation
 */

import {
  generateProjectStructure,
  suggestTaskAssignments,
  analyzeWorkload,
  generateSubtasks,
  type AIClient
} from '@collabverse/api/services/ai-planning-service';

// Mock AI Client
const createMockAIClient = (response: string): AIClient => ({
  generateText: jest.fn().mockResolvedValue(response)
});

describe('AI Planning Service', () => {
  describe('generateProjectStructure', () => {
    it('should generate valid project structure from description', async () => {
      const mockResponse = JSON.stringify({
        phases: [
          {
            name: 'Разработка',
            description: 'Основная разработка',
            tasks: [
              {
                title: 'Создать API',
                description: 'Разработать REST API',
                estimatedDays: 5,
                priority: 'high'
              }
            ]
          }
        ],
        estimatedTotalDays: 30,
        suggestedTeamSize: 3
      });

      const mockClient = createMockAIClient(mockResponse);

      const result = await generateProjectStructure(
        mockClient,
        'Создать веб-приложение для управления задачами'
      );

      expect(result).toBeDefined();
      expect(result.phases).toHaveLength(1);
      expect(result.phases[0]!.name).toBe('Разработка');
      expect(result.phases[0]!.tasks).toHaveLength(1);
      expect(result.estimatedTotalDays).toBe(30);
      expect(result.suggestedTeamSize).toBe(3);
    });

    it('should handle markdown code blocks in AI response', async () => {
      const mockResponse = `\`\`\`json
{
  "phases": [
    {
      "name": "Тестирование",
      "description": "Тестирование приложения",
      "tasks": [
        {
          "title": "Написать тесты",
          "description": "Unit и E2E тесты",
          "estimatedDays": 3,
          "priority": "med"
        }
      ]
    }
  ],
  "estimatedTotalDays": 10
}
\`\`\``;

      const mockClient = createMockAIClient(mockResponse);

      const result = await generateProjectStructure(
        mockClient,
        'Протестировать приложение'
      );

      expect(result).toBeDefined();
      expect(result.phases).toHaveLength(1);
      expect(result.phases[0]!.name).toBe('Тестирование');
    });

    it('should throw error for invalid AI response', async () => {
      const mockClient = createMockAIClient('invalid json');

      await expect(
        generateProjectStructure(mockClient, 'Test project')
      ).rejects.toThrow('Failed to generate project structure');
    });

    it('should throw error for empty phases', async () => {
      const mockResponse = JSON.stringify({
        phases: [],
        estimatedTotalDays: 0
      });

      const mockClient = createMockAIClient(mockResponse);

      await expect(
        generateProjectStructure(mockClient, 'Test project')
      ).rejects.toThrow('Failed to generate project structure');
    });

    it('should include risks and recommendations when requested', async () => {
      const mockResponse = JSON.stringify({
        phases: [
          {
            name: 'Phase 1',
            description: 'Test phase',
            tasks: [
              {
                title: 'Task 1',
                description: 'Test task',
                estimatedDays: 5,
                priority: 'med'
              }
            ]
          }
        ],
        estimatedTotalDays: 5,
        risks: ['Risk 1', 'Risk 2'],
        recommendations: ['Recommendation 1']
      });

      const mockClient = createMockAIClient(mockResponse);

      const result = await generateProjectStructure(mockClient, 'Test project', {
        preferences: {
          includeRisks: true,
          includeRecommendations: true
        }
      });

      expect(result.risks).toHaveLength(2);
      expect(result.recommendations).toHaveLength(1);
    });
  });

  describe('suggestTaskAssignments', () => {
    it('should generate assignment recommendations', async () => {
      const mockResponse = JSON.stringify({
        recommendations: [
          {
            taskId: 'task-1',
            taskTitle: 'Task 1',
            recommendedAssigneeId: 'user-1',
            recommendedAssigneeName: 'User 1',
            reason: 'Низкая загруженность',
            confidence: 0.9
          }
        ]
      });

      const mockClient = createMockAIClient(mockResponse);

      const tasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          priority: 'high',
          estimatedTime: 8
        }
      ];

      const members = [
        {
          userId: 'user-1',
          userName: 'User 1',
          currentTasksCount: 2
        }
      ];

      const result = await suggestTaskAssignments(mockClient, tasks, members);

      expect(result).toHaveLength(1);
      expect(result[0]!.taskId).toBe('task-1');
      expect(result[0]!.recommendedAssigneeId).toBe('user-1');
      expect(result[0]!.confidence).toBe(0.9);
    });

    it('should return empty array for no tasks', async () => {
      const mockClient = createMockAIClient('{}');

      const result = await suggestTaskAssignments(mockClient, [], []);

      expect(result).toEqual([]);
    });

    it('should handle alternative assignees', async () => {
      const mockResponse = JSON.stringify({
        recommendations: [
          {
            taskId: 'task-1',
            taskTitle: 'Task 1',
            recommendedAssigneeId: 'user-1',
            recommendedAssigneeName: 'User 1',
            reason: 'Best fit',
            confidence: 0.85,
            alternativeAssignees: [
              {
                userId: 'user-2',
                userName: 'User 2',
                reason: 'Alternative',
                confidence: 0.7
              }
            ]
          }
        ]
      });

      const mockClient = createMockAIClient(mockResponse);

      const tasks = [{ id: 'task-1', title: 'Task 1', priority: 'med' }];
      const members = [
        { userId: 'user-1', userName: 'User 1' },
        { userId: 'user-2', userName: 'User 2' }
      ];

      const result = await suggestTaskAssignments(mockClient, tasks, members);

      expect(result[0]!.alternativeAssignees).toHaveLength(1);
      expect(result[0]!.alternativeAssignees![0]!.userId).toBe('user-2');
    });
  });

  describe('analyzeWorkload', () => {
    it('should analyze team workload', async () => {
      const mockResponse = JSON.stringify({
        members: [
          {
            userId: 'user-1',
            userName: 'User 1',
            activeTasks: 5,
            estimatedHours: 40,
            upcomingDeadlines: 2,
            overloadLevel: 'medium',
            capacity: 80
          }
        ],
        overloadedMembers: [],
        underutilizedMembers: [],
        recommendations: ['Recommendation 1']
      });

      const mockClient = createMockAIClient(mockResponse);

      const tasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          assigneeId: 'user-1',
          status: 'in_progress',
          estimatedTime: 8,
          priority: 'med'
        }
      ];

      const members = [
        {
          userId: 'user-1',
          userName: 'User 1'
        }
      ];

      const result = await analyzeWorkload(mockClient, tasks, members);

      expect(result).toBeDefined();
      expect(result.members).toHaveLength(1);
      expect(result.members[0]!.userId).toBe('user-1');
      expect(result.members[0]!.overloadLevel).toBe('medium');
    });

    it('should identify overloaded members', async () => {
      const mockResponse = JSON.stringify({
        members: [
          {
            userId: 'user-1',
            userName: 'User 1',
            activeTasks: 10,
            estimatedHours: 80,
            upcomingDeadlines: 5,
            overloadLevel: 'high',
            capacity: 100
          }
        ],
        overloadedMembers: ['user-1'],
        underutilizedMembers: [],
        recommendations: ['Reduce workload for User 1']
      });

      const mockClient = createMockAIClient(mockResponse);

      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        assigneeId: 'user-1',
        status: 'in_progress',
        estimatedTime: 8,
        priority: 'med'
      }));

      const members = [{ userId: 'user-1', userName: 'User 1' }];

      const result = await analyzeWorkload(mockClient, tasks, members);

      expect(result.overloadedMembers).toContain('user-1');
    });

    it('should handle AI errors gracefully and return basic analysis', async () => {
      const mockClient = createMockAIClient('invalid json');

      const tasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          assigneeId: 'user-1',
          status: 'in_progress',
          estimatedTime: 40,
          priority: 'high'
        }
      ];

      const members = [{ userId: 'user-1', userName: 'User 1' }];

      const result = await analyzeWorkload(mockClient, tasks, members);

      // Should return basic analysis even on error
      expect(result).toBeDefined();
      expect(result.members).toHaveLength(1);
      expect(result.members[0]!.userId).toBe('user-1');
    });

    it('should suggest task redistribution', async () => {
      const mockResponse = JSON.stringify({
        members: [
          {
            userId: 'user-1',
            userName: 'User 1',
            activeTasks: 8,
            estimatedHours: 64,
            upcomingDeadlines: 4,
            overloadLevel: 'high',
            capacity: 90
          },
          {
            userId: 'user-2',
            userName: 'User 2',
            activeTasks: 2,
            estimatedHours: 16,
            upcomingDeadlines: 1,
            overloadLevel: 'low',
            capacity: 30
          }
        ],
        overloadedMembers: ['user-1'],
        underutilizedMembers: ['user-2'],
        recommendations: ['Redistribute tasks from User 1 to User 2'],
        redistributionSuggestions: [
          {
            taskId: 'task-1',
            taskTitle: 'Task 1',
            fromUserId: 'user-1',
            toUserId: 'user-2',
            reason: 'Balance workload'
          }
        ]
      });

      const mockClient = createMockAIClient(mockResponse);

      const tasks = [
        { id: 'task-1', title: 'Task 1', assigneeId: 'user-1', status: 'new', priority: 'low' }
      ];
      const members = [
        { userId: 'user-1', userName: 'User 1' },
        { userId: 'user-2', userName: 'User 2' }
      ];

      const result = await analyzeWorkload(mockClient, tasks, members);

      expect(result.redistributionSuggestions).toBeDefined();
      expect(result.redistributionSuggestions!.length).toBeGreaterThan(0);
      expect(result.redistributionSuggestions![0]!.fromUserId).toBe('user-1');
      expect(result.redistributionSuggestions![0]!.toUserId).toBe('user-2');
    });
  });

  describe('generateSubtasks', () => {
    it('should generate subtasks for a task', async () => {
      const mockResponse = JSON.stringify({
        subtasks: [
          {
            title: 'Subtask 1',
            description: 'Description 1',
            estimatedHours: 4
          },
          {
            title: 'Subtask 2',
            description: 'Description 2',
            estimatedHours: 3
          }
        ]
      });

      const mockClient = createMockAIClient(mockResponse);

      const result = await generateSubtasks(
        mockClient,
        'Create API endpoint',
        'Develop REST API for user management'
      );

      expect(result).toHaveLength(2);
      expect(result[0]!.title).toBe('Subtask 1');
      expect(result[0]!.estimatedHours).toBe(4);
      expect(result[1]!.title).toBe('Subtask 2');
    });

    it('should throw error for invalid subtasks response', async () => {
      const mockResponse = JSON.stringify({
        subtasks: []
      });

      const mockClient = createMockAIClient(mockResponse);

      await expect(
        generateSubtasks(mockClient, 'Test task')
      ).rejects.toThrow('Failed to generate subtasks');
    });

    it('should work without task description', async () => {
      const mockResponse = JSON.stringify({
        subtasks: [
          {
            title: 'Subtask 1',
            description: 'Description',
            estimatedHours: 2
          }
        ]
      });

      const mockClient = createMockAIClient(mockResponse);

      const result = await generateSubtasks(mockClient, 'Test task');

      expect(result).toHaveLength(1);
    });
  });
});
