// 读取文件内容

import { ToolResult } from './index';
import * as fs from 'fs';
import * as path from 'path';

export async function readFile(params: Record<string, unknown>): Promise<ToolResult> {
  const filePath = params.path as string;
  if (!filePath) {
    return { success: false, error: '缺少参数: path' };
  }

  const resolvedPath = path.resolve(filePath);
  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    return { success: true, data: content };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { success: false, error: `文件不存在: ${filePath}` };
    }
    return { success: false, error: `读取文件失败: ${err.message}` };
  }
}