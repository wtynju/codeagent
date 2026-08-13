// 反馈解析器
// 解析工具输出，生成结构化反馈，驱动 agent 自我修正

import { classifyFailure, FailureInfo } from './failure-classifier';

export interface Feedback {
  status: 'pass' | 'fail';
  failures: FailureInfo[];
  summary: string;
}

export class FeedbackParser {
  parse(output: unknown): Feedback | null {
    if (!output) return null;

    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);

    // 检查是否超时
    if (outputStr.includes('timeout') || outputStr.includes('TIMEOUT')) {
      return {
        status: 'fail',
        failures: [{
          category: 'TIMEOUT',
          message: '执行超时',
        }],
        summary: '操作超时',
      };
    }

    // 检查退出码
    const exitCodeMatch = outputStr.match(/exitCode["']?\s*[:=]\s*(\d+)/);
    if (exitCodeMatch && parseInt(exitCodeMatch[1]) !== 0) {
      const code = parseInt(exitCodeMatch[1]);

      // 分类失败类型
      const failures = classifyFailure(outputStr);

      if (failures.length > 0) {
        return {
          status: 'fail',
          failures,
          summary: `退出码 ${code}，${failures.length} 个失败`,
        };
      }

      return {
        status: 'fail',
        failures: [{
          category: 'RUNTIME_ERROR',
          message: `命令退出码: ${code}`,
        }],
        summary: `运行错误，退出码 ${code}`,
      };
    }

    // 检查测试输出中的失败标记
    if (outputStr.includes('FAIL') || outputStr.includes('AssertionError')) {
      const failures = classifyFailure(outputStr);

      return {
        status: 'fail',
        failures,
        summary: `测试失败，${failures.length} 个失败`,
      };
    }

    // 检查编译错误
    if (outputStr.includes('error TS') || outputStr.includes('Error:')) {
      const failures = classifyFailure(outputStr);
      if (failures.length > 0) {
        return {
          status: 'fail',
          failures,
          summary: `编译错误，${failures.length} 个错误`,
        };
      }
    }

    // 检查 lint 错误
    if (outputStr.includes('ESLint') || outputStr.includes('lint')) {
      const failures = classifyFailure(outputStr);
      if (failures.length > 0) {
        return {
          status: 'fail',
          failures,
          summary: `Lint 错误，${failures.length} 个错误`,
        };
      }
    }

    // 没有检测到失败
    return {
      status: 'pass',
      failures: [],
      summary: '执行成功',
    };
  }
}