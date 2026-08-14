// 审计日志
// 记录所有操作的护栏判定、审批结果和执行结果

import Database from 'better-sqlite3';
import * as path from 'path';

export interface AuditEntry {
  sessionId: string;
  toolName: string;
  toolParams: string;
  guardrailDecision: string;
  approvalResult?: string;
  executionResult?: string;
  error?: string;
}

export class AuditLogger {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const dbFile = dbPath || path.join(process.cwd(), 'codeagent-audit.db');
    this.db = new Database(dbFile);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        tool_name TEXT NOT NULL,
        tool_params TEXT,
        guardrail_decision TEXT NOT NULL,
        approval_result TEXT,
        execution_result TEXT,
        error TEXT
      )
    `);
  }

  log(entry: AuditEntry): number {
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (session_id, tool_name, tool_params, guardrail_decision, approval_result, execution_result, error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      entry.sessionId,
      entry.toolName,
      this.sanitize(entry.toolParams),
      entry.guardrailDecision,
      entry.approvalResult || null,
      entry.executionResult || null,
      entry.error || null,
    );
    return result.lastInsertRowid as number;
  }

  // 更新最后一条记录的审批结果和执行结果
  updateExecution(id: number, approvalResult: string, executionResult: string, error?: string): void {
    this.db.prepare('UPDATE audit_log SET approval_result = ?, execution_result = ?, error = ? WHERE id = ?')
      .run(approvalResult, executionResult, error || null, id);
  }

  getBySession(sessionId: string): AuditEntry[] {
    return this.db.prepare('SELECT * FROM audit_log WHERE session_id = ? ORDER BY timestamp DESC').all(sessionId) as any[];
  }

  getRecent(limit: number = 50): AuditEntry[] {
    return this.db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?').all(limit) as any[];
  }

  close(): void {
    this.db.close();
  }

  private sanitize(params: string): string {
    return params
      .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***')
      .replace(/api_key[=:]\s*["']?[^"',&\s]+/gi, 'api_key=***')
      .replace(/password[=:]\s*["']?[^"',&\s]+/gi, 'password=***');
  }
}