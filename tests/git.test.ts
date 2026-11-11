import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { build } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { getAvailableFields, getGitInfo } from '../src/core/git'
import AutoGitInfo from '../src/vite'

function createDetachedRepository(): string {
  const cwd = mkdtempSync(join(realpathSync(tmpdir()), 'unplugin-auto-git-info-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd, stdio: 'pipe' })

  git('init')
  git('remote', 'add', 'origin', 'https://example.com/private-repo.git')
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

  it('should apply redaction to both JSON and Vite HTML', async () => {
    const cwd = createDetachedRepository()
    const repoAlias = 'public-$&-</script>'

    try {
      writeFileSync(join(cwd, 'index.html'), '<html><head></head><body></body></html>')
      await build({
        configFile: false,
        root: cwd,
        logLevel: 'silent',
        plugins: [AutoGitInfo({
          cwd,
          fields: ['repo', 'authorEmail', 'commitMessage', 'isDirty'],
          redact: {
            repo: repoAlias,
            authorEmail: value => String(value).replace(/^[^@]+/, '***'),
            author: '[redacted]',
            isDirty: false,
          },
          outputs: { json: {}, window: {} },
        })],
      })

      const expected = {
        repo: repoAlias,
        authorEmail: '***@example.com',
        commitMessage: 'fixture',
        isDirty: false,
      }
      const json = readFileSync(join(cwd, 'dist/git-info.json'), 'utf8')
      const html = readFileSync(join(cwd, 'dist/index.html'), 'utf8')
      const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
      expect(script).toBeDefined()

      const window = {}
      runInNewContext(script!, { window })
      expect(JSON.parse(json)).toEqual(expected)
      expect(window).toEqual({ __GIT_INFO__: expected })
    }
    finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })

  it('should reject invalid redaction rules from a JSON config', () => {
    const cwd = createDetachedRepository()

    try {
      expect(() => getGitInfo(['authorEmail'], cwd, JSON.parse('{"authorEmail":null}')))
        .toThrow('The redact rule for "authorEmail" must produce a string or boolean')
      expect(() => getGitInfo(['authorEmail'], cwd, JSON.parse('{"authorEmai":"[redacted]"}')))
        .toThrow('Unknown Git field in redact: "authorEmai"')
    }
    finally {
      rmSync(cwd, { recursive: true, force: true })
    }
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
