// 上下文组装器
// 把系统提示、用户任务、工具列表、历史消息、记忆拼成 LLM 输入格式

import { Message, ToolDefinition } from '../llm/provider';

export interface ContextInput {
  task: string;
  workDir: string;
  tools: ToolDefinition[];
  history: Message[];
  memory?: string[];
  maxRecentRounds?: number;
}

const SYSTEM_PROMPT = `你是一个编码助手 agent，运行在 CodeAgent harness 框架中。

你可以使用以下工具来完成编码任务：
- read_file: 读取文件内容
- write_file: 写入或创建文件
- execute_shell: 执行 shell 命令
- run_tests: 运行测试套件
- search_code: 搜索代码库
- list_files: 列出目录文件

工作流程：
1. 理解用户的任务
2. 使用工具探索代码库、读取文件、执行命令
3. 根据结果调整方案
4. 每次修改代码后运行测试验证
5. 任务完成后回复 FINISH

注意：
- 所有文件操作应在工作目录内进行
- 执行危险命令前会被要求审批
- 如果测试失败，请根据错误信息修正代码`;

export function buildContext(input: ContextInput): Message[] {
  const messages: Message[] = [];

  // 系统提示
  messages.push({
    role: 'system',
    content: SYSTEM_PROMPT,
  });

  // 记忆
  if (input.memory && input.memory.length > 0) {
    messages.push({
      role: 'system',
      content: '相关记忆：\n' + input.memory.map(m => `- ${m}`).join('\n'),
    });
  }

  // 工具列表
  if (input.tools.length > 0) {
    const toolDescriptions = input.tools.map(t =>
      `- ${t.name}: ${t.description}`
    ).join('\n');
    messages.push({
      role: 'system',
      content: `可用工具：\n${toolDescriptions}`,
    });
  }

  // 用户任务
  messages.push({
    role: 'user',
    content: `工作目录：${input.workDir}\n\n任务：${input.task}`,
  });

  // 最近 N 轮对话历史
  const maxRounds = input.maxRecentRounds || 10;
  if (input.history.length > 0) {
    const recent = input.history.slice(-maxRounds * 2); // 每轮 user + assistant
    messages.push(...recent);
  }

  return messages;
}