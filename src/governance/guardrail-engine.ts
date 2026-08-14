// 护栏引擎
// 检查工具调用是否安全，返回 ALLOW / NEED_APPROVAL / DENY
// 所有判定逻辑都是代码实现的，不依赖 LLM

import * as path from 'path';
import { isPathInWorkspace } from './sandbox';

export type GuardrailDecision = 'ALLOW' | 'NEED_APPROVAL' | 'DENY';

interface GuardrailRule {
  pattern: RegExp;
  description: string;
  level: 'DENY' | 'NEED_APPROVAL';
}

export class GuardrailEngine {
  private rules: GuardrailRule[] = [];

  constructor(customRules?: GuardrailRule[]) {
    this.rules = [
      // 绝对不能执行的命令
      { pattern: /rm\s+-rf\s+\/\s*$/, description: '递归删除根目录', level: 'DENY' },
      { pattern: /:\(\)\s*\{\s*:\|\:\&\s*\}\s*;:/, description: 'fork 炸弹', level: 'DENY' },
      { pattern: />\s*\/dev\/sda/, description: '覆写磁盘设备', level: 'DENY' },
      { pattern: /mkfs\./, description: '格式化文件系统', level: 'DENY' },
      { pattern: /dd\s+if=.*of=\/dev\//, description: '直接写入磁盘设备', level: 'DENY' },
      { pattern: /chmod\s+777\s+\//, description: '修改根目录权限', level: 'DENY' },

      // 需要审批的命令
      { pattern: /rm\s+-rf/, description: '强制递归删除', level: 'NEED_APPROVAL' },
      { pattern: /DROP\s+(TABLE|DATABASE)/i, description: '数据库删除', level: 'NEED_APPROVAL' },
      { pattern: /DELETE\s+FROM/i, description: '数据库删除', level: 'NEED_APPROVAL' },
      { pattern: /curl.*\|\s*(ba)?sh/, description: '远程脚本直接执行', level: 'NEED_APPROVAL' },
      { pattern: /wget.*\|\s*(ba)?sh/, description: '远程脚本直接执行', level: 'NEED_APPROVAL' },
      { pattern: /npm\s+publish/, description: 'npm 发布', level: 'NEED_APPROVAL' },
      { pattern: /git\s+push.*--force/, description: '强制推送', level: 'NEED_APPROVAL' },
      { pattern: /sudo\s/, description: 'sudo 提权', level: 'NEED_APPROVAL' },
      { pattern: /pip\s+install|npm\s+install\s+-g/, description: '全局安装包', level: 'NEED_APPROVAL' },
      { pattern: /shutdown|reboot|halt/, description: '系统关机重启', level: 'NEED_APPROVAL' },
    ];

    if (customRules) {
      this.rules.push(...customRules);
    }
  }

  check(toolName: string, params: Record<string, unknown>, workDir: string): GuardrailDecision {
    // 1. 命令黑名单检查（execute_shell）
    if (toolName === 'execute_shell') {
      const command = params.command as string;
      if (command) {
        const decision = this.checkCommand(command);
        if (decision !== 'ALLOW') return decision;
      }
    }

    // 2. 文件路径边界检查（read_file、write_file）
    if (toolName === 'read_file' || toolName === 'write_file') {
      const filePath = params.path as string;
      if (filePath) {
        const decision = this.checkPath(filePath, workDir, toolName === 'write_file');
        if (decision !== 'ALLOW') return decision;
      }
    }

    // 3. execute_shell 的 cwd 路径检查
    if (toolName === 'execute_shell' && params.cwd) {
      const decision = this.checkPath(params.cwd as string, workDir, false);
      if (decision !== 'ALLOW') return decision;
    }

    return 'ALLOW';
  }

  private checkCommand(command: string): GuardrailDecision {
    for (const rule of this.rules) {
      if (rule.pattern.test(command)) {
        return rule.level === 'DENY' ? 'DENY' : 'NEED_APPROVAL';
      }
    }
    return 'ALLOW';
  }

  private checkPath(filePath: string, workDir: string, isWrite: boolean): GuardrailDecision {
    // 使用 sandbox.ts 统一路径判断，修复前缀误匹配
    if (!isPathInWorkspace(filePath, workDir)) {
      return isWrite ? 'NEED_APPROVAL' : 'ALLOW';
    }

    // 系统路径检查
    const resolved = path.resolve(filePath);
    const systemPaths = [
      '/etc', '/usr', '/bin', '/sbin', '/boot', '/dev', '/proc', '/sys',
      'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)',
    ];

    for (const sysPath of systemPaths) {
      if (resolved.startsWith(path.resolve(sysPath) + path.sep)) {
        return 'NEED_APPROVAL';
      }
    }

    return 'ALLOW';
  }

  addRule(rule: GuardrailRule): void {
    this.rules.push(rule);
  }

  getRules(): GuardrailRule[] {
    return [...this.rules];
  }
}