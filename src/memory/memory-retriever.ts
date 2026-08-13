// 记忆检索
// 根据当前上下文和任务检索相关记忆

import { MemoryStore, MemoryEntry } from './memory-store';

export class MemoryRetriever {
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  retrieve(task: string, context?: string): MemoryEntry[] {
    // 合并任务和上下文中的关键词
    const keywords = [task, context || '']
      .filter(Boolean)
      .join(' ')
      .split(/[\s,，。；;：:！!？?、\/\\]+/)
      .filter(t => t.length > 1)
      .slice(0, 10);

    if (keywords.length === 0) return [];

    return this.store.search(keywords.join(' '));
  }

  getProjectConventions(): MemoryEntry[] {
    return this.store.getByType('convention');
  }

  getDecisions(): MemoryEntry[] {
    return this.store.getByType('decision');
  }

  getPreferences(): MemoryEntry[] {
    return this.store.getByType('preference');
  }
}