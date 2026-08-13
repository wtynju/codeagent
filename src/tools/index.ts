// 工具注册与分发器

import { ToolDefinition } from '../llm/provider';
import { readFile } from './read-file';
import { writeFile } from './write-file';
import { executeShell } from './execute-shell';
import { runTests } from './run-tests';
import { searchCode } from './search-code';
import { listFiles } from './list-files';

export interface ToolResult {
  success: boolean;
  data?: string;
  error?: string;
  exitCode?: number;
}

export type ToolFunction = (params: Record<string, unknown>) => Promise<ToolResult>;

export class ToolRegistry {
  private tools: Map<string, { fn: ToolFunction; definition: ToolDefinition }> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    this.register('read_file', readFile, {
      name: 'read_file',
      description: '读取文件内容',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string', description: '文件路径' } },
        required: ['path'],
      },
    });

    this.register('write_file', writeFile, {
      name: 'write_file',
      description: '写入或创建文件',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          content: { type: 'string', description: '要写入的内容' },
        },
        required: ['path', 'content'],
      },
    });

    this.register('execute_shell', executeShell, {
      name: 'execute_shell',
      description: '执行 shell 命令',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: '要执行的命令' },
          cwd: { type: 'string', description: '工作目录，可选' },
        },
        required: ['command'],
      },
    });

    this.register('run_tests', runTests, {
      name: 'run_tests',
      description: '运行测试套件',
      inputSchema: {
        type: 'object',
        properties: { testCommand: { type: 'string', description: '测试命令，默认 npm test' } },
        required: [],
      },
    });

    this.register('search_code', searchCode, {
      name: 'search_code',
      description: '搜索代码库',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: '搜索模式' },
          path: { type: 'string', description: '搜索路径，默认当前目录' },
        },
        required: ['pattern'],
      },
    });

    this.register('list_files', listFiles, {
      name: 'list_files',
      description: '列出目录文件',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string', description: '目录路径' } },
        required: ['path'],
      },
    });
  }

  register(name: string, fn: ToolFunction, definition: ToolDefinition): void {
    this.tools.set(name, { fn, definition });
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async dispatch(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `未知工具: ${name}` };
    }
    try {
      return await tool.fn(params);
    } catch (err) {
      return { success: false, error: `工具执行异常: ${err}` };
    }
  }
}