# SPEC.md · CodeAgent — Coding Agent Harness

> 项目名称：CodeAgent
> 一句话：一个将 LLM 封装为安全可控编码智能体的驾驭框架，以治理（Governance）为核心深度。
> 遵循：Superpowers 七步工作流 · TDD · 凭据安全 · Docker 分发

---

## 一、问题陈述

### 1.1 要解决什么问题

现在的编码智能体（Claude Code、Cursor、GitHub Copilot 等）虽然好用，但普遍有三个工程问题：

1. 安全失控：agent 可以自由执行 shell 命令、删除文件、改代码，开发者只能靠系统提示词约束它。但提示词本质上不可靠，LLM 可能忽略、误解或者被注入绕过。
2. 反馈不可靠：agent 自我修正靠的是 LLM 自己判断对错，缺乏客观的、确定性的反馈信号。一句"请检查你的代码"远不如 `npm test` 的失败/通过结果来得实在。
3. 透明度不足：agent 内部决策过程不透明。开发者很难看清 agent 为什么执行了某个操作、它被拦截过吗、它的记忆里有什么。

CodeAgent 的解决思路是用代码实现机制，而不是用提示词描述机制。它是一个可编程的 harness 框架，让开发者用确定性的代码来定义 agent 的行为边界、反馈信号和治理策略。

### 1.2 目标用户

- 个人开发者：需要一个安全可控的编码助手，能放心让它执行命令，知道危险操作会被拦截
- 团队技术负责人：需要为团队配置统一的 agent 行为策略
- AI 工具链开发者：需要一个可嵌入的 harness 内核，作为构建更复杂 agent 系统的基础

### 1.3 为什么值得做

如果 agent 的行为完全依赖 LLM 的"自觉"，那 agent 越强大就越危险。CodeAgent 的命题是：工程师的真正价值不在写代码，而在定义"代码应该怎么写"的约束和反馈系统。这跟课程的核心命题是一致的。

---

## 二、用户故事

US1：作为一个开发者，我希望能用自然语言描述编码任务，让 agent 自主完成"写代码→跑测试→根据失败修正"的闭环，这样我可以专注于高层设计。

US2：作为一个安全管理员，我希望能配置危险命令黑名单（如 `rm -rf`、`DROP TABLE`），当 agent 尝试执行时自动拦截并弹出人工审批，而不是仅靠一句"请不要执行危险命令"的提示词。

US3：作为一个开发者，我希望能通过 CLI 查看 agent 的实时运行状态，当前正在执行什么、已完成了多少轮、哪些操作被拦截过。

US4：作为一个新用户，我首次运行 CodeAgent 时，能被引导安全地录入我的 LLM API key（隐藏输入），key 自动存入系统凭据管理器，绝对不会出现在代码或日志中。

US5：作为一个运维人员，我希望从 GitHub Release 下载后，用一条命令就能启动 CodeAgent，在全新机器上 5 分钟内跑起来。

US6：作为一个测试工程师，我希望能用 mock LLM 运行确定性测试，验证护栏、反馈闭环等核心机制在不依赖真实 LLM 的情况下正确工作，这样我可以确信机制本身是可靠的。

---

## 三、功能规约

### 3.1 模块总览

```
┌──────────────────────────────────────────────────┐
│                  CodeAgent Harness                │
│                                                  │
│  M1 · Agent 主循环                               │
│  M2 · 工具系统（动作/工具）                        │
│  M3 · 治理护栏 ★重点深入★                         │
│  M4 · 反馈闭环                                   │
│  M5 · 记忆系统                                   │
│  M6 · 配置管理                                   │
│                                                  │
│  基础设施：LLM 抽象层 · 凭据管理 · 日志            │
│  用户界面：CLI 命令行 · GitHub Release 分发        │
└──────────────────────────────────────────────────┘
```

---

### 3.2 M1 · Agent 主循环

职责：组织上下文 → 调用 LLM → 解析动作 → 分发执行 → 回灌结果 → 停机判断。

输入：用户任务（自然语言）、工作目录路径、配置规则。

