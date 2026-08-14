// 沙箱策略
// 确保文件操作限制在用户指定的工作目录内

import * as path from 'path';

export function isPathInWorkspace(targetPath: string, workDir: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedWorkDir = path.resolve(workDir);

  // 加尾部分隔符防止前缀误匹配（如 /home/user/project2 匹配 /home/user/project）
  const prefix = resolvedWorkDir.endsWith(path.sep) ? resolvedWorkDir : resolvedWorkDir + path.sep;
  const target = resolvedTarget.endsWith(path.sep) ? resolvedTarget : resolvedTarget;

  return target === resolvedWorkDir || target.startsWith(prefix);
}

export function resolveSafePath(targetPath: string, workDir: string): string {
  const resolved = path.resolve(targetPath);
  if (!isPathInWorkspace(resolved, workDir)) {
    throw new Error(`路径超出工作目录范围: ${targetPath}`);
  }
  return resolved;
}

export function getWorkspaceBoundary(workDir: string): string {
  return path.resolve(workDir);
}

export function isSymlinkEscape(targetPath: string, workDir: string): boolean {
  try {
    const fs = require('fs');
    const realPath = fs.realpathSync(targetPath);
    const realWorkDir = fs.realpathSync(workDir);
    return !realPath.startsWith(realWorkDir);
  } catch {
    return !isPathInWorkspace(targetPath, workDir);
  }
}