// 凭据管理接口

export interface CredentialInfo {
  provider: string;
  keyPreview: string;
}

export interface CredentialManager {
  save(provider: string, apiKey: string): Promise<void>;
  get(provider: string): Promise<string | null>;
  status(): Promise<CredentialInfo[]>;
  clear(provider: string): Promise<void>;
  clearAll(): Promise<void>;
}