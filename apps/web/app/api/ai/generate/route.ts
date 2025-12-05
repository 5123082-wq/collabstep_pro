import { NextRequest, NextResponse } from 'next/server';
import { OpenAIClient } from '@/lib/ai/openai-client';
import { YandexAIClient } from '@/lib/ai/yandex-ai-client';
import { generateProjectStructure, generateSubtasks, analyzeWorkload } from '@/lib/ai/planning-service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, provider = process.env.AI_DEFAULT_PROVIDER || 'openai', data } = body;

        // Безопасно: используем ключи из переменных окружения на сервере
        let apiKey: string;
        let folderId: string = '';
        let modelUri: string = '';

        if (provider === 'yandex') {
            apiKey = process.env.YANDEX_API_KEY || '';
            folderId = process.env.YANDEX_FOLDER_ID || '';
            modelUri = process.env.YANDEX_MODEL_URI || 'yandexgpt/latest';

            if (!apiKey || !folderId) {
                return NextResponse.json(
                    { error: 'Yandex API key and Folder ID must be configured in .env.local' },
                    { status: 500 }
                );
            }
        } else {
            apiKey = process.env.OPENAI_API_KEY || '';

            if (!apiKey) {
                return NextResponse.json(
                    { error: 'OpenAI API key must be configured in .env.local' },
                    { status: 500 }
                );
            }
        }

        // MOCK MODE FOR TESTING (только для разработки)
        const isTestMode = apiKey === 'TEST_KEY' || apiKey === 'YANDEX_TEST_KEY';
        if (isTestMode) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay

            if (action === 'generate-structure') {
                return NextResponse.json({
                    result: {
                        phases: [
                            {
                                name: "Phase 1: Discovery",
                                description: "Initial research and planning",
                                tasks: [
                                    { title: "Market Research", description: "Analyze competitors", estimatedDays: 2, priority: "high" },
                                    { title: "Define Requirements", description: "Gather user stories", estimatedDays: 3, priority: "high" }
                                ]
                            },
                            {
                                name: "Phase 2: Development",
                                description: "Core implementation",
                                tasks: [
                                    { title: "Setup Repo", description: "Init project", estimatedDays: 1, priority: "med" },
                                    { title: "Frontend MVP", description: "Basic UI", estimatedDays: 5, priority: "high" }
                                ]
                            }
                        ],
                        estimatedTotalDays: 11,
                        suggestedTeamSize: 3,
                        recommendations: ["Start small", "Iterate fast"]
                    }
                });
            }

            if (action === 'generate-subtasks') {
                return NextResponse.json({
                    result: [
                        { title: "Subtask 1", description: "Do this first", estimatedHours: 2 },
                        { title: "Subtask 2", description: "Then this", estimatedHours: 4 }
                    ]
                });
            }

            if (action === 'analyze-workload') {
                return NextResponse.json({
                    result: {
                        members: [
                            { userName: "Alice", activeTasks: 5, estimatedHours: 40, upcomingDeadlines: 2, overloadLevel: "medium" },
                            { userName: "Bob", activeTasks: 2, estimatedHours: 10, upcomingDeadlines: 0, overloadLevel: "low" }
                        ],
                        recommendations: ["Give Bob more work"]
                    }
                });
            }
        }

        // Create appropriate AI client based on provider
        // Безопасно: ключи берутся из env переменных, не от клиента
        let aiClient;
        if (provider === 'yandex') {
            aiClient = new YandexAIClient(apiKey, folderId, modelUri);
        } else {
            aiClient = new OpenAIClient(apiKey);
        }

        let result;

        switch (action) {
            case 'generate-structure':
                if (!data.description || data.description.trim().length === 0) {
                    return NextResponse.json(
                        { error: 'Описание проекта обязательно и не может быть пустым' },
                        { status: 400 }
                    );
                }
                result = await generateProjectStructure(aiClient, data.description, {
                    projectName: data.projectName,
                    teamSize: data.teamSize,
                    deadline: data.deadline,
                    preferences: data.preferences
                });
                break;

            case 'generate-subtasks':
                if (!data.taskTitle || data.taskTitle.trim().length === 0) {
                    return NextResponse.json(
                        { error: 'Название задачи обязательно и не может быть пустым' },
                        { status: 400 }
                    );
                }
                result = await generateSubtasks(aiClient, data.taskTitle, data.taskDescription);
                break;

            case 'analyze-workload':
                // For demo purposes, we might need to mock tasks/members if not provided in data
                // In a real scenario, we would fetch this from the database
                result = await analyzeWorkload(aiClient, data.tasks || [], data.members || []);
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ result });
    } catch (error: any) {
        console.error('AI Generation Error:', error);
        console.error('Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
            status: error?.status,
            code: error?.code
        });
        
        // Более информативные сообщения об ошибках
        let errorMessage = 'Internal Server Error';
        let statusCode = 500;
        
        if (error instanceof Error) {
            errorMessage = error.message;
            
            // Специфичные коды статуса для разных ошибок
            if (error.message.includes('API key')) {
                statusCode = 503; // Service Unavailable - конфигурация
            } else if (error.message.includes('rate limit')) {
                statusCode = 429; // Too Many Requests
            } else if (error.message.includes('temporarily unavailable')) {
                statusCode = 503; // Service Unavailable
            }
        }
        
        return NextResponse.json(
            { 
                error: errorMessage,
                // В development режиме возвращаем больше деталей
                ...(process.env.NODE_ENV === 'development' && {
                    details: error?.stack,
                    type: error?.name
                })
            }, 
            { status: statusCode }
        );
    }
}
