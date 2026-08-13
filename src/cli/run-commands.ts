// 运行 CLI 命令

import { ToolRegistry } from '../tools';
import { GuardrailEngine } from '../governance/guardrail-engine';
import { HITLStateMachine } from '../governance/hitl-state-machine';
import { AuditLogger } from '../governance/audit-log';
import { FeedbackParser } from '../feedback/feedback-parser';
import { MainLoop } from '../core/main-loop';
import { MockLLMProvider } from '../llm/mock-provider';
import { KeytarStore } from '../credentials/keytar-store';
import { EnvStore } from '../credentials/env-store';
import { ConfigLoader } from '../config/config-loader';

export async function runCommand(args: string[]) {
  const isDemo = args.includes('--demo');

  if (isDemo) {
    console.log('运行机制演示...\n');
    await runDemo();
    return;
  }

  const task = args.join(' ');
  if (!task) {
    console.log('请输入任务描述');
    console.log('用法: codeagent run "<任务描述>"');
    return;
  }

  // 获取 API key
  let apiKey: string | null = null;
  try {
    const store = new KeytarStore();
    apiKey = await store.get('anthropic');
  } catch {}
  if (!apiKey) {
    try {
      const store = new EnvStore();
      apiKey = await store.get('anthropic');
    } catch {}
  }

  if (!apiKey) {
    console.log('请先配置 API key: codeagent key set');
    return;
  }

  // 加载配置
  const config = new ConfigLoader();

  // 初始化各模块
  const toolRegistry = new ToolRegistry();
  const guardrail = new GuardrailEngine();
  const hitl = new HITLStateMachine(config.get<number>('approval_timeout'));
  const auditLogger = new AuditLogger();
  const feedbackParser = new FeedbackParser();

  // 创建主循环
  const loop = new MainLoop(toolRegistry, guardrail, hitl, auditLogger, feedbackParser);

  console.log('启动 CodeAgent...');
  console.log(`任务: ${task}`);
  console.log(`工作目录: ${config.get<string>('work_dir')}\n`);

  const result = await loop.run({
    task,
    workDir: config.get<string>('work_dir'),
    llmProvider: new (require('../llm/anthropic-provider').AnthropicProvider)(apiKey),
    maxRounds: config.get<number>('max_rounds'),
    onRound: (round, status) => {
      console.log(`[第 ${round} 轮] ${status === 'running' ? '运行中...' : status}`);
    },
    onApprovalNeeded: async (action, params) => {
      console.log(`\n⚠️  需要审批: ${action}`);
      console.log(`参数: ${params}`);
      console.log('批准? (y/N): ');
      // 从 stdin 读取
      return new Promise(resolve => {
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim().toLowerCase() === 'y');
        });
      });
    },
  });

  console.log(`\n完成。状态: ${result.success ? '成功' : '失败'}`);
  console.log(`轮数: ${result.rounds}`);
  console.log(`原因: ${result.reason}`);
}

async function runDemo() {
  const mock = new MockLLMProvider();

  // 演示 1: 护栏拦截
  console.log('演示 1: 护栏拦截危险命令');
  const guardrail = new GuardrailEngine();
  const result1 = guardrail.check('execute_shell', { command: 'rm -rf /' }, process.cwd());
  console.log(`  rm -rf / → ${result1}`);
  const result2 = guardrail.check('execute_shell', { command: 'ls' }, process.cwd());
  console.log(`  ls → ${result2}`);
  console.log('');

  // 演示 2: HITL 状态机
  console.log('演示 2: HITL 审批状态机');
  const hitl = new HITLStateMachine(1000);
  hitl.requestApproval('execute_shell', { command: 'rm -rf ./node_modules' });
  console.log(`  状态: ${hitl.getState()}`);
  hitl.approve();
  console.log(`  批准后: ${hitl.getState()}`);
  console.log('');

  // 演示 3: 反馈闭环
  console.log('演示 3: 反馈解析');
  const feedbackParser = new FeedbackParser();
  const feedback = feedbackParser.parse({ success: false, error: 'AssertionError: expected 1 to equal 2', exitCode: 1 });
  console.log(`  状态: ${feedback?.status}`);
  console.log(`  失败数: ${feedback?.failures.length}`);
  console.log('');

  console.log('所有演示完成');
}