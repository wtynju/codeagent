// 工具分发测试

import { ToolRegistry } from '../../src/tools';

describe('ToolRegistry', () => {
  const registry = new ToolRegistry();

  it('注册了 6 个默认工具', () => {
    const defs = registry.getDefinitions();
    expect(defs).toHaveLength(6);
    const names = defs.map(d => d.name);
    expect(names).toContain('read_file');
    expect(names).toContain('write_file');
    expect(names).toContain('execute_shell');
    expect(names).toContain('run_tests');
    expect(names).toContain('search_code');
    expect(names).toContain('list_files');
  });

  it('未知工具返回错误', async () => {
    const result = await registry.dispatch('unknown_tool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('未知工具');
  });

  it('read_file 缺少参数返回错误', async () => {
    const result = await registry.dispatch('read_file', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('缺少参数');
  });
});