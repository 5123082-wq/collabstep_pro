import OpenAI from 'openai';

export interface AIClient {
    generateText(prompt: string, options?: {
        maxTokens?: number;
        temperature?: number;
        systemPrompt?: string;
    }): Promise<string>;
    generateImage(prompt: string, options?: GenerateImageOptions): Promise<GenerateImageResult>;
}

export interface OpenAIClientOptions {
    /** Chat model for text generation (e.g. gpt-3.5-turbo, gpt-4o-mini). Default: gpt-3.5-turbo */
    model?: string;
}

export interface GenerateImageOptions {
    /** Image model (e.g. dall-e-3). Default: dall-e-3 */
    model?: OpenAI.Images.ImageGenerateParams['model'];
    /** Image size (e.g. 1024x1024) */
    size?: OpenAI.Images.ImageGenerateParams['size'];
    /** Image quality (standard or hd) */
    quality?: OpenAI.Images.ImageGenerateParams['quality'];
    /** Image style (vivid or natural) */
    style?: OpenAI.Images.ImageGenerateParams['style'];
    /** Response format (b64_json or url). Default: b64_json */
    responseFormat?: OpenAI.Images.ImageGenerateParams['response_format'];
}

export interface GenerateImageResult {
    b64Json: string;
    revisedPrompt?: string;
}

export class OpenAIClient implements AIClient {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, options?: OpenAIClientOptions) {
        // Используется только на сервере, поэтому dangerouslyAllowBrowser не нужен
        this.client = new OpenAI({
            apiKey: apiKey
        });
        this.model = options?.model ?? 'gpt-3.5-turbo';
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
                model: this.model,
                messages: messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 1000,
            });

            const content = response.choices[0]?.message?.content || '';
            
            if (!content) {
                throw new Error('OpenAI returned empty response');
            }
            
            return content;
        } catch (err: unknown) {
            console.error('OpenAI API Error:', err);

            if (err instanceof OpenAI.APIError) {
                if (err.status === 401) {
                    throw new Error('Invalid OpenAI API key. Please check your .env.local file.');
                }
                if (err.status === 429) {
                    throw new Error('OpenAI API rate limit exceeded. Please try again later.');
                }
                if (err.status === 500 || err.status === 502 || err.status === 503) {
                    throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
                }
                throw new Error(`OpenAI API error (${err.status}): ${err.message || 'Unknown error'}`);
            }

            if (err instanceof Error) {
                throw new Error(`Failed to generate text from OpenAI: ${err.message}`);
            }

            throw new Error('Failed to generate text from OpenAI: Unknown error');
        }
    }

    async generateImage(prompt: string, options?: GenerateImageOptions): Promise<GenerateImageResult> {
        try {
            const request = {
                model: options?.model ?? 'dall-e-3',
                prompt,
                n: 1,
                ...(options?.size ? { size: options.size } : {}),
                ...(options?.quality ? { quality: options.quality } : {}),
                ...(options?.style ? { style: options.style } : {}),
                response_format: options?.responseFormat ?? 'b64_json'
            } satisfies OpenAI.Images.ImageGenerateParams;

            const response = await this.client.images.generate(request);
            const image = response.data?.[0];

            if (!image?.b64_json) {
                throw new Error('OpenAI returned empty image data');
            }

            return {
                b64Json: image.b64_json,
                ...(image.revised_prompt ? { revisedPrompt: image.revised_prompt } : {})
            };
        } catch (err: unknown) {
            console.error('OpenAI Images API Error:', err);

            if (err instanceof OpenAI.APIError) {
                if (err.status === 401) {
                    throw new Error('Invalid OpenAI API key. Please check your .env.local file.');
                }
                if (err.status === 429) {
                    throw new Error('OpenAI API rate limit exceeded. Please try again later.');
                }
                if (err.status === 500 || err.status === 502 || err.status === 503) {
                    throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
                }
                throw new Error(`OpenAI API error (${err.status}): ${err.message || 'Unknown error'}`);
            }

            if (err instanceof Error) {
                throw new Error(`Failed to generate image from OpenAI: ${err.message}`);
            }

            throw new Error('Failed to generate image from OpenAI: Unknown error');
        }
    }
}
