// .env 文件凭据存储（备选）
// 注意：.env 是明文存储，存在安全风险，详见 README

import { CredentialManager, CredentialInfo } from './credential-manager';
import * as fs from 'fs';
import * as path from 'path';

export class EnvStore implements CredentialManager {
  private envPath: string;

  constructor(envPath?: string) {
    this.envPath = envPath || path.join(process.cwd(), '.env');
  }

  private readEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    try {
      if (!fs.existsSync(this.envPath)) return env;
      const content = fs.readFileSync(this.envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          env[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
        }
      }
    } catch {}
    return env;
  }

  private writeEnv(env: Record<string, string>): void {
    const content = Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    fs.writeFileSync(this.envPath, content, 'utf-8');
  }

  private keyFor(provider: string): string {
    return `CODEAGENT_${provider.toUpperCase()}_API_KEY`;
  }

  async save(provider: string, apiKey: string): Promise<void> {
    const env = this.readEnv();
    env[this.keyFor(provider)] = apiKey;
    this.writeEnv(env);
  }

  async get(provider: string): Promise<string | null> {
    const env = this.readEnv();
    return env[this.keyFor(provider)] || null;
  }

  async status(): Promise<CredentialInfo[]> {
    const env = this.readEnv();
    const result: CredentialInfo[] = [];
    const prefix = 'CODEAGENT_';
    const suffix = '_API_KEY';

    for (const [key, value] of Object.entries(env)) {
      if (key.startsWith(prefix) && key.endsWith(suffix)) {
        result.push({
          provider: key.slice(prefix.length, -suffix.length).toLowerCase(),
          keyPreview: `...${value.slice(-4)}`,
        });
      }
    }
    return result;
  }

  async clear(provider: string): Promise<void> {
    const env = this.readEnv();
    delete env[this.keyFor(provider)];
    this.writeEnv(env);
  }

  async clearAll(): Promise<void> {
    const env = this.readEnv();
    const prefix = 'CODEAGENT_';
    const suffix = '_API_KEY';
    for (const key of Object.keys(env)) {
      if (key.startsWith(prefix) && key.endsWith(suffix)) {
        delete env[key];
      }
    }
    this.writeEnv(env);
  }
}