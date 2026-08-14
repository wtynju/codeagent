// 运行测试套件

import { ToolResult } from './index';
import { execSync } from 'child_process';

export async function runTests(params: Record<string, unknown>, workDir?: string): Promise<ToolResult> {
  const testCommand = (params.testCommand as string) || 'npm test';

  try {
    const stdout = execSync(testCommand, {
      cwd: process.cwd(),
      timeout: 300000,
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