// 主循环测试（使用 mock LLM）

import { MainLoop } from '../../src/core/main-loop';
import { MockLLMProvider } from '../../src/llm/mock-provider';
import { ToolRegistry } from '../../src/tools';
import { GuardrailEngine } from '../../src/governance/guardrail-engine';
import { HITLStateMachine } from '../../src/governance/hitl-state-machine';
import { AuditLogger } from '../../src/governance/audit-log';
import { FeedbackParser } from '../../src/feedback/feedback-parser';
import { makeToolCallResponse, makeFinishResponse } from '../fixtures/mock-responses';
import * as path from 'path';
import * as fs from 'fs';

const TEST_AUDIT_DB = path.join(__dirname, '../test-audit.db');

describe('MainLoop', () => {
  let mock: MockLLMProvider;
  let loop: MainLoop;

  beforeEach(() => {
    mock = new MockLLMProvider();
    const toolRegistry = new ToolRegistry();
    const guardrail = new GuardrailEngine();
    const hitl = new HITLStateMachine(5000);
    const auditLogger = new AuditLogger(TEST_AUDIT_DB);
    const feedbackParser = new FeedbackParser();
    loop = new MainLoop(toolRegistry, guardrail, hitl, auditLogger, feedbackParser);
  });

  afterEach(() => {
    try { fs.unlinkSync(TEST_AUDIT_DB); } catch {}
  });

  it('空任务拒绝执行', async () => {
    const result = await loop.run({
      task: '',
      workDir: process.cwd(),
      llmProvider: mock,
    });
    expect(result.success).toBe(false);
    expect(result.reason).toContain('空任务');
  });

  it('收到 FINISH 后正常停机', async () => {
    mock.setNextResponse(makeFinishResponse());

    const result = await loop.run({
      task: '测试任务',
      workDir: process.cwd(),
      llmProvider: mock,
    });
    expect(result.success).toBe(true);
    expect(result.rounds).toBe(1);
    expect(result.reason).toContain('FINISH');
  });

  it('达到最大轮数后停机', async () => {
    // 预设 3 轮无工具调用的响应
    mock.setNextResponses([
      { content: '思考中...', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5 } },
      { content: '继续思考...', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5 } },
      { content: '还在思考...', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5 } },
    ]);

    const result = await loop.run({
      task: '测试任务',
      workDir: process.cwd(),
      llmProvider: mock,
      maxRounds: 3,
    });
    expect(result.success).toBe(false);
    expect(result.reason).toContain('无工具调用');
  });
});