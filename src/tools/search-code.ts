// 搜索代码库

import { ToolResult } from './index';
import { execSync } from 'child_process';
import * as path from 'path';

export async function searchCode(params: Record<string, unknown>): Promise<ToolResult> {
  const pattern = params.pattern as string;
  const searchPath = (params.path as string) || '.';

  if (!pattern) return { success: false, error: '缺少参数: pattern' };

  try {
    const resolvedPath = path.resolve(searchPath);
    const stdout = execSync(`grep -r -n "${pattern}" "${resolvedPath}" --include="*.ts" --include="*.js" --include="*.json" 2>/dev/null || echo "无匹配结果"`, {
      timeout: 30000,
      encoding: 'utf-8',
    });
    return { success: true, data: stdout || '无匹配结果' };
  } catch (err: any) {
    return { success: false, error: `搜索失败: ${err.message}` };
  }
}