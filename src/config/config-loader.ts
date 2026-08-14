// 配置加载
// 加载 codeagent.config.json，合并默认配置

import * as fs from 'fs';
import * as path from 'path';
import { defaultConfig } from './default-config';

export interface CodeAgentConfig {
  max_rounds: number;
  model: string;
  work_dir: string;
  guardrail_rules: Array<{
    pattern: string;
    description: string;
    level: 'DENY' | 'NEED_APPROVAL';
  }>;
  allowed_tools: string[];
  approval_timeout: number;
  memory_enabled: boolean;
  log_level: string;
}

export class ConfigLoader {
  private config: CodeAgentConfig;

  constructor(configPath?: string) {
    this.config = { ...defaultConfig };
    this.load(configPath);
  }

  private load(configPath?: string): void {
    const paths = configPath
      ? [configPath]
      : [path.join(process.cwd(), 'codeagent.config.json')];

    for (const cp of paths) {
      try {
        if (fs.existsSync(cp)) {
          const raw = JSON.parse(fs.readFileSync(cp, 'utf-8'));
          this.config = { ...this.config, ...raw };
          return;
        }
      } catch {
        // 跳过无效文件
      }
    }
  }

  get<T>(key: string): T {
    return (this.config as any)[key] as T;
  }

  getAll(): CodeAgentConfig {
    return { ...this.config };
  }
}