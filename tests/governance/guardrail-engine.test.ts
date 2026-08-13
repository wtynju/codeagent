// 护栏引擎测试（确定性测试，不依赖 LLM）

import { GuardrailEngine } from '../../src/governance/guardrail-engine';

describe('GuardrailEngine', () => {
  const guardrail = new GuardrailEngine();
  const workDir = '/home/user/project';

  describe('命令黑名单', () => {
    it('拦截 rm -rf /', () => {
      const result = guardrail.check('execute_shell', { command: 'rm -rf /' }, workDir);
      expect(result).toBe('DENY');
    });

    it('拦截 rm -rf /*', () => {
      const result = guardrail.check('execute_shell', { command: 'rm -rf /*' }, workDir);
      expect(result).toBe('DENY');
    });

    it('放行普通命令', () => {
      const result = guardrail.check('execute_shell', { command: 'ls -la' }, workDir);
      expect(result).toBe('ALLOW');
    });

    it('放行 npm test', () => {
      const result = guardrail.check('execute_shell', { command: 'npm test' }, workDir);
      expect(result).toBe('ALLOW');
    });

    it('需要审批 sudo', () => {
      const result = guardrail.check('execute_shell', { command: 'sudo rm file' }, workDir);
      expect(result).toBe('NEED_APPROVAL');
    });
  });

  describe('路径边界', () => {
    it('允许工作目录内读文件', () => {
      const result = guardrail.check('read_file', { path: '/home/user/project/src/index.ts' }, workDir);
      expect(result).toBe('ALLOW');
    });

    it('工作目录外写文件需要审批', () => {
      const result = guardrail.check('write_file', { path: '/etc/passwd' }, workDir);
      expect(result).toBe('NEED_APPROVAL');
    });
  });

  describe('自定义规则', () => {
    it('支持添加自定义规则', () => {
      const custom = new GuardrailEngine([
        { pattern: /dangerous-tool/, description: '自定义危险工具', level: 'DENY' },
      ]);
      const result = custom.check('execute_shell', { command: 'dangerous-tool' }, workDir);
      expect(result).toBe('DENY');
    });
  });
});