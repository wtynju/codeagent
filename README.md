# CodeAgent

一个将 LLM 封装为安全可控编码智能体的驾驭框架。它用代码（而非提示词）实现护栏拦截、反馈闭环、记忆存储等机制，让 AI 编码助手在安全边界内自主工作。

## 项目结构

```
codeagent/
├── src/
│   ├── core/           # M1 Agent 主循环
│   ├── tools/          # M2 工具系统（6个工具）
│   ├── governance/     # M3 治理护栏（重点模块）
│   ├── feedback/       # M4 反馈闭环
│   ├── memory/         # M5 记忆系统
│   ├── config/         # M6 配置管理
│   ├── llm/            # LLM 抽象层（Anthropic/OpenAI/Mock）
│   ├── credentials/    # 凭据管理（keytar + .env 备选）
│   └── cli/            # CLI 命令行入口
├── tests/
│   ├── core/           # 核心模块测试
│   ├── governance/     # 护栏测试
│   ├── feedback/       # 反馈测试
│   ├── memory/         # 记忆测试
│   ├── tools/          # 工具测试
│   └── demo/           # 机制演示（3个场景）
├── docker/             # Docker 构建
└── .github/            # CI 配置
```

## 安装

### 方式一：从源码运行

```bash
git clone https://github.com/wtynju/codeagent.git
cd codeagent
npm install
npm run build
```

### 方式二：Docker

```bash
docker build -t codeagent -f docker/Dockerfile .
docker run --rm codeagent help
```

## 使用方法

### 1. 配置 API Key

```bash
codeagent key set
```

按提示输入 provider（anthropic 或 openai）和 API key。key 会存入 OS 凭据管理器（Windows Credential Manager / macOS Keychain），不会出现在代码或日志中。

查看已配置的 key：
```bash
codeagent key status
```

清除 key：
```bash
codeagent key clear
```

### 2. 运行编码任务

```bash
codeagent run "创建一个计算器函数，包含加减乘除"
```

### 3. 运行机制演示

```bash
codeagent demo
```

### 4. 查看配置

```bash
codeagent config
```

## 运行测试

```bash
npm test
```

所有测试使用 mock LLM，不依赖真实 API，不消耗费用。

## 安全边界

- 危险命令黑名单：`rm -rf /`、fork 炸弹等自动拦截
- 需审批操作：sudo 提权、全局安装包、强制推送等暂停等待人工确认
- 文件操作限制在工作目录内
- 审计日志记录所有操作
- API key 使用 OS 凭据管理器存储

## 分发

- GitHub Release：下载二进制文件直接运行
- Docker：`docker build -t codeagent .`

已知限制：Docker 容器内 keytar 不可用，回退到 .env 文件存储 API key。

## 技术栈

TypeScript + Node.js + better-sqlite3 + keytar + Jest