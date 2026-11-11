import type { UnpluginInstance } from 'unplugin'
import type { Options } from './core/options'
import { resolve } from 'node:path'
import process from 'node:process'
import { createUnplugin } from 'unplugin'
import { getGitInfo } from './core/git'
import { resolveOptions } from './core/options'
import { generateOutputs } from './core/outputs'

/**
 * 从构建工具配置中获取输出目录
 * 支持 Vite、Webpack、Rollup/Rolldown 等构建工具
 */
function getOutputDir(config: any, cwd?: string): string {
  const projectRoot = cwd || process.cwd()

  // Vite
  if ('vite' in config || config.vite) {
    const viteConfig = config.vite || config
    const outDir = viteConfig.build?.outDir
    if (outDir) {
      return resolve(projectRoot, outDir)
    }
  }

  // Webpack
  if ('webpack' in config || config.output?.path) {
    const webpackConfig = config
    const outputPath = webpackConfig.output?.path
    if (outputPath) {
      return resolve(projectRoot, outputPath)
    }
  }

  // Rollup/Rolldown
  if (config.output?.dir) {
    const outputDir = config.output.dir
    return resolve(projectRoot, outputDir)
  }

  // 默认值
  return resolve(projectRoot, 'dist')
}

/**
 * 根据配置生成 Git 信息输出文件
 * 目前支持 JSON 文件输出
 */
function generateGitInfoFiles(
  options: ReturnType<typeof resolveOptions>,
  outputDir: string,
): void {
  if (!options.enable) {
    return
  }

  // 获取 Git 信息
  const gitInfo = getGitInfo(options.fields, options.cwd, options.redact)

  // 如果没有配置任何输出，默认生成 JSON
  const hasOutputs
    = options.outputs
      && (options.outputs.json
        || options.outputs.window)

  if (hasOutputs) {
    // 根据配置生成输出
    generateOutputs(gitInfo, options.outputs, outputDir)
  }
  else {
    // 默认只生成 JSON
    generateOutputs(gitInfo, { json: {} }, outputDir)
  }
}

export const AutoGitInfo: UnpluginInstance<Options | undefined, false>
  = createUnplugin((rawOptions = {}) => {
    const options = resolveOptions(rawOptions)
    let outputDir: string | undefined
    let gitInfo: ReturnType<typeof getGitInfo> | null = null
    const varName = options.outputs?.window?.varName || '__GIT_INFO__'
    const shouldConsole = options.enable && options.outputs?.window?.console === true

    const name = 'unplugin-auto-git-info'

    // 在插件初始化时获取 Git 信息，用于 define 替换和 HTML 注入
    if (options.enable && options.outputs?.window) {
      gitInfo = getGitInfo(options.fields, options.cwd, options.redact)
    }

    return {
      name,
      enforce: 'post',

      /**
       * Define 配置：用于编译时替换
       * 对于非 Vite 构建工具，代码中的 window.__GIT_INFO__ 会被替换为实际的 Git 信息对象
       * 这样可以在编译时内联，无需额外的运行时文件
       */
      define: options.enable && options.outputs?.window && gitInfo
        ? {
            [`window.${varName}`]: JSON.stringify(gitInfo),
          }
        : {},

      /**
       * Vite 特定的 HTML 注入
       * 在 HTML 的 </head> 之前注入 script 标签，设置全局变量
       * 这种方式比 define 替换更可靠，因为不依赖代码中的引用
       */
      vite: {
        transformIndexHtml(html) {
          if (!options.enable || !options.outputs?.window || !gitInfo) {
            return html
          }

          // 生成注入的 script 代码
          // 防止字段值中的 </script> 提前结束脚本。
          const gitInfoJson = JSON.stringify(gitInfo).replace(/</g, '\\u003C')
          const consoleLog = shouldConsole
            ? `\n  console.log('[Git Info]', window.${varName});`
            : ''

          const scriptCode = `<script>
  if (typeof window !== 'undefined') {
    window.${varName} = ${gitInfoJson};${consoleLog}
  }
</script>`

          // 在 </head> 之前注入，确保在所有代码执行前设置全局变量
          return html.replace('</head>', () => `  ${scriptCode}\n</head>`)
        },
      },

      /**
       * 配置解析完成时，获取输出目录
       */
      configResolved(config: any) {
        outputDir = getOutputDir(config, options.cwd)
      },

      /**
       * 构建结束时生成 Git 信息文件
       * 每次构建都会重新生成，确保信息是最新的
       */
      buildEnd() {
        if (!options.enable) {
          return
        }

        generateGitInfoFiles(options, outputDir || 'dist')
      },

      /**
       * Rollup/Vite 的 writeBundle hook
       * 确保在文件写入后生成 Git 信息文件
       */
      writeBundle() {
        if (!options.enable) {
          return
        }

        generateGitInfoFiles(options, outputDir || 'dist')
      },
    }
  })
