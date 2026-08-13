// 机制演示 2: 反馈闭环驱动自我修正
// 确定性测试，使用 mock LLM，不依赖真实 LLM

import { FeedbackParser } from '../../src/feedback/feedback-parser';

describe('机制演示 2: 反馈闭环驱动自我修正', () => {
  const parser = new FeedbackParser();

  it('识别测试失败并提供结构化反馈', () => {
    const feedback = parser.parse({
      success: false,
      data: 'FAIL src/index.test.ts\n  AssertionError: expected 1 to equal 2\n  at Object.<anonymous> (src/index.test.ts:10:5)',
      error: 'Tests failed: 1 passed, 1 failed',
      exitCode: 1,
    });

    expect(feedback).not.toBeNull();
    expect(feedback!.status).toBe('fail');
    expect(feedback!.failures.length).toBeGreaterThan(0);
    expect(feedback!.failures[0].category).toBe('TEST_FAILURE');
    console.log('  ✓ 测试失败被正确识别为 TEST_FAILURE');
  });

  it('识别编译错误并提供反馈', () => {
    const feedback = parser.parse({
      success: false,
      data: 'src/index.ts(10,5): error TS2322: Type \'string\' is not assignable to type \'number\'',
      error: 'Build failed',
      exitCode: 2,
    });

    expect(feedback).not.toBeNull();
    expect(feedback!.status).toBe('fail');
    expect(feedback!.failures.length).toBeGreaterThan(0);
    console.log('  ✓ 编译错误被正确识别');
  });

  it('成功执行时返回 pass', () => {
    const feedback = parser.parse({
      success: true,
      data: 'Tests passed: 5 passed, 0 failed',
      exitCode: 0,
    });

    expect(feedback).not.toBeNull();
    expect(feedback!.status).toBe('pass');
    expect(feedback!.failures).toHaveLength(0);
    console.log('  ✓ 成功执行返回 pass');
  });
});