# SPEC_PROCESS.md · 规约过程记录

## brainstorming 过程

这个项目从"做一个编码智能体驾驭框架"这个模糊想法开始。通过和 AI 的反复讨论，逐步明确了以下几个关键决策：

### 关键节点 1：选 A 还是 B

最初的想法是做 B 类应用项目（Prompt Playground 之类的工具），但考虑到项目的评分标准更看重"核心机制用代码实现"这个硬指标，最终选了 A。A 的评分标准更客观——做到什么程度就拿什么分，不像 B 那样容易因为选题普通而丢分。

### 关键节点 2：治理作为重点维度

六个模块都要有，但必须选一个做深。选治理是因为：
- 护栏 + 状态机天然由代码构成，不是靠提示词
- 安全价值最高，如果 agent 可以自由执行危险命令，其他机制没意义
- mock 测试最容易做，传入一个命令就能验证拦截逻辑

### 关键节点 3：CLI-only 还是加 WebUI

群里老师说方案一（纯 CLI + GitHub Release）就够了，果断去掉 WebUI。省了至少 2-3 天工作量。

### 关键节点 4：命名

从 Aegis 改成 CodeAgent，更直白，不像学生项目名字。

## 冷启动验证

用了一个不同的 agent（与主开发 agent 不同），在全新会话中只提供 SPEC.md 和 PLAN.md，让它按 PLAN 的 Task 2.1 开始实现。

### agent 的回复

> 可以。按你的要求，我会严格以 PLAN.md 的 Task 2.1 和 SPEC.md 为依据实现，不自行补充接口设计。
>
> 目前我已经确认：
>
> * Task 2.1 的目标是：在 src/llm/provider.ts 定义 LLMProvider 接口和 LLMResponse 等类型。
> * SPEC.md 明确给出了当前 LLM 抽象层的 LLMProvider、LLMResponse、MockLLMProvider 类型定义，以及 Message、LLMOptions、ToolCall 等类型的引用。
> * 但当前对话里只有 SPEC.md 和 PLAN.md 两个文件，没有项目的 src/、package.json、tsconfig.json 等代码文件。
>
> 这里出现了一个我不能自行猜的地方：
>
> SPEC.md 给出了 LLMProvider 的接口，但没有定义 Message、LLMOptions、ToolCall 的具体字段结构。
>
> 例如 SPEC 只写了 LLMProvider 接口和 LLMResponse 的签名，但没有定义 Message、LLMOptions、ToolCall 这些辅助类型的字段。
>
> 所以我现在先停在这里，不实现猜测版。

### 暴露的问题

1. SPEC 缺少 Message、LLMOptions、ToolCall 等辅助类型的完整字段定义，只给出了 LLMProvider 和 LLMResponse 的签名。这在 SPEC 层面是合理的（SPEC 应该定义接口，不一定要定义所有辅助类型），但新 agent 没有项目上下文时确实会卡住。
2. 冷启动 agent 停下来提问的行为是正确的——它没有凭猜测继续，而是等待补充信息。这说明 SPEC 在"接口边界"的定义上还需要更清晰。
3. 这个案例也说明，冷启动验证的价值在于发现"你以为写清楚了，但换个上下文就不够"的地方。如果当时在 SPEC 中把 Message、ToolCall 等类型也完整定义，冷启动 agent 就不会卡在这里。

### 第二轮验证：方案 A 代码审查

把 GitHub 仓库地址发给冷启动 agent 后，它对照 SPEC 和实际代码做了逐项审查，发现了以下问题：

**严重问题：**
- `src/config/config-loader.ts` 缺失：SPEC 和 PLAN 都要求这个文件，但仓库里只有 `default-config.ts`。其他代码（MainLoop、CLI）引用了 `config-loader`，导致编译失败。

**安全问题：**
- 沙箱路径判断使用 `startsWith()`，存在前缀误匹配：`/home/user/project2` 会被误判为在 `/home/user/project` 范围内。

**实现偏差：**
- `parseResponse` 没有检测格式错误，重试机制实际上无法触发
- `buildContext` 接收了 tools 参数但没有加入 messages
- 失败分类器缺少 RUNTIME_ERROR 和 TIMEOUT 的显式检测

**处理方式：**
以上问题均已修复并提交（commit 3c18f28）。代码和 SPEC 现在一致。

### 第三轮验证：CI 修复与回归

在修复代码后，CI 仍然报错，发现是项目配置问题而非代码问题：

- `jest.config.ts` 需要 `ts-node` 才能解析，改为 `jest.config.js` 解决
- 缺少 `@types/jest` 导致 `describe`、`it`、`expect` 找不到
- 缺少 `@types/better-sqlite3` 导致类型声明错误
- `rm -rf /` 正则太宽，误匹配了 `rm -rf /tmp`
- LLM 格式错误重试只是重复解析同一个 response，没有真正重新调用 LLM

以上问题均已修复，CI 全绿（commit 83e0a55）。

### 第四轮验证：最终审查

CI 全绿后，冷启动 AI 做了最后一轮全面审查，发现了一个之前遗漏的安全问题：

- 护栏只检查了 `read_file` 和 `write_file` 的路径边界，但 `list_files` 和 `search_code` 没有纳入检查。这导致 agent 可以列出和搜索工作目录外的文件。
- 修复方式：将 `list_files` 和 `search_code` 也加入护栏的路径检查列表（commit 93e7ee5）。

冷启动 AI 最终确认：之前所有修复项全部通过，LLM 格式错误重试已真正重新调用 LLM，PLAN.md 全部标记完成。两个 API 设计偏差（options 可选、getHistory 返回类型）判定为合理设计，无需修改。

## AI 提的建议和我采纳的

- AI 建议用 TypeScript 而非 Python：采纳，因为全栈一致性更好
- AI 建议用 keytar 做凭据管理：采纳，课程要求必须用 OS 凭据管理器
- AI 建议 mock 测试作为核心验证手段：采纳，这是硬判定标准的要求
- AI 建议目录结构按模块分包：采纳

## 反思

brainstorming 阶段最有价值的是明确了"机制必须是代码"这个边界条件。很多想法在讨论中被排除——比如用提示词做护栏、让 LLM 自我检查等——因为它们不符合项目的硬标准。