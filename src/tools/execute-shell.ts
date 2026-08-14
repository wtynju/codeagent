// 执行 shell 命令

import { ToolResult } from './index';
import { execSync } from 'child_process';

export async function executeShell(params: Record<string, unknown>, workDir?: string): Promise<ToolResult> {
  const command = params.command as string;
  const cwd = params.cwd as string | undefined;

  if (!command) return { success: false, error: '缺少参数: command' };

  try {
    const stdout = execSync(command, {
      cwd: cwd || workDir || process.cwd(),
      timeout: 120000,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return { success: true, data: stdout, exitCode: 0 };
  } catch (err: any) {
    return {
      success: false,
      data: err.stdout || '',
      error: err.stderr || err.message,
      exitCode: err.status || 1,
    };
  }
}