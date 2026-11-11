import type { GitField, RedactOptions } from './git'
import type { OutputOptions } from './outputs'

/**
 * 插件配置选项
 */
export interface Options {
  /** 是否启用插件，默认：true */
  enable?: boolean
  /** 需要提取的 Git 字段列表，默认：所有可用字段 */
  fields?: GitField[] | string[]
  /** 按字段替换或转换 Git 信息 */
  redact?: RedactOptions
  /** 输出选项配置 */
  outputs?: OutputOptions
  /** 工作目录，默认为当前目录 */
  cwd?: string
}

export type OptionsResolved = Omit<Options, 'outputs'> & {
  outputs: OutputOptions
}

/**
 * 默认提取的 Git 字段列表
 */
const DEFAULT_FIELDS: GitField[] = [
  'repo',
  'branch',
  'commit',
  'commitShort',
  'author',
  'authorEmail',
  'commitTime',
  'commitMessage',
  'isDirty',
]

/**
 * 解析并规范化插件选项
 * @param options 用户提供的选项
 * @returns 解析后的选项对象
 */
export function resolveOptions(options: Options = {}): OptionsResolved {
  return {
    enable: options.enable !== undefined ? options.enable : true,
    fields: options.fields || DEFAULT_FIELDS,
    redact: options.redact,
    outputs: options.outputs || {},
    cwd: options.cwd,
  }
}
