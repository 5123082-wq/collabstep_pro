import { OpenAIClient } from './openai-client';

// --- Types ---

export interface BrandbookPrompts {
    intake?: string;
    logoCheck?: string;
    generate?: string;
    qa?: string;
    followup?: string;
}

export interface BrandbookPipelineConfig {
    systemPrompt: string;
    prompts: BrandbookPrompts;
    parameters: {
        outputLanguage?: string;
        watermarkText?: string;
        contactBlock?: string;
    };
}

export interface BrandbookPipelineInput {
    productBundle: string;
    preferences?: string[];
    logoFileId?: string;
    outputLanguage?: string;
    watermarkText?: string;
    contactBlock?: string;
}

export interface BrandbookPipelineStep {
    step: 'intake' | 'logoCheck' | 'generate' | 'qa' | 'followup';
    prompt: string;
    response?: string;
    error?: string;
    timestamp: Date;
}

export interface BrandbookPipelineResult {
    success: boolean;
    steps: BrandbookPipelineStep[];
    finalResponse?: string;
    error?: string;
}

// --- Helper functions ---

function interpolatePrompt(template: string, variables: Record<string, string | undefined>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return result;
}

// --- Pipeline Service ---

export class BrandbookAgentPipeline {
    private client: OpenAIClient;
    private config: BrandbookPipelineConfig;

    constructor(apiKey: string, config: BrandbookPipelineConfig) {
        this.client = new OpenAIClient(apiKey);
        this.config = config;
    }

    /**
     * Generate intake message for user
     */
    async generateIntakeMessage(): Promise<string> {
        const intakePrompt = this.config.prompts.intake;
        if (!intakePrompt) {
            return 'Добро пожаловать! Загрузите логотип и выберите набор продукции для создания брендбука.';
        }
        return intakePrompt;
    }

    /**
     * Check logo quality and format
     */
    async checkLogo(logoDescription: string): Promise<{ ok: boolean; message: string }> {
        const logoCheckPrompt = this.config.prompts.logoCheck;
        if (!logoCheckPrompt) {
            return { ok: true, message: 'Логотип принят.' };
        }

        try {
            const response = await this.client.generateText(logoDescription, {
                systemPrompt: this.config.systemPrompt + '\n\n' + logoCheckPrompt,
                temperature: 0.3,
                maxTokens: 500
            });

            const isOk = response.toLowerCase().includes('ok') ||
                response.toLowerCase().includes('принят') ||
                !response.toLowerCase().includes('проблем');

            return { ok: isOk, message: response };
        } catch (error) {
            return {
                ok: false,
                message: error instanceof Error ? error.message : 'Ошибка проверки логотипа'
            };
        }
    }

    /**
     * Generate brandbook based on input
     */
    async generate(input: BrandbookPipelineInput): Promise<string> {
        const generatePrompt = this.config.prompts.generate;
        if (!generatePrompt) {
            throw new Error('Generate prompt is not configured');
        }

        const variables: Record<string, string | undefined> = {
            productBundle: input.productBundle,
            preferences: input.preferences?.join(', ') || '',
            outputLanguage: input.outputLanguage || this.config.parameters.outputLanguage || 'ru',
            watermarkText: input.watermarkText || this.config.parameters.watermarkText || '',
            contactBlock: input.contactBlock || this.config.parameters.contactBlock || ''
        };

        const interpolatedPrompt = interpolatePrompt(generatePrompt, variables);

        const response = await this.client.generateText(interpolatedPrompt, {
            systemPrompt: this.config.systemPrompt,
            temperature: 0.7,
            maxTokens: 2000
        });

        return response;
    }

