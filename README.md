# unplugin-auto-git-info

[![NPM version][npm-version-src]][npm-href]
[![NPM downloads][npm-downloads-src]][npm-href]
[![Unit Test][unit-test-src]][unit-test-href]
[![License][license-src]][license-href]

Unplugin for automatically generating Git information (repo, branch, commit, etc.) in multiple output formats.

## Features

- 📦 Automatically extract Git repository information
- 🎯 Support multiple output formats:
  - JSON file
  - Window global variable (via define replacement and HTML injection)
- 🔧 Works with all major build tools (Vite, Webpack, Rollup, esbuild, Rspack, etc.)
- ⚙️ Configurable fields and output options
- 🚀 Compile-time injection for optimal performance

## Installation

```bash
npm i -D unplugin-auto-git-info
```

## Usage

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import AutoGitInfo from 'unplugin-auto-git-info/vite'

export default defineConfig({
  plugins: [AutoGitInfo()],
})
```

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import AutoGitInfo from 'unplugin-auto-git-info/rollup'

export default {
  plugins: [AutoGitInfo()],
}
```

<br></details>

<details>
<summary>Rolldown / tsdown</summary><br>

```ts
// rolldown.config.ts / tsdown.config.ts
import AutoGitInfo from 'unplugin-auto-git-info/rolldown'

export default {
  plugins: [AutoGitInfo()],
}
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
import { build } from 'esbuild'
import AutoGitInfo from 'unplugin-auto-git-info/esbuild'

build({
  plugins: [AutoGitInfo()],
})
```

<br></details>

<details>
<summary>Webpack</summary><br>

```js
// webpack.config.js
import AutoGitInfo from 'unplugin-auto-git-info/webpack'

export default {
  /* ... */
  plugins: [AutoGitInfo()],
}
```

<br></details>

<details>
<summary>Rspack</summary><br>

```ts
// rspack.config.js
import AutoGitInfo from 'unplugin-auto-git-info/rspack'

export default {
  /* ... */
  plugins: [AutoGitInfo()],
}
```

<br></details>

## Configuration

### Default Behavior

By default, the plugin will:

- **Be enabled** (`enable: true`)
- Extract all available Git fields (repo, branch, commit, commitShort, author, authorEmail, commitTime, commitMessage, isDirty)
- Generate a JSON file at your build output directory (e.g., `dist/git-info.json` for Vite)
- Automatically detect the output directory from your build tool configuration
- Run after build completion

You can use the plugin without any configuration:

```ts
// vite.config.ts
import AutoGitInfo from 'unplugin-auto-git-info/vite'

export default defineConfig({
  plugins: [AutoGitInfo()], // That's it!
})
```

### Advanced Configuration

```ts
AutoGitInfo({
  // Enable/disable the plugin (default: true)
  enable: true,

  // Git fields to include (default: all)
  fields: ['repo', 'branch', 'commit', 'commitShort', 'author', 'authorEmail', 'commitTime', 'commitMessage', 'isDirty'],

  // Output options
  outputs: {
    // Generate JSON file (default: 'git-info.json' in output directory)
    json: {
      fileName: 'git-info.json', // Relative to build output directory
    },

    // Generate window global variable (default: '__GIT_INFO__')
    // Uses define replacement for compile-time injection
    window: {
      varName: '__GIT_INFO__', // Global variable name
      console: true, // Log Git info to browser console (default: false)
    },
  },

  // Working directory (optional, defaults to process.cwd())
  // cwd: './custom-path',
})
```

### Disable the Plugin

You can conditionally disable the plugin based on environment:

```ts
import AutoGitInfo from 'unplugin-auto-git-info/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    AutoGitInfo({
      enable: process.env.NODE_ENV === 'production', // Only enable in production
    }),
  ],
})
```

Or completely disable it:

```ts
AutoGitInfo({
  enable: false, // Plugin will not generate any files
})
```

## Git Fields

The following Git information can be extracted:

- `repo` - Repository name (extracted from remote URL or directory name)
- `branch` - Current branch name (handles detached HEAD state)
- `commit` - Full commit hash
- `commitShort` - Short commit hash (7 characters)
- `author` - Author name
- `authorEmail` - Author email
- `commitTime` - Commit timestamp (ISO 8601 format)
- `commitMessage` - Commit message (first line, newlines removed)
- `tag` - Current tag if HEAD points to a tag
- `isDirty` - Whether the working directory has uncommitted changes
- `remoteUrl` - Remote repository URL (e.g., `https://github.com/user/repo.git`)
- `root` - Git repository root directory path

## Output Examples

### JSON Output

By default, the JSON file is generated at your build output directory (e.g., `dist/git-info.json`):

```json
{
  "repo": "https://github.com/user/repo.git",
  "branch": "main",
  "commit": "abc123def456...",
  "commitShort": "abc123d",
  "author": "John Doe",
  "authorEmail": "john@example.com",
  "commitTime": "2025-01-08T12:00:00.000Z",
  "commitMessage": "feat: add new feature",
  "isDirty": false
}
```

### Window Variable Output

When window output is enabled, the plugin will:

1. **For Vite**: Automatically inject a `<script>` tag into your HTML `<head>` section
2. **For other build tools**: Use define replacement to inject the variable at compile time
3. Optionally log Git info to browser console (with `console: true`)

You can then access the Git info anywhere in your code:

```typescript
// In your browser code
console.log(window.__GIT_INFO__)
console.log(window.__GIT_INFO__.branch)
console.log(window.__GIT_INFO__.commit)
```

**How it works:**

- **Vite**: The plugin injects a `<script>` tag in the HTML that sets `window.__GIT_INFO__` before your code runs
- **Other build tools**: Uses define replacement - code references to `window.__GIT_INFO__` are replaced with the actual Git info object at compile time

**Example HTML injection (Vite):**

```html
<script>
  if (typeof window !== 'undefined') {
    window.__GIT_INFO__ = {"repo":"...","branch":"main",...};
    // console.log('[Git Info]', window.__GIT_INFO__); // if console: true
  }
</script>
```

**Note**: For non-Vite build tools, you need to reference `window.__GIT_INFO__` in your code for the define replacement to work.

## License

[MIT](./LICENSE) License © 2025-PRESENT [Drswith](https://github.com/Drswith)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/unplugin-auto-git-info?color=32C754&labelColor=1B3A2B
[npm-downloads-src]: https://img.shields.io/npm/dm/unplugin-auto-git-info?color=32C754&labelColor=1B3A2B
[npm-href]: https://www.npmjs.com/package/unplugin-auto-git-info
[unit-test-src]: https://github.com/Drswith/unplugin-auto-git-info/actions/workflows/unit-test.yml/badge.svg
[unit-test-href]: https://github.com/Drswith/unplugin-auto-git-info/actions/workflows/unit-test.yml
[license-src]: https://img.shields.io/github/license/Drswith/unplugin-auto-git-info?color=32C754&labelColor=1B3A2B
[license-href]: https://github.com/Drswith/unplugin-auto-git-info/blob/main/LICENSE
