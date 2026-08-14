// Agent 主循环
// 核心流程：组装上下文 → 调用 LLM → 解析动作 → 工具分发 → 回灌结果 → 停机判断

import { LLMProvider, Message, LLMResponse } from '../llm/provider';
import { MockLLMProvider } from '../llm/mock-provider';
import { buildContext } from './context-builder';
import { parseResponseWithRetry } from './response-parser';
import { ToolRegistry } from '../tools';
import { GuardrailEngine } from '../governance/guardrail-engine';
import { HITLStateMachine } from '../governance/hitl-state-machine';
import { AuditLogger } from '../governance/audit-log';
import { FeedbackParser } from '../feedback/feedback-parser';
import { ConfigLoader } from '../config/config-loader';

export interface MainLoopOptions {
  task: string;
  workDir: string;
  llmProvider: LLMProvider;
  maxRounds?: number;
  config?: ConfigLoader;
  onRound?: (round: number, status: string) => void;
  onApprovalNeeded?: (action: string, params: string) => Promise<boolean>;
}

export interface MainLoopResult {
  success: boolean;
  rounds: number;
  reason: string;
  messages: Message[];
  auditLogUrl?: string;
}

export class MainLoop {
  private toolRegistry: ToolRegistry;
  private guardrail: GuardrailEngine;
  private hitl: HITLStateMachine;
  private auditLogger: AuditLogger;
  private feedbackParser: FeedbackParser;

  constructor(
    toolRegistry: ToolRegistry,
    guardrail: GuardrailEngine,
    hitl: HITLStateMachine,
    auditLogger: AuditLogger,
    feedbackParser: FeedbackParser,
  ) {
    this.toolRegistry = toolRegistry;
    this.guardrail = guardrail;
    this.hitl = hitl;
    this.auditLogger = auditLogger;
    this.feedbackParser = feedbackParser;
  }

  async run(options: MainLoopOptions): Promise<MainLoopResult> {
    const {
      task,
      workDir,
      llmProvider,
      maxRounds = 20,
      onRound,
      onApprovalNeeded,
    } = options;

    // 空任务拒绝
    if (!task || task.trim() === '') {
      return { success: false, rounds: 0, reason: '空任务拒绝执行', messages: [] };
    }

    const messages: Message[] = [];
    const sessionId = `session-${Date.now()}`;
    let consecutiveNoToolCalls = 0;

    for (let round = 1; round <= maxRounds; round++) {
      onRound?.(round, 'running');

      // 1. 组装上下文
      const context = buildContext({
        task,
        workDir,
        tools: this.toolRegistry.getDefinitions(),
        history: messages,
      });

      // 2. 调用 LLM（带重试）
      let response: LLMResponse;
      try {
        response = await this.callLLMWithRetry(llmProvider, context);
      } catch (err) {
        return {
          success: false,
          rounds: round,
          reason: `LLM 调用失败：${err}`,
          messages,
        };
      }

      // 3. 解析响应（带格式错误重试，最多 3 次）
      const parsed = parseResponseWithRetry(response, 3);

      // 格式错误处理
      if (parsed.error) {
        // 重新调用 LLM 重试（已在 parseResponseWithRetry 内置重试次数）
        // 如果仍然失败，则停机
        return {
          success: false,
          rounds: round,
          reason: `LLM 返回格式错误：${parsed.error}`,
          messages,
        };
      }

      // 记录对话
      messages.push({
        role: 'assistant',
        content: parsed.text,
      });

      // 4. 检查是否 FINISH
      if (parsed.isFinished) {
        onRound?.(round, 'completed');
        return {
          success: true,
          rounds: round,
          reason: 'LLM 返回 FINISH 标记',
          messages,
        };
      }

      // 5. 处理工具调用
      if (parsed.toolCalls.length > 0) {
        consecutiveNoToolCalls = 0;

        for (const toolCall of parsed.toolCalls) {
          // 5a. 护栏检查
          const decision = this.guardrail.check(
            toolCall.name,
            toolCall.arguments,
            workDir,
          );

          // 审计日志
          const auditId = this.auditLogger.log({
            sessionId,
            toolName: toolCall.name,
            toolParams: JSON.stringify(toolCall.arguments),
            guardrailDecision: decision,
          });

          if (decision === 'DENY') {
            this.auditLogger.updateExecution(auditId, 'DENIED', 'skipped', '操作被拒绝');
            messages.push({
              role: 'tool',
              content: `操作被拒绝：${toolCall.name}`,
            });
            continue;
          }

          if (decision === 'NEED_APPROVAL') {
            // 触发 HITL
            this.hitl.requestApproval(toolCall.name, toolCall.arguments);

            let approved = false;
            if (onApprovalNeeded) {
              approved = await onApprovalNeeded(
                toolCall.name,
                JSON.stringify(toolCall.arguments),
              );
            }

            if (approved) {
              this.hitl.approve();
            } else {
              this.hitl.deny();
              this.auditLogger.updateExecution(auditId, 'DENIED', 'skipped', '审批未通过');
              messages.push({
                role: 'tool',
                content: `操作被拒绝（审批未通过）：${toolCall.name}`,
              });
              continue;
            }
          }

          // 5b. 执行工具
          try {
            const result = await this.toolRegistry.dispatch(
              toolCall.name,
              toolCall.arguments,
            );

            // 更新审计日志执行结果
            this.auditLogger.updateExecution(
              auditId,
              'APPROVED',
              result.success ? 'success' : 'failed',
              result.error,
            );

            // 5c. 反馈解析
            const feedback = this.feedbackParser.parse(result);

            // 5d. 回灌结果
            messages.push({
              role: 'tool',
              content: JSON.stringify(result),
            });

            if (feedback) {
              messages.push({
                role: 'tool',
                content: `[FEEDBACK] ${JSON.stringify(feedback)}`,
              });
            }
          } catch (err) {
            this.auditLogger.updateExecution(auditId, 'APPROVED', 'failed', String(err));
            messages.push({
              role: 'tool',
              content: `工具执行失败：${err}`,
            });
          }
        }
      } else {
        consecutiveNoToolCalls++;
        // 连续 3 轮无工具调用，询问用户是否继续
        if (consecutiveNoToolCalls >= 3) {
          if (onApprovalNeeded) {
            const shouldContinue = await onApprovalNeeded(
              'continue',
              '连续3轮无工具调用，是否继续等待？'
            );
            if (shouldContinue) {
              consecutiveNoToolCalls = 0;
              continue;
            }
          }
          return {
            success: false,
            rounds: round,
            reason: '连续 3 轮无工具调用，用户选择终止',
            messages,
          };
        }
      }
    }

    // 达到最大轮数
    return {
      success: false,
      rounds: maxRounds,
      reason: `达到最大轮数（${maxRounds}）`,
      messages,
    };
  }

  private async callLLMWithRetry(
    provider: LLMProvider,
    messages: Message[],
    maxRetries: number = 3,
  ): Promise<LLMResponse> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await provider.complete(messages);
      } catch (err) {
        lastError = err as Error;
        // 指数退避
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError || new Error('LLM 调用失败');
  }
}