// OpenAI Provider
// 封装 OpenAI API 调用

import OpenAI from 'openai';
import { LLMProvider, LLMResponse, LLMOptions, Message } from './provider';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(messages: Message[], options?: LLMOptions): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4o',
      max_tokens: options?.maxTokens || 4096,
      messages: messages.map(m => ({
        role: m.role === 'tool' ? 'tool' : m.role,
        content: m.content,
        tool_call_id: m.toolCallId,
      })) as any,
      tools: options?.tools?.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      })),
    });

    const choice = response.choices[0];
    return {
      content: choice?.message?.content || '',
      toolCalls: choice?.message?.tool_calls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      })),
      finishReason: choice?.finish_reason === 'stop' ? 'stop'
        : choice?.finish_reason === 'tool_calls' ? 'tool_calls'
        : 'stop',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
      },
    };
  }
}