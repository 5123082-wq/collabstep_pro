# AI Integration Setup

## Configuration

### 1. OpenAI API Key

Create a `.env.local` file in the `apps/web` directory with the following:

```bash
OPENAI_API_KEY=sk-proj-your-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

### 2. Optional Configuration

```bash

# AI Feature Flag

NEXT_PUBLIC_FEATURE_AI_V1=true
FEATURE_AI_V1=true

# Model Configuration

OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

### 3. Models Available

- `gpt-3.5-turbo` - Fast and cost-effective (recommended for development)
- `gpt-4` - More capable but slower and more expensive
- `gpt-4-turbo` - Balance between capability and speed

## Usage

See the documentation in each module:
- `client.ts` - Basic LLM client
- `prompts.ts` - Prompt templates
- `chat.ts` - Chat integration
- `deadline-reminder.ts` - Deadline reminders

## Cost Optimization

1. Use `gpt-3.5-turbo` for simple tasks
2. Set appropriate `max_tokens` limits
3. Implement caching for repetitive queries
4. Use rate limiting to control costs

