// CLI 命令行入口

import { runKeyCommands } from './key-commands';
import { runCommand } from './run-commands';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'key':
      await runKeyCommands(args.slice(1));
      break;
    case 'run':
      await runCommand(args.slice(1));
      break;
    case 'demo':
      await runCommand(['--demo']);
      break;
    case 'config':
      console.log('当前配置:');
      const { ConfigLoader } = require('../config/config-loader');
      const config = new ConfigLoader();
      console.log(JSON.stringify(config.getAll(), null, 2));
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(`
CodeAgent - 编码智能体驾驭框架

用法:
  codeagent key set <provider>   录入 API key
  codeagent key status           查看 API key 状态
  codeagent key clear <provider> 清除 API key
  codeagent run <task>           运行编码任务
  codeagent demo                 运行机制演示
  codeagent config               查看当前配置
  codeagent help                 显示帮助信息
      `);
      break;
    default:
      console.log('未知命令。使用 codeagent help 查看帮助');
  }
}

main().catch(console.error);