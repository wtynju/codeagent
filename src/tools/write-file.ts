// 写入或创建文件

import { ToolResult } from './index';
import * as fs from 'fs';
import * as path from 'path';

export async function writeFile(params: Record<string, unknown>, workDir?: string): Promise<ToolResult> {
  const filePath = params.path as string;
  const content = params.content as string;

  if (!filePath) return { success: false, error: '缺少参数: path' };
  if (content === undefined) return { success: false, error: '缺少参数: content' };

  const resolvedPath = path.resolve(workDir || process.cwd(), filePath);
  try {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(resolvedPath, content, 'utf-8');
    return { success: true, data: `文件写入成功: ${filePath}` };
  } catch (err: any) {
    return { success: false, error: `写入文件失败: ${err.message}` };
  }
}