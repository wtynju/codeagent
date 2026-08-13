// Anthropic Provider
// 封装 Anthropic API 调用

import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMResponse, LLMOptions, Message } from './provider';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(messages: Message[], options?: LLMOptions): Promise<LLMResponse> {
    const systemMsg = messages.find(m => m.role === 'system');
    const otherMsgs = messages.filter(m => m.role !== 'system');

    const response = await this.client.messages.create({
      model: options?.model || 'claude-sonnet-5-20250101',
      max_tokens: options?.maxTokens || 4096,
      system: systemMsg?.content,
      messages: otherMsgs.map(m => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.content,
      })) as any[],
      tools: options?.tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })),
    });

    return {
      content: response.content[0]?.type === 'text' ? response.content[0].text : '',
      toolCalls: response.content
        .filter((b: any) => b.type === 'tool_use')
        .map((b: any) => ({
          id: b.id,
          name: b.name,
          arguments: b.input as Record<string, unknown>,
        })),
      finishReason: response.stop_reason === 'end_turn' ? 'stop'
        : response.stop_reason === 'tool_use' ? 'tool_calls'
        : 'stop',
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
      },
    };
  }
}