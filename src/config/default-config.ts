// 默认配置

export const defaultConfig = {
  max_rounds: 20,
  model: 'claude-sonnet-5',
  work_dir: process.cwd(),
  guardrail_rules: [],
  allowed_tools: ['read_file', 'write_file', 'execute_shell', 'run_tests', 'search_code', 'list_files'],
  approval_timeout: 300,
  memory_enabled: true,
  log_level: 'info',
};