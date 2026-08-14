# PLAN.md · CodeAgent 实现计划

> 由 writing-plans 产出，每完成一个 task 标记完成并附 commit hash。

## 整体顺序

先搭基础设施（LLM 抽象层、凭据管理），再实现核心模块（M1→M2→M3→M4→M5→M6），然后接 CLI，最后写测试和文档。M3（治理）是本项目的重点维度，花的时间会比其他模块多。

---

## 第1批：项目骨架

**Task 1.1** 初始化项目结构

- 目标：搭好 TypeScript + Jest 的骨架
- 涉及文件：package.json, tsconfig.json, jest.config.ts, .gitignore, codeagent.config.json, src/index.ts
- 验证：`npm install && npm test` 不报错
- 状态：已完成
- commit: 3db497f

---

## 第2批：LLM 抽象层

**Task 2.1** 定义 LLM Provider 接口

- 目标：在 src/llm/provider.ts 中定义 LLMProvider 接口和 LLMResponse 等类型
- 涉及文件：src/llm/provider.ts
- 验证：TypeScript 编译通过
- 状态：已完成

**Task 2.2** 实现 MockLLMProvider

- 目标：实现 MockLLMProvider，支持 setNextResponse 和 getHistory
- 涉及文件：src/llm/mock-provider.ts
- 验证：写测试，预设响应后调用 complete，断言返回预期内容
- 状态：已完成

**Task 2.3** 实现 AnthropicProvider 和 OpenAIProvider

- 目标：封装 Anthropic 和 OpenAI 的 API 调用
- 涉及文件：src/llm/anthropic-provider.ts, src/llm/openai-provider.ts
- 验证：用 mock 测试验证 SDK 调用正确
- 状态：已完成

---

## 第3批：M1 主循环

**Task 3.1** 实现上下文组装器

- 目标：把系统提示、任务、工具列表、历史消息、记忆拼接成 LLM 输入格式
- 涉及文件：src/core/context-builder.ts
- 验证：给定模拟输入，断言输出 messages 数组结构正确
- 状态：已完成

**Task 3.2** 实现响应解析器

- 目标：从 LLM 响应中提取文本内容和工具调用列表
- 涉及文件：src/core/response-parser.ts
- 验证：给定模拟 LLM 响应，断言解析结果正确
- 状态：已完成

**Task 3.3** 实现主循环

- 目标：MainLoop 类，完整走完"组装上下文→调用 LLM→解析→分发→回灌→停机"
- 涉及文件：src/core/main-loop.ts
- 验证：用 MockLLMProvider 预设 3 轮响应，断言循环执行 3 轮后停机
- 状态：已完成

---

## 第4批：M2 工具系统

**Task 4.1** 实现工具注册与分发器

- 目标：ToolRegistry 类，管理工具注册和 dispatch
- 涉及文件：src/tools/index.ts
- 验证：注册假工具，调用 dispatch 断言正确执行
- 状态：已完成

**Task 4.2** 实现六个工具

- 目标：read_file, write_file, execute_shell, run_tests, search_code, list_files
- 涉及文件：src/tools/read-file.ts, write-file.ts, execute-shell.ts, run-tests.ts, search-code.ts, list-files.ts
- 验证：每个工具写测试，验证正常路径和错误路径
- 状态：已完成

---

## 第5批：M3 治理护栏（重点）

**Task 5.1** 实现护栏引擎

- 目标：GuardrailEngine 类，check 方法返回 ALLOW/NEED_APPROVAL/DENY
- 涉及文件：src/governance/guardrail-engine.ts
- 验证：传入 `rm -rf /` 返回 DENY；传入 `ls` 返回 ALLOW
- 状态：已完成

**Task 5.2** 实现 HITL 状态机

- 目标：HITLStateMachine 类，状态在 IDLE/PENDING/APPROVED/DENIED/TIMEOUT 间转移
- 涉及文件：src/governance/hitl-state-machine.ts
- 验证：模拟批准/拒绝/超时，断言状态转移正确
- 状态：已完成

**Task 5.3** 实现沙箱策略

- 目标：isPathInWorkspace 函数，检查路径是否在工作目录内
- 涉及文件：src/governance/sandbox.ts
- 验证：工作目录内路径返回 true，外部路径返回 false
- 状态：已完成

