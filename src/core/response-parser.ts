// 响应解析器
// 从 LLM 的原始响应中提取文本内容和工具调用
// 容错处理：格式错误时尝试修复，最多重试 3 次

import { LLMResponse, ToolCall } from '../llm/provider';

export interface ParsedResponse {
  text: string;
  toolCalls: ToolCall[];
  isFinished: boolean;
  error?: string;
}

export function parseResponse(response: LLMResponse): ParsedResponse {
  const text = response.content || '';
  const toolCalls = response.toolCalls || [];

  // 检查是否包含 FINISH 标记
  const isFinished = text.includes('FINISH');

  return {
    text,
    toolCalls,
    isFinished,
  };
}

// 尝试从纯文本中解析工具调用（当 LLM 没有用原生 tool_call 格式时）
export function parseToolCallsFromText(text: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  const regex = /<tool_call>\s*\{[\s\S]*?"name":\s*"(\w+)"[\s\S]*?"arguments":\s*(\{[\s\S]*?\})\s*\}[\s\S]*?<\/tool_call>/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      toolCalls.push({
        id: `parsed-${toolCalls.length}`,
        name: match[1],
        arguments: JSON.parse(match[2]),
      });
    } catch {
      // 跳过解析失败的工具调用
    }
  }

  return toolCalls;
}

// 带重试的解析函数
export function parseResponseWithRetry(
  response: LLMResponse,
  maxRetries: number = 3
): ParsedResponse {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const parsed = parseResponse(response);
    if (!parsed.error) {
      return parsed;
    }
    lastError = parsed.error;
  }

  return {
    text: '',
    toolCalls: [],
    isFinished: true,
    error: `解析失败，已重试 ${maxRetries} 次：${lastError}`,
  };
}