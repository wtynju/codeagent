// 沙箱策略测试

import { isPathInWorkspace, resolveSafePath } from '../../src/governance/sandbox';
import * as path from 'path';

describe('sandbox', () => {
  const workDir = '/home/user/project';

  describe('isPathInWorkspace', () => {
    it('工作目录内路径返回 true', () => {
      expect(isPathInWorkspace('/home/user/project/src/index.ts', workDir)).toBe(true);
    });

    it('工作目录外路径返回 false', () => {
      expect(isPathInWorkspace('/etc/passwd', workDir)).toBe(false);
    });

    it('子目录路径返回 true', () => {
      expect(isPathInWorkspace('/home/user/project/node_modules/pkg/index.js', workDir)).toBe(true);
    });
  });

  describe('resolveSafePath', () => {
    it('工作目录内路径正常返回', () => {
      const result = resolveSafePath('/home/user/project/file.ts', workDir);
      expect(result).toBe(path.resolve('/home/user/project/file.ts'));
    });

    it('工作目录外路径抛出异常', () => {
      expect(() => resolveSafePath('/etc/passwd', workDir)).toThrow();
    });
  });
});