import { OpenAIClient, type GenerateImageOptions } from './openai-client';

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
        /** Chat model for text (e.g. gpt-3.5-turbo, gpt-4o-mini). Image generation uses separate API (DALL-E). */
        model?: string;
        /** DALL·E model for image generation (e.g. dall-e-3). */
        dalleModel?: GenerateImageOptions['model'];
        /** DALL·E image size (e.g. 1024x1024). */
        dalleSize?: GenerateImageOptions['size'];
        /** DALL·E preview size (e.g. 512x512). */
        dallePreviewSize?: GenerateImageOptions['size'];
        /** DALL·E image quality (standard | hd). */
        dalleQuality?: GenerateImageOptions['quality'];
        /** DALL·E image style (vivid | natural). */
        dalleStyle?: GenerateImageOptions['style'];
    };
}

export interface BrandbookPipelineInput {
    productBundle: string;
    preferences?: string[] | undefined;
    logoFileId?: string | undefined;
    outputLanguage?: string | undefined;
    watermarkText?: string | undefined;
    contactBlock?: string | undefined;
}

export interface BrandbookPipelineStep {
    step: 'intake' | 'logoCheck' | 'generate' | 'image' | 'qa' | 'followup';
    prompt: string;
    response?: string | undefined;
    error?: string | undefined;
    timestamp: Date;
}

export interface BrandbookPipelineImageResult {
    b64Json: string;
    revisedPrompt?: string;
}

export interface BrandbookPipelineResult {
    success: boolean;
    steps: BrandbookPipelineStep[];
    finalResponse?: string;
    image?: BrandbookPipelineImageResult;
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
        this.client = new OpenAIClient(apiKey, { model: config.parameters?.model ?? 'gpt-3.5-turbo' });
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
     * Generate image based on the generated prompt (DALL·E)
     */
    async generateImage(prompt: string): Promise<BrandbookPipelineImageResult> {
        const image = await this.client.generateImage(prompt, {
            model: this.config.parameters.dalleModel ?? 'dall-e-3',
            size: this.config.parameters.dallePreviewSize ?? this.config.parameters.dalleSize ?? '512x512',
            quality: this.config.parameters.dalleQuality ?? 'standard',
            style: this.config.parameters.dalleStyle ?? 'vivid',
            responseFormat: 'b64_json'
        });

        return image;
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
                    error: logoCheck.ok ? undefined : logoCheck.message,
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

            // Step 3.5: Generate image
            const imageResult = await this.generateImage(generateResponse);
            steps.push({
                step: 'image',
                prompt: 'Generate image',
                response: imageResult.revisedPrompt || 'Image generated',
                timestamp: new Date()
            });

            // Step 4: QA
            const qaResult = await this.runQualityCheck(generateResponse);
            steps.push({
                step: 'qa',
                prompt: 'Run quality check',
                response: qaResult.feedback,
                error: qaResult.passed ? undefined : qaResult.feedback,
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
                finalResponse: generateResponse,
                image: imageResult
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
