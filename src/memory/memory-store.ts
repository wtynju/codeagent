// 记忆存储
// SQLite 存储，支持存、取、关键词检索

import Database from 'better-sqlite3';
import * as path from 'path';

export type MemoryType = 'convention' | 'decision' | 'error_experience' | 'preference';

export interface MemoryEntry {
  id?: number;
  type: MemoryType;
  content: string;
  tags: string;
  createdAt?: string;
  lastAccessedAt?: string;
}

export class MemoryStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const dbFile = dbPath || path.join(process.cwd(), 'codeagent-memory.db');
    this.db = new Database(dbFile);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  save(entry: MemoryEntry): number {
    const stmt = this.db.prepare('INSERT INTO memory (type, content, tags) VALUES (?, ?, ?)');
    const result = stmt.run(entry.type, entry.content, entry.tags);
    return result.lastInsertRowid as number;
  }

  search(keywords: string): MemoryEntry[] {
    const terms = keywords.split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) return [];

    // 用关键词匹配 content 或 tags
    const conditions = terms.map(() => '(content LIKE ? OR tags LIKE ?)');
    const params = terms.flatMap(t => [`%${t}%`, `%${t}%`]);

    const stmt = this.db.prepare(
      `SELECT * FROM memory WHERE ${conditions.join(' AND ')} ORDER BY last_accessed_at DESC LIMIT 20`
    );

    const results = stmt.all(...params) as MemoryEntry[];

    // 更新最后访问时间
    if (results.length > 0) {
      const idParams = results.map(r => r.id);
      this.db.prepare(`UPDATE memory SET last_accessed_at = datetime('now') WHERE id IN (${idParams.map(() => '?').join(',')})`)
        .run(...idParams);
    }

    return results;
  }

  getByType(type: MemoryType): MemoryEntry[] {
    return this.db.prepare('SELECT * FROM memory WHERE type = ? ORDER BY created_at DESC').all(type) as MemoryEntry[];
  }

  getAll(): MemoryEntry[] {
    return this.db.prepare('SELECT * FROM memory ORDER BY last_accessed_at DESC').all() as MemoryEntry[];
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM memory WHERE id = ?').run(id);
  }

  close(): void {
    this.db.close();
  }
}