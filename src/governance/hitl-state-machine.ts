// HITL 审批状态机
// Human-in-the-Loop，agent 执行危险操作前暂停等待人工确认
// 状态转移：IDLE → PENDING → APPROVED/DENIED/TIMEOUT → IDLE

export type HITLState = 'IDLE' | 'PENDING' | 'APPROVED' | 'DENIED' | 'TIMEOUT';

export interface ApprovalRequest {
  toolName: string;
  params: Record<string, unknown>;
  timestamp: Date;
}

export class HITLStateMachine {
  private state: HITLState = 'IDLE';
  private currentRequest: ApprovalRequest | null = null;
  private timeoutMs: number;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private onTimeoutCallback: (() => void) | null = null;

  constructor(timeoutMs: number = 300000) {
    this.timeoutMs = timeoutMs;
  }

  getState(): HITLState {
    return this.state;
  }

  getCurrentRequest(): ApprovalRequest | null {
    return this.currentRequest;
  }

  requestApproval(toolName: string, params: Record<string, unknown>): void {
    this.state = 'PENDING';
    this.currentRequest = { toolName, params, timestamp: new Date() };

    this.timeoutHandle = setTimeout(() => {
      if (this.state === 'PENDING') {
        this.state = 'TIMEOUT';
        this.onTimeoutCallback?.();
      }
    }, this.timeoutMs);
  }

  approve(): void {
    if (this.state !== 'PENDING') return;
    this.clearTimeout();
    this.state = 'APPROVED';
  }

  deny(): void {
    if (this.state !== 'PENDING') return;
    this.clearTimeout();
    this.state = 'DENIED';
  }

  reset(): void {
    this.clearTimeout();
    this.state = 'IDLE';
    this.currentRequest = null;
  }

  onTimeout(callback: () => void): void {
    this.onTimeoutCallback = callback;
  }

  isApproved(): boolean {
    return this.state === 'APPROVED';
  }

  isDenied(): boolean {
    return this.state === 'DENIED' || this.state === 'TIMEOUT';
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }
}