行为：进入循环，每轮做这些事：组装上下文（系统提示 + 任务 + 可用工具 + 最近 N 轮对话 + 记忆），调用 LLM 抽象层获取响应，解析响应中的工具调用或文本回复，如果有工具调用就经治理护栏检查后分发到工具系统执行，把执行结果回灌给 LLM，判断是否满足停机条件。

输出：任务完成状态（成功/失败/超时）、完整对话历史、执行日志。

停机条件：LLM 输出 `FINISH` 标记；或达到最大轮数（可配置，默认 20）；或用户手动终止。

边界条件：空任务拒绝执行。LLM 返回格式错误时重试最多 3 次，仍失败则停机并报错。连续 3 轮无工具调用且无 FINISH 标记，主动询问用户。

错误处理：LLM API 调用失败，指数退避重试最多 3 次。工具执行失败，将错误信息回灌给 LLM，不中断循环。

---

### 3.3 M2 · 工具系统

职责：定义 agent 能执行的操作，接收主循环的调用请求，执行并返回结果。

六个工具：

- read_file：读取文件内容，参数 path，返回文件内容或错误信息
- write_file：写入/创建文件，参数 path 和 content，返回成功/失败
- execute_shell：执行 shell 命令，参数 command 和可选的 cwd，返回 stdout + stderr + exit code
- run_tests：运行测试套件，参数可选的 testCommand，返回测试结果（pass/fail + 详情）
- search_code：搜索代码库，参数 pattern 和可选的 path，返回匹配结果列表
- list_files：列出目录文件，参数 path，返回文件列表

输入：工具名 + 参数，由主循环从 LLM 响应中解析。

行为：验证工具名是否存在，验证参数类型和必需性，经治理护栏检查，执行工具操作，返回结果。

边界条件：未知工具返回错误。参数缺失或类型错误返回错误信息（含期望格式）。文件操作限制在工作目录内。

错误处理：工具执行超时（默认 120s）终止并返回超时错误。文件不存在返回明确错误信息。shell 命令执行失败返回 exit code + stderr。

---

### 3.4 M3 · 治理护栏（重点深入）

职责：在执行前拦截危险操作，触发人工审批（HITL），记录所有操作审计日志。这是本项目的 main contribution。

#### 3.4.1 护栏引擎

输入：待执行的工具调用（工具名 + 参数）。

行为：逐条检查顺序为——命令黑名单匹配（正则），文件路径边界检查（是否超出工作目录），操作权限级别检查，综合判定。

输出：ALLOW（直接执行）、NEED_APPROVAL（暂停等待人工确认）、DENY（拒绝执行并记录）。

内置黑名单规则：

- 递归删除根目录：`rm\s+-rf\s+/`，级别 DENY
- 强制删除：`rm\s+-rf`，级别 NEED_APPROVAL
- 数据库删除：`DROP\s+(TABLE|DATABASE)`，级别 NEED_APPROVAL
- 修改系统文件：路径包含 `/etc/`、`C:\Windows` 等，级别 NEED_APPROVAL
- 网络外发：`curl|wget` 发送数据，级别 NEED_APPROVAL
- fork 炸弹：`:(){ :|:& };:`，级别 DENY

#### 3.4.2 HITL 审批状态机

```
                  ┌─────────┐
                  │  IDLE   │
                  └────┬────┘
                       │ 护栏返回 NEED_APPROVAL
                  ┌────▼────┐
           ┌──────│PENDING  │──────┐
           │      └────┬────┘      │
           │ 用户拒绝   │ 用户批准   │ 超时(默认5min)
           │      ┌────▼────┐      │
           │      │APPROVED  │      │
           │      └────┬────┘      │
           │           │ 执行完成   │
           │      ┌────▼────┐  ┌───▼───┐
           └──────► DENIED  │  │TIMEOUT│
                  └─────────┘  └───────┘
```

