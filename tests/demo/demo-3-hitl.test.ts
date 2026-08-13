// 机制演示 3: HITL 审批流程
// 确定性测试，使用 mock LLM，不依赖真实 LLM

import { HITLStateMachine } from '../../src/governance/hitl-state-machine';

describe('机制演示 3: HITL 审批流程', () => {
  it('完整审批流程: 请求→批准→执行', () => {
    const hitl = new HITLStateMachine(5000);

    // 初始状态
    expect(hitl.getState()).toBe('IDLE');
    console.log('  ✓ 初始状态: IDLE');

    // 触发审批
    hitl.requestApproval('execute_shell', { command: 'rm -rf ./node_modules' });
    expect(hitl.getState()).toBe('PENDING');
    console.log('  ✓ 触发审批后: PENDING');

    // 用户批准
    hitl.approve();
    expect(hitl.getState()).toBe('APPROVED');
    expect(hitl.isApproved()).toBe(true);
    console.log('  ✓ 批准后: APPROVED');
  });

  it('完整审批流程: 请求→拒绝→跳过', () => {
    const hitl = new HITLStateMachine(5000);

    hitl.requestApproval('execute_shell', { command: 'sudo rm' });
    expect(hitl.getState()).toBe('PENDING');

    hitl.deny();
    expect(hitl.getState()).toBe('DENIED');
    expect(hitl.isDenied()).toBe(true);
    console.log('  ✓ 拒绝后: DENIED');
  });

  it('超时自动拒绝', async () => {
    const hitl = new HITLStateMachine(100); // 100ms 超时

    hitl.requestApproval('execute_shell', { command: 'sudo rm' });
    expect(hitl.getState()).toBe('PENDING');

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(hitl.getState()).toBe('TIMEOUT');
    expect(hitl.isDenied()).toBe(true);
    console.log('  ✓ 超时后: TIMEOUT');
  });
});