// 凭据管理 CLI 命令

import * as readline from 'readline';
import { KeytarStore } from '../credentials/keytar-store';
import { EnvStore } from '../credentials/env-store';

function createStore() {
  let store: any;
  try {
    store = new (require('../credentials/keytar-store').KeytarStore)();
  } catch {
    store = new EnvStore();
  }
  return store;
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function askHidden(query: string): Promise<string> {
  // 简单隐藏输入（终端不回显）
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function runKeyCommands(args: string[]) {
  const subcommand = args[0];
  const store = createStore();

  switch (subcommand) {
    case 'set': {
      const provider = args[1] || (await askQuestion('Provider (anthropic/openai): '));
      const apiKey = await askHidden('API Key: ');
      if (!apiKey) {
        console.log('key 不能为空');
        return;
      }
      await store.save(provider, apiKey);
      console.log(`API key for ${provider} 已保存`);
      break;
    }

    case 'status': {
      const credentials = await store.status();
      if (credentials.length === 0) {
        console.log('未配置 API key');
        return;
      }
      console.log('已配置的 API key:');
      for (const c of credentials) {
        console.log(`  ${c.provider}: ${c.keyPreview}`);
      }
      break;
    }

    case 'clear': {
      const provider = args[1];
      if (!provider) {
        const answer = await askQuestion('清除所有 key? (y/N): ');
        if (answer.toLowerCase() === 'y') {
          await store.clearAll();
          console.log('所有 key 已清除');
        }
        return;
      }
      await store.clear(provider);
      console.log(`API key for ${provider} 已清除`);
      break;
    }

    default:
      console.log('用法: codeagent key set <provider> | status | clear [provider]');
  }
}