**Task 5.4** 实现审计日志

- 目标：AuditLogger 类，操作记录写入 SQLite
- 涉及文件：src/governance/audit-log.ts
- 验证：写入记录后查询，断言字段正确
- 状态：已完成

---

## 第6批：M4 反馈闭环

**Task 6.1** 实现失败分类器

- 目标：classifyFailure 函数，识别 TEST_FAILURE、COMPILE_ERROR 等类型
- 涉及文件：src/feedback/failure-classifier.ts
- 验证：给定测试失败输出，断言分类为 TEST_FAILURE
- 状态：已完成

**Task 6.2** 实现反馈解析器

- 目标：FeedbackParser 类，解析工具输出并生成结构化反馈
- 涉及文件：src/feedback/feedback-parser.ts
- 验证：给定测试输出，断言反馈对象包含正确的 status 和 failures
- 状态：已完成

---

## 第7批：M5 + M6 + 凭据 + CLI

**Task 7.1** 实现记忆存储

- 目标：MemoryStore 类，支持存、取、按关键词检索
- 涉及文件：src/memory/memory-store.ts, src/memory/memory-retriever.ts
- 验证：存入记忆，按关键词能命中，无关关键词不命中
- 状态：已完成

**Task 7.2** 实现配置加载

- 目标：ConfigLoader 类，加载 codeagent.config.json
- 涉及文件：src/config/config-loader.ts, src/config/default-config.ts
- 验证：加载测试配置文件，断言配置项正确
- 状态：已完成

**Task 7.3** 实现凭据管理

- 目标：CredentialManager 接口，支持 set/status/clear 操作
- 涉及文件：src/credentials/credential-manager.ts, keytar-store.ts, env-store.ts
- 验证：用 mock 实现测试 set/status/clear 流程
- 状态：已完成

**Task 7.4** 实现 CLI 入口

- 目标：codeagent 命令的 CLI 界面
- 涉及文件：src/cli/index.ts, key-commands.ts, run-commands.ts
- 验证：`node dist/cli/index.js key status` 不报错
- 状态：已完成

---

## 第8批：测试 + 机制演示

**Task 8.1** 为核心模块写单元测试

- 目标：每个模块的确定性单元测试，全部用 mock LLM
- 涉及文件：tests/core/*.test.ts, tests/governance/*.test.ts, tests/feedback/*.test.ts, tests/memory/*.test.ts, tests/tools/*.test.ts
- 验证：`npm test` 全部通过
- 状态：已完成

**Task 8.2** 写机制演示

- 目标：三个演示测试——护栏拦截危险命令、反馈闭环驱动修正、HITL 审批流程
- 涉及文件：tests/demo/demo-1-guardrail.test.ts, demo-2-feedback.test.ts, demo-3-hitl.test.ts, tests/fixtures/mock-responses.ts
- 验证：三个演示测试全部通过
- 状态：已完成

---

## 第9批：Docker + CI + 文档

**Task 9.1** 写 Dockerfile

- 目标：多阶段构建，生成可运行的容器镜像
- 涉及文件：docker/Dockerfile
- 验证：`docker build -t codeagent .` 成功
- 状态：已完成

**Task 9.2** 配置 CI

- 目标：GitHub Actions，包含 unit-test job
- 涉及文件：.github/workflows/ci.yml
- 验证：push 后 CI 自动运行通过
- 状态：已完成

**Task 9.3** 写 README 和过程文档

- 目标：README.md 含简介、安装、运行、分发、key 安全配置、已知限制
- 涉及文件：README.md, SPEC_PROCESS.md, AGENT_LOG.md, REFLECTION.md
- 状态：已完成

---

## 依赖关系

```
第1批（骨架）
  └→ 第2批（LLM 抽象层）
       └→ 第3批（M1 主循环，依赖 LLM 接口）
            └→ 第4批（M2 工具系统，被主循环调用）
                 └→ 第5批（M3 治理，拦截工具调用）
                      └→ 第6批（M4 反馈，解析工具输出）
  └→ 第7批（M5+M6+凭据+CLI，可并行于第3-6批）
       └→ 第8批（测试，依赖所有模块完成）
            └→ 第9批（Docker+CI+文档，依赖测试通过）
```