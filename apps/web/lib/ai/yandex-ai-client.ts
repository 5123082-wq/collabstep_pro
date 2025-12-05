import { AIClient } from './openai-client';

export class YandexAIClient implements AIClient {
    private apiKey: string;
    private folderId: string;
    private modelUri: string;
    // ВНИМАНИЕ: Проверьте актуальный endpoint в документации Yandex Cloud AI
    // Возможные варианты:
    // - https://llm.api.cloud.yandex.net/foundationModels/v1/completion
    // - https://rest-assistant.api.cloud.yandex.net/v1/responses/create (текущий)
    private baseUrl = 'https://rest-assistant.api.cloud.yandex.net/v1';

    constructor(apiKey: string, folderId: string, modelUri: string = 'yandexgpt/latest') {
        this.apiKey = apiKey;
        this.folderId = folderId;
        this.modelUri = modelUri;
    }

    async generateText(prompt: string, options?: {
        maxTokens?: number;
        temperature?: number;
        systemPrompt?: string;
        previousResponseId?: string;
    }): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/responses/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: `gpt://${this.folderId}/${this.modelUri}`,
                    input: [{ role: 'user', content: prompt }],
                    instructions: options?.systemPrompt || '',
                    max_output_tokens: options?.maxTokens,
                    temperature: options?.temperature,
                    previous_response_id: options?.previousResponseId || null,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Yandex Cloud API Error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            return data.output_text || '';
        } catch (error) {
            console.error('Yandex Cloud API Error:', error);
            throw new Error('Failed to generate text from Yandex Cloud');
        }
    }
}