    /**
     * Run QA check on generated content
     */
    async runQualityCheck(generatedContent: string): Promise<{ passed: boolean; feedback: string }> {
        const qaPrompt = this.config.prompts.qa;
        if (!qaPrompt) {
            return { passed: true, feedback: 'QA пропущена.' };
        }

        try {
            const response = await this.client.generateText(
                `Проверь следующий сгенерированный макет:\n\n${generatedContent}`,
                {
                    systemPrompt: this.config.systemPrompt + '\n\n' + qaPrompt,
                    temperature: 0.3,
                    maxTokens: 500
                }
            );

            const passed = response.toLowerCase().includes('ok') ||
                response.toLowerCase().includes('готов') ||
                !response.toLowerCase().includes('проблем');

            return { passed, feedback: response };
        } catch (error) {
            return {
                passed: false,
                feedback: error instanceof Error ? error.message : 'Ошибка QA проверки'
            };
        }
    }

    /**
     * Generate followup message after completion
     */
    async generateFollowupMessage(): Promise<string> {
        const followupPrompt = this.config.prompts.followup;
        if (!followupPrompt) {
            return 'Брендбук готов! Хотите внести изменения?';
        }
        return followupPrompt;
    }

    /**
     * Process a user message in chat context
     */
    async processUserMessage(
        userMessage: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context?: { productBundle?: string; step?: string }
    ): Promise<string> {
        // Build conversation for OpenAI
        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        // Add recent history (last 10 messages max)
        const recentHistory = conversationHistory.slice(-10);
        messages.push(...recentHistory);

        // Add current message
        messages.push({ role: 'user', content: userMessage });

        // Build context-aware system prompt
        let contextInfo = '';
        if (context?.productBundle) {
            contextInfo += `\nТекущий набор продукции: ${context.productBundle}`;
        }
        if (context?.step) {
            contextInfo += `\nТекущий этап: ${context.step}`;
        }

        const fullSystemPrompt = this.config.systemPrompt + contextInfo;

        // Generate response
        const response = await this.client.generateText(
            messages.map(m => `${m.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${m.content}`).join('\n'),
            {
                systemPrompt: fullSystemPrompt,
                temperature: 0.7,
                maxTokens: 1500
            }
        );

        return response;
    }

    /**
     * Run full pipeline (for automation)
     */
    async runFullPipeline(input: BrandbookPipelineInput): Promise<BrandbookPipelineResult> {
        const steps: BrandbookPipelineStep[] = [];

        try {
            // Step 1: Intake
            const intakeMessage = await this.generateIntakeMessage();
            steps.push({
                step: 'intake',
                prompt: 'Generate intake message',
                response: intakeMessage,
                timestamp: new Date()
            });

            // Step 2: Logo check (if logo provided)
            if (input.logoFileId) {
                const logoCheck = await this.checkLogo(`Логотип с ID: ${input.logoFileId}`);
                steps.push({
                    step: 'logoCheck',
                    prompt: 'Check logo quality',
                    response: logoCheck.message,
                    ...(logoCheck.ok ? {} : { error: logoCheck.message }),
                    timestamp: new Date()
                });

                if (!logoCheck.ok) {
                    return {
                        success: false,
                        steps,
                        error: 'Logo check failed: ' + logoCheck.message
                    };
                }
            }

            // Step 3: Generate
            const generateResponse = await this.generate(input);
            steps.push({
                step: 'generate',
                prompt: 'Generate brandbook',
                response: generateResponse,
                timestamp: new Date()
            });

            // Step 4: QA
            const qaResult = await this.runQualityCheck(generateResponse);
            steps.push({
                step: 'qa',
                prompt: 'Run quality check',
                response: qaResult.feedback,
                ...(qaResult.passed ? {} : { error: qaResult.feedback }),
                timestamp: new Date()
            });

            // Step 5: Followup
            const followupMessage = await this.generateFollowupMessage();
            steps.push({
                step: 'followup',
                prompt: 'Generate followup message',
                response: followupMessage,
                timestamp: new Date()
            });

            return {
                success: true,
                steps,
                finalResponse: generateResponse
            };
        } catch (error) {
            return {
                success: false,
                steps,
                error: error instanceof Error ? error.message : 'Unknown pipeline error'
            };
        }
    }
}

// --- Factory function ---

export function createBrandbookPipeline(
    apiKey: string,
    config: BrandbookPipelineConfig
): BrandbookAgentPipeline {
    return new BrandbookAgentPipeline(apiKey, config);
}