- IDLE：无审批请求，正常执行
- PENDING：审批请求已发出，等待用户响应（通过 CLI 终端交互）
- APPROVED：用户批准，执行该操作并继续
- DENIED：用户拒绝，跳过该操作，将拒绝信息回灌给 LLM
- TIMEOUT：超时未响应，视为拒绝，记录超时日志

#### 3.4.3 沙箱策略

文件操作默认限制在用户指定的工作目录内，任何试图访问工作目录外的路径均触发 NEED_APPROVAL。工作目录外的只读访问（如读取系统库）允许但记录日志。工作目录外的写入触发 NEED_APPROVAL。execute_shell 默认在工作目录内执行，切换目录需审批。

#### 3.4.4 审计日志

每条操作记录包含：时间戳（ISO 8601 格式）、操作类型（工具名）、操作参数（敏感信息脱敏）、护栏判定（ALLOW/NEED_APPROVAL/DENY）、审批结果（仅 NEED_APPROVAL 时记录）、执行结果、会话 ID。

---

### 3.5 M4 · 反馈闭环

职责：提供客观的、确定性的反馈信号，驱动 agent 自我修正。反馈信号是代码实现的校验器，不是 LLM 的自我检查。

输入：工具执行结果（如测试输出、lint 输出、类型检查输出）。

行为：解析工具输出，匹配已知的失败模式，生成结构化的反馈信号（成功/失败类型/具体错误信息/建议），将反馈注入主循环的上下文。

输出：结构化反馈对象，包含 status（pass 或 fail）、failures 数组、summary 字符串。

失败分类：

- TEST_FAILURE：测试框架输出中的 FAIL 或 AssertionError
- COMPILE_ERROR：编译器输出中的 error 级别
- LINT_ERROR：Linter 输出中的 error 或 warning
- RUNTIME_ERROR：Shell 命令非零退出码
- TIMEOUT：执行超时

回灌策略：反馈对象以结构化格式注入下一轮对话的上下文，格式为 `[FEEDBACK] { status: 'fail', failures: [...], summary: '...' }`。

---

### 3.6 M5 · 记忆系统

职责：跨会话存储和检索信息，按需提供给 LLM 而非全量载入。

输入：当前会话上下文 + 用户查询。

行为：会话结束时自动提取关键决策和约定，存储为结构化记忆条目。新会话开始时根据任务相关性检索记忆，将相关记忆注入上下文。

记忆类型：

- 项目约定：代码风格、命名规范、目录结构，关键词匹配检索
- 决策历史：用户曾做出的重要决策，关键词匹配检索
- 错误经验：之前遇到的错误及解决方案，错误类型匹配检索
- 用户偏好：用户明确表达的偏好，数量少，全量提供

存储：SQLite 数据库，memory 表。字段包含 ID、类型、内容、标签、创建时间、最后访问时间。

---

### 3.7 M6 · 配置管理

职责：让用户通过声明式规则约束 agent 的行为。

配置项：

- max_rounds：最大对话轮数，默认 20
- model：默认 LLM 模型，默认 claude-sonnet-5
- work_dir：工作目录（沙箱边界），默认当前目录
- guardrail_rules：自定义护栏规则数组，默认内置黑名单
- allowed_tools：启用的工具列表，默认全部
- approval_timeout：审批超时秒数，默认 300
- memory_enabled：是否启用记忆，默认 true
- log_level：日志级别，默认 info

配置文件格式：codeagent.config.json，位于项目根目录，支持用户自定义添加护栏规则。

---

### 3.8 基础设施

#### LLM 抽象层

```typescript
interface LLMProvider {
  name: string;
  complete(messages: Message[], options: LLMOptions): Promise<LLMResponse>;
}

interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage: { promptTokens: number; completionTokens: number };
}

interface MockLLMProvider extends LLMProvider {
  setNextResponse(response: LLMResponse): void;
  getHistory(): Message[];
}
```

真实 Provider 包括 Anthropic API 和 OpenAI API（通过各自的官方 SDK）。Mock Provider 用于单元测试，可预设下一步响应，可查询调用历史。

#### 凭据管理

