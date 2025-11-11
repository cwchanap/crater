# Crater Monorepo - AI Development Guide

## Architecture Overview

**Crater** is a Turborepo monorepo with 5 main components:

- `apps/crater-ext/` - VS Code extension with AI-powered game asset generation chatbot (Svelte WebView)
- `apps/crater-image-editor/` - VS Code extension for image editing with canvas operations (Svelte WebView)
- `apps/crater-web/` - SvelteKit web application (basic setup)
- `packages/core/` - Shared TypeScript utilities, AI providers (Gemini, OpenAI), and service layer
- `packages/ui-components/` - Svelte component library using shadcn/ui patterns and Tailwind CSS

## Key Development Patterns

### Monorepo Structure & Dependencies

- Uses `pnpm` workspaces (v9+) with `workspace:*` pattern for internal dependencies
- Turborepo orchestrates builds with dependency graphs via `turbo.json`
- Root commands (`pnpm build`, `pnpm dev`, `pnpm test`) operate across all packages
- Build outputs: `dist/` (extensions, packages), `.svelte-kit/` (web), `out/` (compiled tests)
- **Never use `npm` or `yarn`** - always use `pnpm` for consistent workspace linking

### VS Code Extension Architecture (Dual-Build Pattern)

Both extensions follow this split-build architecture:

**Extension Host (Node.js):**

- Entry: `src/extension.ts` → Output: `dist/extension.js`
- Built with esbuild (`esbuild.js`) - CommonJS format for VS Code Node.js runtime
- Registers commands, providers, and handles VS Code API interactions
- External: `vscode` module (provided by VS Code runtime)

**WebView Client (Browser):**

- Entry: `src/webview.ts` → Output: `dist/webview.js`
- Built with Vite (`vite.config.ts/mjs`) - IIFE format for isolated webview context
- Svelte components for reactive UI (`App.svelte`)
- Message passing via `postMessage`/`onDidReceiveMessage` (no direct VS Code API access)
- Supports HMR in development: `pnpm dev:hmr` (separate Vite dev server on ports 3000-3001 for crater-ext, 3002-3003 for crater-image-editor)

**Critical Pattern:**

```typescript
// Extension → WebView
webview.postMessage({ type: 'imageLoaded', data: imageBase64 })

// WebView → Extension
vscode.postMessage({ type: 'saveImage', imagePath: '/path' })
```

### Inter-Extension Communication

`crater-ext` can invoke `crater-image-editor` via commands:

```typescript
// In crater-ext (ChatbotProvider)
await vscode.commands.executeCommand('crater-image-editor.loadImage', imageUri)
```

**Timing Critical:**

1. Focus target view first: `await vscode.commands.executeCommand('crater-image-editor.editorView.focus')`
2. Wait 500ms for view availability
3. Send command with data
4. Image editor uses message queueing to handle messages arriving before webview ready

See `docs/image-editor-integration.md` for detailed timing patterns.

### Build & Development Workflow

```bash
# Install dependencies (monorepo root only)
pnpm install

# Build all packages (respects dependency order via Turborepo)
pnpm build

# Extension development (watch mode for both extension + webview)
cd apps/crater-ext && pnpm dev
# OR with HMR for faster webview iteration:
cd apps/crater-ext && pnpm dev:hmr

# Test extension: Press F5 in VS Code to launch Extension Development Host
# Check Debug Console for extension logs
# Reload extension: Cmd/Ctrl+R in Extension Development Host
```

**Important:** Always build `@crater/core` before building extensions:

```bash
pnpm --filter @crater/core build
pnpm --filter crater-ext build
```

### Code Quality & Style

**ESLint 9+ Flat Config** (`eslint.config.js`):

- Environment-specific rules: Node.js config files, TypeScript, Svelte components, VS Code extensions, tests
- TypeScript: strict rules, unused vars with `_` prefix allowed, avoid `any`
- Extensions: `no-console` disabled (logging expected)
- Test files: relaxed rules for `any` and console

**Prettier** (`.prettierrc.json`):

- 4-space indentation for TS/JS
- 2-space for JSON, Markdown
- Single quotes, no semicolons
- `trailingComma: 'es5'`

**Husky + lint-staged:**

- Pre-commit hook runs `pnpm lint-staged`
- Only processes staged files
- Auto-fixes with `eslint --fix` and `prettier --write`

### Shared Core Package (`@crater/core`)

Central location for reusable logic across all apps:

```typescript
// AI Providers (use exact imports, NEVER import *)
import { GeminiImageProvider, OpenAIImageProvider } from '@crater/core'
import { ChatBotService } from '@crater/core'
import { S3Service } from '@crater/core'
```

**Build:** Dual ESM/CJS output via `tsup` with TypeScript declarations
**Testing:** Vitest (`pnpm test` or `pnpm test:watch`)
**Architecture:** Base provider classes → concrete implementations (Gemini, OpenAI, Debug)

### UI Components (`@crater/ui-components`)

Svelte component library following shadcn/ui patterns:

