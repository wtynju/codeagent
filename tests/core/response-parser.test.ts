// 响应解析器测试

import { parseResponse, parseToolCallsFromText } from '../../src/core/response-parser';

describe('parseResponse', () => {
  it('解析纯文本响应', () => {
    const result = parseResponse({
      content: '正在读取文件...',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5 },
    });
    expect(result.text).toBe('正在读取文件...');
    expect(result.toolCalls).toHaveLength(0);
    expect(result.isFinished).toBe(false);
  });

  it('检测 FINISH 标记', () => {
    const result = parseResponse({
      content: '任务完成。FINISH',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5 },
    });
    expect(result.isFinished).toBe(true);
  });

  it('提取工具调用', () => {
    const result = parseResponse({
      content: '执行命令',
      toolCalls: [{
        id: 'call-1',
        name: 'execute_shell',
        arguments: { command: 'ls -la' },
      }],
      finishReason: 'tool_calls',
      usage: { promptTokens: 10, completionTokens: 10 },
    });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe('execute_shell');
  });

  it('空响应', () => {
    const result = parseResponse({
      content: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    });
    expect(result.text).toBe('');
    expect(result.toolCalls).toHaveLength(0);
  });
});

describe('parseToolCallsFromText', () => {
  it('从文本中提取工具调用', () => {
    const text = `<tool_call>{"name": "read_file", "arguments": {"path": "test.txt"}}</tool_call>`;
    const calls = parseToolCallsFromText(text);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('read_file');
  });
});