存储方面，主方案是 Windows Credential Manager（keytar 库），备选是 .env 文件。首次运行通过 CLI 交互式引导（隐藏输入），确认后存入凭据管理器。支持三个操作：codeagent key set（录入）、codeagent key status（显示状态，不显示明文）、codeagent key clear（清除）。

---

## 四、非功能性需求

### 4.1 性能

- 单轮循环延迟（不含 LLM 调用）：< 50ms
- 护栏判定延迟：< 10ms
- 并发会话数：≥ 3

### 4.2 安全

威胁模型：

- API Key 硬编码在源码中（风险高）：强制使用凭据管理器，CI 中扫描 .env 和常见 key 模式
- API Key 泄露到 Git 历史（风险高）：.gitignore 包含 .env，pre-commit hook 检测
- API Key 通过环境变量外泄（风险中）：优先使用 OS 凭据管理器，若用 .env 则在 README 中明确警告明文风险
- API Key 在日志中泄露（风险中）：日志脱敏，自动替换 key 模式为 ***
- 恶意 Prompt 注入绕过护栏（风险中）：护栏是代码级判定，不依赖 LLM 理解，Prompt 注入无法绕过
- 沙箱逃逸通过符号链接等（风险低）：路径解析使用真实路径 realpath，拒绝符号链接越界

安全原则：最小权限（agent 默认只有工作目录内读写权限）、纵深防御（护栏拦截 + 沙箱限制 + 审计日志三层）、默认拒绝（未明确允许的操作默认拒绝）。

### 4.3 可用性

首次运行的引导流程不超过 3 步。错误信息使用自然语言，包含"发生了什么"和"建议怎么做"。CLI 输出清晰，使用颜色和图标区分状态。

### 4.4 可观测性

所有操作产生结构化日志（JSON 格式），日志包含时间戳、级别、模块、会话 ID、消息、上下文。CLI 实时输出当前轮数、操作摘要、护栏拦截记录。

---

## 五、系统架构

### 5.1 组件图

```
┌─────────────────────────────────────────────────────────┐
│                    CodeAgent CLI                          │
│  codeagent run <task>  │  codeagent key set/status/clear │
│  codeagent demo        │  codeagent config              │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    CodeAgent Harness 内核                 │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ 主循环    │  │ 工具系统  │  │ 治理护栏 ★重点★       │   │
│  │          │  │          │  │                      │   │
│  │ 上下文   │  │ read_file│  │ GuardrailEngine     │   │
│  │ 组装→    │  │ write_f  │  │  ├─ 黑名单匹配       │   │
│  │ LLM调用→ │  │ exec_sh  │  │  ├─ 路径边界检查     │   │
│  │ 解析→    │  │ run_test │  │  ├─ 权限级别判定     │   │
│  │ 分发→    │  │ search   │  │  └─ 综合判定         │   │
│  │ 回灌→    │  │ list_f   │  │                      │   │
│  │ 停机     │  │          │  │ HITLStateMachine    │   │
│  └──────────┘  └──────────┘  │  ├─ IDLE/PENDING/    │   │
│                               │  │   APPROVED/DENIED │   │
│  ┌──────────┐  ┌──────────┐  │  │   /TIMEOUT        │   │
│  │ 反馈闭环  │  │ 记忆系统  │  │  └─ 审计日志         │   │
│  │          │  │          │  └──────────────────────┘   │
│  │ 测试解析 │  │ 会话记忆  │                             │
│  │ 失败分类 │  │ 项目约定  │  ┌──────────────────────┐   │
│  │ 回灌信号 │  │ 决策历史  │  │ 配置管理              │   │
│  └──────────┘  └──────────┘  │  ├─ 加载配置           │   │
│                               │  ├─ 规则验证           │   │
│                               │  └─ 运行时查询         │   │
│                               └──────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              LLM 抽象层 (LLMProvider)              │   │
│  │  ├─ AnthropicProvider (真实)                       │   │
│  │  ├─ OpenAIProvider (真实)                          │   │
│  │  └─ MockLLMProvider (测试，可预设响应)              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              凭据管理 (CredentialManager)           │   │
│  │  ├─ Windows Credential Manager (keytar)            │   │
│  │  └─ .env 备选 (明文警告)                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 5.2 数据流

```
用户输入任务 → 主循环组装上下文 → 查询记忆系统获取相关记忆
                                    ↓
