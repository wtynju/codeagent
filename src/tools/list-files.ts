// 列出目录文件

import { ToolResult } from './index';
import * as fs from 'fs';
import * as path from 'path';

export async function listFiles(params: Record<string, unknown>): Promise<ToolResult> {
  const dirPath = params.path as string;

  if (!dirPath) return { success: false, error: '缺少参数: path' };

  const resolvedPath = path.resolve(dirPath);

  try {
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `目录不存在: ${dirPath}` };
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return { success: false, error: `不是目录: ${dirPath}` };
    }

    const files = fs.readdirSync(resolvedPath, { withFileTypes: true });
    const listing = files.map(f => {
      const type = f.isDirectory() ? 'dir/' : f.isSymbolicLink() ? 'link' : 'file';
      return `${type}  ${f.name}`;
    }).join('\n');

    return { success: true, data: listing || '目录为空' };
  } catch (err: any) {
    return { success: false, error: `列出文件失败: ${err.message}` };
  }
}