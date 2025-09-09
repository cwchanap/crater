# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Crater is a Turborepo monorepo consisting of:

- **`apps/crater-ext/`** - VS Code extension with AI-powered game asset generation chatbot
- **`apps/crater-web/`** - SvelteKit web application
- **`packages/core/`** - Core shared logic and utilities
- **`packages/ui-components/`** - React component library with shadcn/ui and Tailwind CSS

## Essential Commands

### Root Level (All packages/apps)

```bash
pnpm build          # Build all packages and apps
pnpm dev            # Start development mode for all
pnpm lint           # Lint all packages
pnpm lint:fix       # Fix lint issues across all packages
pnpm test           # Run tests across all packages
pnpm type-check     # TypeScript checking across all packages
pnpm format         # Format code with Prettier
pnpm format:check   # Check code formatting
pnpm clean          # Clean build artifacts
```

### VS Code Extension (`apps/crater-ext/`)

```bash
cd apps/crater-ext
pnpm dev            # Watch mode for both extension and webview
pnpm dev:hmr        # Development with hot module replacement
pnpm build          # Production build
pnpm test           # Run extension tests
pnpm package        # Create .vsix package
```

### SvelteKit Web App (`apps/crater-web/`)

```bash
cd apps/crater-web
pnpm dev            # Start development server
pnpm build          # Build for production
pnpm preview        # Preview production build
pnpm test           # Run Vitest tests
pnpm test:unit      # Run unit tests
```

### Core Package (`packages/core/`)

```bash
cd packages/core
pnpm test           # Run Vitest tests
pnpm test:watch     # Run tests in watch mode
```

## Architecture & Key Patterns

### Monorepo Structure

- Uses pnpm workspaces with `workspace:*` dependencies between internal packages
- Turborepo manages build orchestration and caching via `turbo.json`
- Each package has independent scripts but respects dependency order during builds

### VS Code Extension Architecture

- Main extension logic in `src/extension.ts` - registers commands and providers
- `ChatbotProvider` implements `WebviewViewProvider` for sidebar chat interface
- WebView uses embedded HTML/CSS/JS with VS Code theme integration
- Message passing between extension and webview via `postMessage`/`onDidReceiveMessage`
- Build process:
    - Extension: esbuild via `esbuild.js` → `dist/extension.js`
    - WebView: Vite → `dist/webview.js`
- Support for hot module replacement during development

### Package Dependencies

- `@crater/core` provides shared utilities used by both apps
- `@crater/ui-components` provides React components for potential future use
- Extensions depend on VS Code API types and WebView interfaces

### Development Workflow

1. Install: `pnpm install` (from root)
2. Build dependencies: `pnpm build`
3. For extension development: `cd apps/crater-ext && pnpm dev`
4. Test extension: Press F5 in VS Code to launch Extension Development Host
5. Debug via VS Code Debug Console

### Code Quality

- ESLint 9+ flat config (`eslint.config.js`) with environment-specific rules
- Prettier integration with pre-commit hooks via Husky + lint-staged
- TypeScript strict mode enabled across all packages
- Different ESLint configs for Node.js, React components, VS Code extensions, and tests

### Testing

- Core package: Vitest with `test` and `test:watch` scripts
- Extension: VS Code testing framework with `@vscode/test-electron`
- Web app: Vitest with browser testing support via Playwright

### Build Outputs

- VS Code extension: `dist/extension.js` and `dist/webview.js`
- Core package: Dual ESM/CJS output via tsup in `dist/`
- UI Components: Dual ESM/CJS output via tsup in `dist/`
- Web app: Static build output in `build/` directory

## Extension Development Specifics

### Commands and Contributions

- Commands use `crater-ext.` prefix (defined in `package.json` contributes section)
- WebView appears in activity bar with game icon
- Keyboard shortcuts: `Ctrl+Shift+R` / `Cmd+Shift+R` to refresh webview

### Configuration Settings

Extension supports configurable AI providers (Gemini, OpenAI), image settings, and save directories through VS Code settings.

### Key Extension Files

- `src/extension.ts` - Main extension entry point
- `src/providers/ChatbotProvider.ts` - WebView provider implementation
- `src/webview.ts` - WebView client-side logic
- `esbuild.js` - Build configuration
- `vite.config.js` - WebView build configuration