主循环调用 LLM 抽象层 → 真实 LLM 或 Mock → 返回响应
                                    ↓
主循环解析 LLM 响应 → 提取工具调用
                                    ↓
治理护栏检查每个工具调用：
  ├── ALLOW → 工具系统执行 → 获得结果
  ├── NEED_APPROVAL → HITL 状态机 → 用户响应
  │       ├── 批准 → 工具系统执行 → 获得结果
  │       └── 拒绝/超时 → 跳过，回灌拒绝信息
  └── DENY → 拒绝执行，记录日志
                                    ↓
反馈闭环解析结果 → 生成反馈信号 → 回灌到主循环
                                    ↓
下一轮循环 或 停机 → 记忆系统存储（会话结束时）
```

### 5.3 外部依赖

- @anthropic-ai/sdk：Anthropic API 调用，MIT
- openai：OpenAI API 调用，Apache-2.0
- keytar：Windows/macOS 凭据管理器，MIT
- better-sqlite3：SQLite 数据库，MIT
- jest：测试框架，MIT
- TypeScript：开发语言，Apache-2.0

---

## 六、数据模型

### 6.1 会话（Session）

id（UUID，主键）、task（用户任务描述）、status（running/completed/failed/stopped）、max_rounds（最大轮数）、current_round（当前轮数）、work_dir（工作目录）、created_at（创建时间）、finished_at（完成时间，可选）。

### 6.2 对话记录（Message）

id（自增主键）、session_id（外键关联会话）、round（第几轮）、role（system/user/assistant/tool）、content（消息内容）、tool_calls（JSON 格式，仅 assistant 角色）、created_at（创建时间）。

### 6.3 审计日志（AuditLog）

id（自增主键）、session_id（外键）、timestamp（事件时间）、tool_name（工具名）、tool_params（参数，脱敏处理）、guardrail_decision（ALLOW/NEED_APPROVAL/DENY）、approval_result（APPROVED/DENIED/TIMEOUT，仅 NEED_APPROVAL 时有值）、execution_result（执行结果摘要）、error（错误信息）。

### 6.4 记忆（Memory）

id（自增主键）、type（convention/decision/error_experience/preference）、content（记忆内容）、tags（逗号分隔的标签）、created_at、last_accessed_at。

### 6.5 护栏规则（GuardrailRule）

id（自增主键）、pattern（正则表达式）、description（规则描述）、level（DENY/NEED_APPROVAL）、enabled（是否启用）、created_at。

---

## 七、凭据与分发设计

### 7.1 凭据存储方案

主方案：Windows Credential Manager，通过 keytar 库操作。备选方案：.env 文件（仅在不支持 keytar 时使用），README 中明确警告明文风险。存储内容为 API provider + API key 的键值对。

### 7.2 凭据操作流程

首次运行 `codeagent key set`：选择 provider（Anthropic/OpenAI），输入 API key（隐藏输入，不回显），再次确认输入，存入 OS 凭据管理器，显示保存成功。

查看状态 `codeagent key status`：显示已配置的 provider 列表，显示 key 的后 4 位（如 sk-...xYz9），不显示完整 key。

更新 `codeagent key set`：覆盖旧 key。

清除 `codeagent key clear`：确认提示，从凭据管理器删除，显示已删除。

### 7.3 分发方案

形态一：GitHub Release 二进制，codeagent 单文件可执行，通过 esbuild 打包。形态二：Docker 容器镜像。发布到 GitHub Release 页面和 GitHub Container Registry。支持平台：Linux/amd64、macOS/arm64、Windows/amd64。已知限制：Docker 容器内 keytar 不可用，回退到 .env 文件方案。

---

## 八、技术选型与理由

选 TypeScript 是因为类型安全，减少运行时错误，npm 生态丰富，适合 AI 生成代码。选 Node.js 是因为非阻塞 I/O 适合 agent 多轮循环，npm 生态有完整的 LLM SDK。选 better-sqlite3 是因为同步 API 适合 agent 单线程模型，零配置，嵌入式。选 keytar 是因为跨平台 OS 凭据管理器绑定。选 Jest 是因为 TypeScript 原生支持，适合 mock 测试。选 Docker 是因为一键分发，环境隔离。直接使用 Anthropic SDK 和 OpenAI SDK，不做高层封装。

---

## 九、领域与机制设计（A 专属）

### 9.1 领域分析：Coding

在 coding 这个领域里，反馈信号是测试结果（pass/fail）、Lint 输出、类型检查、编译错误、运行时错误。这些都是客观的、确定性的信号，测试要么通过要么失败，不依赖主观判断。

危险动作包括递归删除文件、操作工作目录外的文件、发送网络请求（可能泄露代码）、修改系统配置、执行未经验证的 shell 脚本。

所需工具是文件读写、Shell 执行、测试运行、代码搜索、文件列表，这是 coding agent 的最小工具集。

记忆需求包括项目代码风格约定、用户偏好的命名规范、之前遇到的错误和解决方案、重要的架构决策。

### 9.2 重点维度：治理

为什么选治理作为重点深入：

1. 天然由代码构成。护栏是正则匹配 + 状态机，不是 LLM 的判断，最满足"机制必须是代码"的硬标准。
2. 安全价值最高。如果 agent 能自由执行危险命令，其他机制做得再好也没用。
3. 可演示性强。护栏拦截加 HITL 审批流程在 mock LLM 下完全可确定性复现，符合机制演示要求。
4. 工程深度可扩展。从简单的黑名单正则，到完整的 HITL 状态机 + 审计日志 + 沙箱策略，有清晰的递进路径。

### 9.3 各机制如何编码实现

护栏拦截：GuardrailEngine.check(action) 函数，正则匹配 + 路径解析 + 权限表查询。拦截逻辑在代码中，不依赖 LLM 的"自觉"。

HITL 审批：HITLStateMachine 类，状态转移由事件驱动，超时由定时器触发。状态机是确定性的，每次输入相同输出相同。

反馈解析：FeedbackParser.parse(testOutput) 函数，正则匹配测试输出格式。解析逻辑是代码，不依赖 LLM 判断结果好坏。

记忆存储：SQLite CRUD，关键词检索。存储和检索逻辑是代码。

沙箱边界：路径规范化（path.resolve）+ 前缀匹配。数学性的路径比较，不依赖 LLM。

---

## 十、验收标准

AC1 Agent 主循环：给定 mock LLM 预设 3 轮响应（含工具调用），主循环正确完成 3 轮迭代并停机。

AC2 工具分发：每个工具接收到正确参数后返回预期结果，参数错误时返回格式化的错误信息。

AC3 护栏拦截：guardrail(Action("execute_shell", "rm -rf /")) 返回 DENY，且此测试在 mock LLM 下通过。

AC4 HITL 审批：触发 NEED_APPROVAL 后，状态机正确在 PENDING、APPROVED、DENIED、TIMEOUT 间转移。

AC5 反馈闭环：注入一次测试失败，反馈解析器正确识别失败类型并生成结构化反馈，下一轮 LLM 收到该反馈。

AC6 记忆存储与检索：存入一条记忆后，相关查询能检索到，无关查询不返回。

AC7 凭据安全：codeagent key set 引导录入 key，codeagent key status 不显示明文，源码中无硬编码 key。

AC8 分发：docker build 然后 docker run 在全新机器上成功启动。

AC9 CLI 交互：codeagent run "task" 在终端中启动 agent，显示迭代状态，HITL 审批通过终端交互完成。

AC10 Mock 测试：所有核心机制（主循环、护栏、HITL、反馈、记忆）在 mock LLM 下有确定性单元测试，且全部通过。

AC11 机制演示：三个演示场景在 mock LLM 下可重复运行：护栏拦截危险命令、反馈闭环驱动修正、HITL 审批流程。

---

## 十一、风险与未决问题

LLM 响应格式不一致（可能性中，影响高）：解析器做容错处理，格式错误时重试并附格式要求。

keytar 跨平台兼容性（可能性中，影响中）：提供 .env 备选方案，编译时检测平台。

护栏规则过于宽松或严格（可能性中，影响中）：支持用户自定义规则，默认规则偏保守。

记忆检索相关性差（可能性低，影响中）：使用关键词匹配而非语义搜索，避免 LLM 依赖。

冷启动验证暴露 SPEC 不够清晰（可能性中，影响高）：冷启动后修订 SPEC，记录到 SPEC_PROCESS。

---

## 十二、目录结构

```
codeagent/
├── src/
│   ├── core/
│   │   ├── main-loop.ts          # M1 · Agent 主循环
│   │   ├── context-builder.ts    # 上下文组装
│   │   └── response-parser.ts    # LLM 响应解析
│   ├── tools/
│   │   ├── index.ts              # M2 · 工具注册与分发
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── execute-shell.ts
│   │   ├── run-tests.ts
│   │   ├── search-code.ts
│   │   └── list-files.ts
│   ├── governance/
│   │   ├── guardrail-engine.ts   # M3 · 护栏引擎
│   │   ├── hitl-state-machine.ts # HITL 审批状态机
│   │   ├── sandbox.ts            # 沙箱策略
│   │   └── audit-log.ts          # 审计日志
│   ├── feedback/
│   │   ├── feedback-parser.ts    # M4 · 反馈解析器
│   │   └── failure-classifier.ts # 失败分类器
│   ├── memory/
│   │   ├── memory-store.ts       # M5 · 记忆存储
│   │   └── memory-retriever.ts   # 记忆检索
│   ├── config/
│   │   ├── config-loader.ts      # M6 · 配置加载
│   │   └── default-config.ts     # 默认配置
│   ├── llm/
│   │   ├── provider.ts           # LLM 抽象接口
│   │   ├── anthropic-provider.ts # Anthropic 实现
│   │   ├── openai-provider.ts    # OpenAI 实现
│   │   └── mock-provider.ts      # Mock 实现（测试用）
│   ├── credentials/
│   │   ├── credential-manager.ts # 凭据管理接口
│   │   ├── keytar-store.ts       # OS 凭据管理器
│   │   └── env-store.ts          # .env 备选
│   ├── cli/
│   │   ├── index.ts              # CLI 入口 (codeagent 命令)
│   │   ├── key-commands.ts       # key set/status/clear
│   │   └── run-commands.ts       # run/demo 命令
│   └── index.ts                  # 库入口（导出 harness 内核）
├── tests/
│   ├── core/
│   │   ├── main-loop.test.ts
│   │   └── response-parser.test.ts
│   ├── governance/
│   │   ├── guardrail-engine.test.ts
│   │   ├── hitl-state-machine.test.ts
│   │   └── sandbox.test.ts
│   ├── feedback/
│   │   └── feedback-parser.test.ts
│   ├── memory/
│   │   └── memory-store.test.ts
│   ├── tools/
│   │   └── tool-dispatch.test.ts
│   ├── demo/
│   │   ├── demo-1-guardrail.test.ts   # 机制演示 ①
│   │   ├── demo-2-feedback.test.ts    # 机制演示 ②
│   │   └── demo-3-hitl.test.ts        # 机制演示 ③
│   └── fixtures/
│       └── mock-responses.ts          # Mock LLM 预设响应
├── docker/
│   └── Dockerfile
├── .github/
│   └── workflows/
│       └── ci.yml
├── codeagent.config.json
├── package.json
├── tsconfig.json
├── jest.config.ts
├── .gitignore
├── README.md
├── SPEC.md
├── PLAN.md
├── SPEC_PROCESS.md
├── AGENT_LOG.md
└── REFLECTION.md
```