// Mock LLM 预设响应（测试用）

import { LLMResponse } from '../../src/llm/provider';

export function makeToolCallResponse(toolName: string, args: Record<string, unknown>): LLMResponse {
  return {
    content: `使用工具: ${toolName}`,
    toolCalls: [{
      id: `call-${Date.now()}`,
      name: toolName,
      arguments: args,
    }],
    finishReason: 'tool_calls',
    usage: { promptTokens: 10, completionTokens: 10 },
  };
}

export function makeTextResponse(text: string): LLMResponse {
  return {
    content: text,
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 10 },
  };
}

export function makeFinishResponse(): LLMResponse {
  return {
    content: '任务完成。FINISH',
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 5 },
  };
}