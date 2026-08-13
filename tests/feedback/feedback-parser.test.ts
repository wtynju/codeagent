// 反馈解析器测试

import { FeedbackParser } from '../../src/feedback/feedback-parser';

describe('FeedbackParser', () => {
  const parser = new FeedbackParser();

  it('检测测试失败', () => {
    const feedback = parser.parse({
      success: false,
      error: 'FAIL src/index.test.ts\n  AssertionError: expected 1 to equal 2',
      exitCode: 1,
    });
    expect(feedback).not.toBeNull();
    expect(feedback!.status).toBe('fail');
    expect(feedback!.failures.length).toBeGreaterThan(0);
  });

  it('检测运行成功', () => {
    const feedback = parser.parse({
      success: true,
      data: 'Tests passed: 5 passed',
      exitCode: 0,
    });
    expect(feedback).not.toBeNull();
    expect(feedback!.status).toBe('pass');
  });

  it('检测超时', () => {
    const feedback = parser.parse({
      success: false,
      error: 'TIMEOUT: 执行超时',
      exitCode: null,
    });
    expect(feedback).not.toBeNull();
    expect(feedback!.status).toBe('fail');
    expect(feedback!.failures[0].category).toBe('TIMEOUT');
  });

  it('空输入返回 null', () => {
    const feedback = parser.parse(null);
    expect(feedback).toBeNull();
  });
});