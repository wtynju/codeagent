// 机制演示 1: 护栏拦截危险动作
// 确定性测试，使用 mock LLM，不依赖真实 LLM

import { GuardrailEngine } from '../../src/governance/guardrail-engine';

describe('机制演示 1: 护栏拦截危险动作', () => {
  const workDir = '/home/user/project';

  it('DENY: 递归删除根目录', () => {
    const guardrail = new GuardrailEngine();
    const result = guardrail.check('execute_shell', { command: 'rm -rf /' }, workDir);
    expect(result).toBe('DENY');
    console.log('  ✓ rm -rf / 被拦截 (DENY)');
  });

  it('DENY: fork 炸弹', () => {
    const guardrail = new GuardrailEngine();
    const result = guardrail.check('execute_shell', { command: ':(){ :|:& };:' }, workDir);
    expect(result).toBe('DENY');
    console.log('  ✓ fork 炸弹被拦截 (DENY)');
  });

  it('NEED_APPROVAL: sudo 命令', () => {
    const guardrail = new GuardrailEngine();
    const result = guardrail.check('execute_shell', { command: 'sudo rm -rf /tmp' }, workDir);
    expect(result).toBe('NEED_APPROVAL');
    console.log('  ✓ sudo 命令触发审批 (NEED_APPROVAL)');
  });

  it('ALLOW: 安全命令放行', () => {
    const guardrail = new GuardrailEngine();
    const result = guardrail.check('execute_shell', { command: 'npm test' }, workDir);
    expect(result).toBe('ALLOW');
    console.log('  ✓ npm test 放行 (ALLOW)');
  });
});