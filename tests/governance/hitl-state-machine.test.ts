// HITL 状态机测试（确定性测试）

import { HITLStateMachine } from '../../src/governance/hitl-state-machine';

describe('HITLStateMachine', () => {
  it('初始状态为 IDLE', () => {
    const hitl = new HITLStateMachine();
    expect(hitl.getState()).toBe('IDLE');
  });

  it('触发审批后状态变为 PENDING', () => {
    const hitl = new HITLStateMachine();
    hitl.requestApproval('execute_shell', { command: 'rm -rf /tmp' });
    expect(hitl.getState()).toBe('PENDING');
  });

  it('批准后状态变为 APPROVED', () => {
    const hitl = new HITLStateMachine();
    hitl.requestApproval('execute_shell', { command: 'rm -rf /tmp' });
    hitl.approve();
    expect(hitl.getState()).toBe('APPROVED');
  });

  it('拒绝后状态变为 DENIED', () => {
    const hitl = new HITLStateMachine();
    hitl.requestApproval('execute_shell', { command: 'rm -rf /tmp' });
    hitl.deny();
    expect(hitl.getState()).toBe('DENIED');
  });

  it('超时后状态变为 TIMEOUT', async () => {
    const hitl = new HITLStateMachine(100); // 100ms 超时
    hitl.requestApproval('execute_shell', { command: 'rm -rf /tmp' });
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(hitl.getState()).toBe('TIMEOUT');
  });

  it('reset 后回到 IDLE', () => {
    const hitl = new HITLStateMachine();
    hitl.requestApproval('execute_shell', { command: 'rm -rf /tmp' });
    hitl.reset();
    expect(hitl.getState()).toBe('IDLE');
  });

  it('保存当前请求信息', () => {
    const hitl = new HITLStateMachine();
    hitl.requestApproval('execute_shell', { command: 'sudo rm' });
    const request = hitl.getCurrentRequest();
    expect(request).not.toBeNull();
    expect(request!.toolName).toBe('execute_shell');
  });
});