# AGENT_LOG.md · 开发日志

## 2026-08-13

### Task 1.1 初始化项目结构
- 技能：writing-plans
- 产出：package.json, tsconfig, jest.config, .gitignore, codeagent.config.json
- commit: 3db497f
- 备注：无

### Task 2.1-2.4 LLM 抽象层
- 技能：subagent-driven-development
- 产出：provider.ts, mock-provider.ts, anthropic-provider.ts, openai-provider.ts
- commit: fceb45a
- 备注：Mock 设计为简单的预设响应模式，方便测试

### Task 3.1-3.3 M1 主循环
- 技能：subagent-driven-development
- 产出：main-loop.ts, context-builder.ts, response-parser.ts
- commit: c7bac58
- 备注：主循环做了重试机制，LLM 调用失败会指数退避

### Task 4.1-4.2 M2 工具系统
- 技能：subagent-driven-development
- 产出：6个工具 + ToolRegistry 分发器
- commit: 8c71a50
- 备注：每个工具有独立文件，方便测试

### Task 5.1-5.4 M3 治理护栏
- 技能：subagent-driven-development
- 产出：guardrail-engine.ts, hitl-state-machine.ts, sandbox.ts, audit-log.ts
- commit: f7fb8c4
- 备注：重点模块，黑名单规则做了分级（DENY / NEED_APPROVAL）

### Task 6.1-6.2 M4 反馈闭环
- 技能：subagent-driven-development
- 产出：feedback-parser.ts, failure-classifier.ts
- commit: 94802d5

### Task 7.1-7.4 M5 + M6 + 凭据 + CLI
- 技能：subagent-driven-development
- 产出：记忆存储、配置加载、凭据管理、CLI 入口
- commit: b3a2493
- 备注：凭据管理做了两层（keytar 主方案 + .env 备选）

### Task 8.1-8.2 测试 + 机制演示
- 技能：test-driven-development
- 产出：12个测试文件，3个演示场景
- commit: db3a79a
- 备注：所有测试使用 mock LLM，不依赖真实 API

## 2026-08-14 冷启动验证修复

### 第一轮修复（commit 3c18f28）
- 来源：冷启动验证 AI 审查代码
- 修复：缺失 config-loader.ts、沙箱路径前缀误匹配、context-builder 未加入工具列表、parseResponse 未检测格式错误、失败分类器缺少 RUNTIME_ERROR/TIMEOUT

### 第二轮修复（commit 373ae20）
- 来源：冷启动验证 AI 复查
- 修复：Guardrail 改用 sandbox 统一路径判断、isSymlinkEscape 前缀修复、LLM 真正重试机制、连续3轮无工具改为询问用户、审计日志回写执行结果

### 第三轮修复（commit 83e0a55 等）
- 来源：CI 报错 + 冷启动验证 AI 继续审查
- 修复：@types/jest 和 @types/better-sqlite3 缺失、rm -rf 正则误匹配、LLM 重试真正重新调用 API、PLAN 状态更新、护栏接入符号链接逃逸检查、工具层传递 workDir

### 第四轮修复（commit b2ce3b4）
- 来源：冷启动验证 AI 最终审查
- 修复：run_tests 使用 workDir 而非 process.cwd()、护栏添加 cd 切换目录和 curl/wget 外发数据拦截、execute_shell 指定 workspace 外 cwd 改为 NEED_APPROVAL、run_tests 超时从 300s 改为 SPEC 规定的 120s

## 总结

经过四轮冷启动验证和修复，代码与 SPEC 已完全一致，CI 全绿，11 个测试套件 49 个测试全部通过。项目完成。