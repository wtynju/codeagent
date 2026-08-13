// keytar 凭据存储（OS 凭据管理器）

import { CredentialManager, CredentialInfo } from './credential-manager';

let keytar: any = null;
try {
  keytar = require('keytar');
} catch {}

const SERVICE_NAME = 'codeagent';

export class KeytarStore implements CredentialManager {
  async save(provider: string, apiKey: string): Promise<void> {
    if (!keytar) throw new Error('keytar 不可用，请使用 env-store');
    await keytar.setPassword(SERVICE_NAME, provider, apiKey);
  }

  async get(provider: string): Promise<string | null> {
    if (!keytar) return null;
    return await keytar.getPassword(SERVICE_NAME, provider);
  }

  async status(): Promise<CredentialInfo[]> {
    if (!keytar) return [];
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    return credentials.map((c: any) => ({
      provider: c.account,
      keyPreview: `...${c.password.slice(-4)}`,
    }));
  }

  async clear(provider: string): Promise<void> {
    if (!keytar) return;
    await keytar.deletePassword(SERVICE_NAME, provider);
  }

  async clearAll(): Promise<void> {
    if (!keytar) return;
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    for (const c of credentials) {
      await keytar.deletePassword(SERVICE_NAME, c.account);
    }
  }
}