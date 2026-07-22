import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { getAvailableFields, getGitInfo } from '../src/core/git'

function createDetachedRepository(): string {
  const cwd = mkdtempSync(join(tmpdir(), 'unplugin-auto-git-info-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd, stdio: 'pipe' })

  git('init')
  writeFileSync(join(cwd, 'fixture.txt'), 'fixture\n')
  git('add', 'fixture.txt')
  git('-c', 'user.name=Test User', '-c', 'user.email=test@example.com', 'commit', '-m', 'fixture')
  git('checkout', '--detach')

  return cwd
}

describe('git', () => {
  it('should get available fields', () => {
    const fields = getAvailableFields()
    expect(fields).toContain('repo')
    expect(fields).toContain('branch')
    expect(fields).toContain('commit')
    expect(fields.length).toBeGreaterThan(0)
  })

  it('should get git info with empty fields', () => {
    const info = getGitInfo([])
    expect(info).toEqual({})
  })

  it('should get git info with specific fields', () => {
    const info = getGitInfo(['branch', 'commit'])
    // 如果当前目录是 git 仓库，应该能获取到信息
    // 如果不是，返回空对象
    expect(typeof info).toBe('object')
  })

  it('should handle non-git directory', () => {
    // 使用一个不存在的目录
    const info = getGitInfo(['branch'], '/tmp/non-existent-dir-12345')
    expect(info).toEqual({})
  })

  it('should silently fall back to the short commit in a detached HEAD without a tag', () => {
    const cwd = createDetachedRepository()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const info = getGitInfo(['branch', 'commitShort', 'tag'], cwd)

      expect(info.branch).toBe(info.commitShort)
      expect(info.tag).toBe('')
      expect(warn).not.toHaveBeenCalled()
    }
    finally {
      warn.mockRestore()
      rmSync(cwd, { recursive: true, force: true })
    }
  })
})
