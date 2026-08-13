// 失败分类器
// 识别工具输出中的失败类型

export type FailureCategory = 'TEST_FAILURE' | 'COMPILE_ERROR' | 'LINT_ERROR' | 'RUNTIME_ERROR' | 'TIMEOUT';

export interface FailureInfo {
  category: FailureCategory;
  message: string;
  file?: string;
  line?: number;
}

export function classifyFailure(output: string): FailureInfo[] {
  const failures: FailureInfo[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // 测试失败
    const testMatch = line.match(/FAIL\s+(.+?\.test\.\w+)/);
    if (testMatch) {
      failures.push({
        category: 'TEST_FAILURE',
        message: `测试失败: ${testMatch[1]}`,
        file: testMatch[1],
      });
      continue;
    }

    // AssertionError
    if (line.includes('AssertionError') || line.includes(' expect(') || line.includes(' assert(')) {
      failures.push({
        category: 'TEST_FAILURE',
        message: line.trim(),
      });
      continue;
    }

    // 编译错误
    const compileMatch = line.match(/(\S+\.ts\(\d+,\d+\)): error/);
    if (compileMatch) {
      failures.push({
        category: 'COMPILE_ERROR',
        message: line.trim(),
        file: compileMatch[1],
      });
      continue;
    }

    // Lint 错误
    if (line.includes('ESLint') || line.includes('lint')) {
      const lintMatch = line.match(/(\S+\.\w+)\s*:\s*line\s*(\d+)/);
      if (lintMatch) {
        failures.push({
          category: 'LINT_ERROR',
          message: line.trim(),
          file: lintMatch[1],
          line: parseInt(lintMatch[2]),
        });
      }
    }
  }

  return failures;
}