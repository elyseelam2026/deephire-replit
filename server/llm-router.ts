/**
 * Multi-LLM Router
 * Provides unified interface to multiple LLM providers
 * Supports: Grok (xAI), OpenAI (GPT-4o), Claude (Anthropic)
 */

import OpenAI from "openai";

export type LLMProvider = 'grok' | 'openai' | 'claude';

const grokClient = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY
});

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
});

const claudeClient = new OpenAI({
  apiKey: process.env.CLAUDE_API_KEY || '',
  baseURL: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com/v1'
});

function getClient(provider: LLMProvider): OpenAI {
  switch (provider) {
    case 'grok':
      return grokClient;
    case 'openai':
      return openaiClient;
    case 'claude':
      return claudeClient;
    default:
      return grokClient;
  }
}

function getModel(provider: LLMProvider): string {
  switch (provider) {
    case 'grok':
      return 'grok-2-1212';
    case 'openai':
      return 'gpt-4o';
    case 'claude':
      return 'claude-3-5-sonnet-20241022';
    default:
      return 'grok-2-1212';
  }
}

export async function callLLM(
  provider: LLMProvider,
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' | 'text' };
  }
) {
  const client = getClient(provider);
  const model = getModel(provider);

  const callOptions: any = {
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens || 2000
  };

  if (options?.responseFormat?.type === 'json_object') {
    callOptions.response_format = { type: 'json_object' };
  }

  const response = await client.chat.completions.create(callOptions);
  return response.choices[0].message.content || '';
}

/**
 * Helper to get list of available providers with their status
 */
export function getAvailableProviders(): Array<{ provider: LLMProvider; available: boolean; model: string }> {
  return [
    {
      provider: 'grok',
      available: !!process.env.XAI_API_KEY,
      model: 'grok-2-1212'
    },
    {
      provider: 'openai',
      available: !!process.env.OPENAI_API_KEY,
      model: 'gpt-4o'
    },
    {
      provider: 'claude',
      available: !!process.env.CLAUDE_API_KEY,
      model: 'claude-3-5-sonnet-20241022'
    }
  ];
}

/**
 * Get the default provider (first available, fallback to Grok)
 */
export function getDefaultProvider(): LLMProvider {
  const available = getAvailableProviders().filter(p => p.available);
  return available.length > 0 ? available[0].provider : 'grok';
}
