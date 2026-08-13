// LLM 抽象接口
// 所有 LLM 供应商（真实或 mock）都实现这个接口

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LLMProvider {
  name: string;
  complete(messages: Message[], options?: LLMOptions): Promise<LLMResponse>;
}

// 根据配置创建 provider 实例
export function createProvider(providerName: string, apiKey: string): LLMProvider {
  switch (providerName) {
    case 'anthropic':
      return new (require('./anthropic-provider').AnthropicProvider)(apiKey);
    case 'openai':
      return new (require('./openai-provider').OpenAIProvider)(apiKey);
    default:
      throw new Error(`不支持的 provider: ${providerName}`);
  }
}