```typescript
import { Button, Card, Input } from '@crater/ui-components'
import { cn } from '@crater/ui-components' // Tailwind class utility
```

- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Class composition via `cn()` utility
- PascalCase component filenames (`Button.svelte`)
- Build: `tsup` for dual ESM/CJS, TypeScript declarations

### Testing Strategy

**VS Code Extensions:**

```bash
pnpm --filter crater-ext test       # @vscode/test-electron (requires build)
pnpm --filter crater-image-editor test  # Combined Vitest + VS Code tests
```

- Config: `.vscode-test.mjs` (runs compiled `out/test/**/*.test.js`)
- Always build before testing extensions

**Packages:**

```bash
pnpm --filter @crater/core test     # Vitest unit tests
pnpm --filter crater-web test       # Vitest + Playwright E2E
```

**Web App:**

```bash
cd apps/crater-web
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright end-to-end tests
pnpm test:e2e:ui    # Playwright UI mode
```

### Extension-Specific Conventions

**Command Naming:**

- `crater-ext.*` - Game asset generator extension
- `crater-image-editor.*` - Image editor extension
- Internal commands use `.loadImage` suffix for cross-extension calls

**Configuration:**

- Settings defined in `package.json` `contributes.configuration`
- Read via `vscode.workspace.getConfiguration('crater-ext')`
- API keys stored in user settings (never commit real keys)
- Use VS Code variables: `${workspaceFolder}/images`

**WebView Styling:**

- Use VS Code CSS variables: `--vscode-editor-background`, `--vscode-foreground`
- Tailwind CSS for utility classes
- Auto-adapts to light/dark themes

**Critical Timing Patterns (Image Editor):**

```typescript
// Canvas readiness checking with retry
function loadImage(imageData: string) {
  const canvas = document.querySelector('canvas')
  if (!canvas) {
    setTimeout(() => loadImage(imageData), 100) // Retry
    return
  }
  // Safe to draw...
}

// Message queueing for webview not ready
if (!this._webviewReady) {
  this._pendingMessages.push(message)
  return
}
```

See `docs/VSCODE_WEBVIEW_TROUBLESHOOTING.md` for canvas timing issues.

## Common Tasks

### Adding New Extension Commands

1. Add to `package.json` → `contributes.commands`:
   ```json
   { "command": "crater-ext.myCommand", "title": "My Command" }
   ```
2. Register in `extension.ts`:
   ```typescript
   const cmd = vscode.commands.registerCommand(
     'crater-ext.myCommand',
     async () => {
       // implementation
     }
   )
   context.subscriptions.push(cmd)
   ```
3. Add to menus/keybindings if needed in `package.json`

### Adding UI Components

1. Create in `packages/ui-components/src/components/MyComponent.svelte`
2. Export from `packages/ui-components/src/index.ts`:
   ```typescript
   export { default as MyComponent } from './components/MyComponent.svelte'
   ```
3. Build: `pnpm --filter @crater/ui-components build`
4. Use in apps: `import { MyComponent } from '@crater/ui-components'`

### Extension Development Tips

- Use `pnpm dev` for standard watch mode (rebuild on file change)
- Use `pnpm dev:hmr` for faster webview iteration (live reload without extension restart)
- Press `F5` in VS Code to launch Extension Development Host
- Check Debug Console for extension-side logs
- Open DevTools in Extension Development Host (Cmd+Shift+P → "Developer: Toggle Developer Tools") for webview console
- Refresh webview: Use registered keyboard shortcut (Ctrl+Shift+R) or reload entire Extension Development Host

### Debugging Canvas/WebView Issues

If images don't display or canvas operations fail:

1. Check webview ready state and message queue
2. Verify canvas element exists before getting context
3. Add retry logic with `setTimeout` for DOM availability
4. Check CSP headers in webview HTML
5. Verify Tailwind CSS compiled: `dist/webview.css` should exist
6. Check for timing: focus view → wait → send message

## Import Conventions (Critical)

**NEVER use `import * as` syntax:**

```typescript
// ❌ Bad
import * as vscode from 'vscode'
import * as path from 'path'

// ✅ Good
import { window, commands, Uri } from 'vscode'
import { join, resolve } from 'path'
```

Benefits: Better tree-shaking, smaller bundles, explicit dependencies.

## Technology Stack

- **Build System:** Turborepo v2.5+, pnpm v9+
- **Package Manager:** pnpm workspaces
- **Extension Build:** esbuild (extension host), Vite (webview)
- **Web Framework:** SvelteKit (crater-web), Svelte 5 (components, webviews)
- **UI Library:** Svelte components with shadcn/ui patterns
- **Styling:** Tailwind CSS v4 (with `@tailwindcss/vite`)
- **TypeScript:** v5.0+, strict mode enabled
- **Testing:** Vitest (unit), @vscode/test-electron (VS Code), Playwright (E2E)
- **Linting:** ESLint 9 flat config + Prettier
- **AI Providers:** Google Gemini, OpenAI (via `@crater/core`)
