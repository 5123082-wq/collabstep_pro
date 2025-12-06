import OpenAI from 'openai';

export interface AIClient {
    generateText(prompt: string, options?: {
        maxTokens?: number;
        temperature?: number;
        systemPrompt?: string;
    }): Promise<string>;
}

export class OpenAIClient implements AIClient {
    private client: OpenAI;

    constructor(apiKey: string) {
        // Используется только на сервере, поэтому dangerouslyAllowBrowser не нужен
        this.client = new OpenAI({
            apiKey: apiKey
        });
    }

    async generateText(prompt: string, options?: {
        maxTokens?: number;
        temperature?: number;
        systemPrompt?: string;
    }): Promise<string> {
        try {
            const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

            if (options?.systemPrompt) {
                messages.push({ role: 'system', content: options.systemPrompt });
            }

            messages.push({ role: 'user', content: prompt });

            const response = await this.client.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 1000,
            });

            const content = response.choices[0]?.message?.content || '';
            
            if (!content) {
                throw new Error('OpenAI returned empty response');
            }
            
            return content;
        } catch (error: unknown) {
            console.error('OpenAI API Error:', error);
            
            // Более детальная обработка ошибок
            if (error instanceof OpenAI.APIError) {
                if (error.status === 401) {
                    throw new Error('Invalid OpenAI API key. Please check your .env.local file.');
                }
                if (error.status === 429) {
                    throw new Error('OpenAI API rate limit exceeded. Please try again later.');
                }
                if (error.status === 500 || error.status === 502 || error.status === 503) {
                    throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
                }
                throw new Error(`OpenAI API error (${error.status}): ${error.message || 'Unknown error'}`);
            }
            
            // Если это ошибка сети или другая ошибка
            if (error instanceof Error) {
                throw new Error(`Failed to generate text from OpenAI: ${error.message}`);
            }
            
            throw new Error('Failed to generate text from OpenAI: Unknown error');
        }
    }
}
