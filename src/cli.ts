#!/usr/bin/env node

import type { Options } from './core/options'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { getGitInfo } from './core/git'
import { resolveOptions } from './core/options'
import { generateOutputs } from './core/outputs'

/**
 * 解析命令行参数
 */
function parseArgs(): Partial<Options> {
  const args = process.argv.slice(2)
  const options: Partial<Options> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--fields':
      case '-f': {
        if (nextArg) {
          options.fields = nextArg.split(',').map((f: string) => f.trim())
          i++
        }
        break
      }

      case '--cwd':
      case '-C': {
        if (nextArg) {
          options.cwd = nextArg
          i++
        }
        break
      }

      case '--config':
      case '-c': {
        if (nextArg) {
          try {
            const configPath = resolve(nextArg)
            const configContent = readFileSync(configPath, 'utf8')
            const config = JSON.parse(configContent)
            Object.assign(options, config)
          }
          catch (error) {
            console.error(`无法读取配置文件: ${nextArg}`, error)
            process.exit(1)
          }
          i++
        }
        break
      }

      case '--help':
      case '-h':
        // eslint-disable-next-line no-lone-blocks
        {
          console.log(`
用法: unplugin-auto-git-info [选项]

选项:
  -f, --fields <fields>      Git 字段列表，用逗号分隔 (例如: repo,branch,commit)
  -C, --cwd <path>           工作目录路径
  -c, --config <path>        配置文件路径 (JSON 格式)
  -h, --help                  显示帮助信息

示例:
  unplugin-auto-git-info --fields repo,branch,commit
  unplugin-auto-git-info --config ./git-info.config.json
  unplugin-auto-git-info --cwd ./src --fields repo,branch
        `)
          process.exit(0)
        }
        break
      default: {
        if (arg.startsWith('-')) {
          console.warn(`未知选项: ${arg}`)
        }
        break
      }
    }
  }

  return options
}

/**
 * CLI 主函数
 */
export function runCLI(): void {
  const args = parseArgs()

  const options = resolveOptions({ ...args, outputs: args.outputs || { json: {} } })

  try {
    // 获取 Git 信息
    const gitInfo = getGitInfo(options.fields, options.cwd, options.redact)

    if (Object.keys(gitInfo).length === 0) {
      console.warn('警告: 未检测到 Git 仓库或无法获取 Git 信息')
      process.exit(0)
    }

    generateOutputs(gitInfo, options.outputs, options.cwd)
    console.log('✓ Git 信息已生成')
  }
  catch (error) {
    console.error('错误:', error)
    process.exit(1)
  }
}

// 如果直接运行此文件，执行 CLI
if (
  import.meta.url !== undefined
    && (import.meta.url.endsWith(process.argv[1]!)
      || process.argv[1]?.includes('cli'))
) {
  runCLI()
}
