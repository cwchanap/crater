# Crater Monorepo - AI Development Guide

## Architecture Overview

**Crater** is a Turborepo monorepo with 3 main components:

- `apps/crater-ext/` - VS Code extension with WebView-based chatbot for game asset brainstorming
- `apps/crater-web/` - SvelteKit web application (basic setup)
- `packages/ui-components/` - React component library using shadcn/ui, Radix UI, and Tailwind CSS

## Key Development Patterns

### Monorepo Structure & Dependencies

- Use `pnpm` workspaces with `workspace:*` pattern for internal dependencies
- Turborepo handles build orchestration with dependency graphs in `turbo.json`
- Root commands (`pnpm build`, `pnpm dev`) operate across all packages
- Each app/package has its own `package.json` with specific scripts

### VS Code Extension Architecture

The extension (`apps/crater-ext/`) follows VS Code's WebView pattern:

- Main extension logic in `src/extension.ts` registers providers and commands
- `ChatbotProvider` implements `WebviewViewProvider` for sidebar integration
- HTML/CSS/JS embedded as string in provider (see `_getHtmlForWebview()`)
- Message passing between WebView and extension via `postMessage`/`onDidReceiveMessage`
- Build with esbuild (`esbuild.js`) - outputs to `dist/extension.js`

### Build & Development Workflow

```bash
# Install dependencies (monorepo root)
pnpm install

# Build all packages (respects dependency order)
pnpm build

# Watch mode for extension development
cd apps/crater-ext && pnpm dev

# Test extension: F5 in VS Code opens Extension Development Host
```

### Code Quality Setup

- **ESLint 9+ Flat Config** (`eslint.config.js`) with environment-specific rules
- Different configs for: Node.js files, TypeScript, React components, VS Code extensions, tests
- **Prettier** integrated with ESLint, runs on save and pre-commit
- **Husky + lint-staged** for pre-commit hooks on staged files only

### UI Components (shadcn/ui Pattern)

Located in `packages/ui-components/`:

- React components with Tailwind CSS using `class-variance-authority`
- Export pattern: component + variants + types (see `src/index.ts`)
- Build with `tsup` for dual ESM/CJS output
- Use `cn()` utility for conditional classes (from `utils/cn.ts`)

### Extension-Specific Conventions

- WebView HTML styling uses VS Code CSS variables (`--vscode-*`)
- Commands use `crater-ext.` prefix (registered in `package.json` contributes)
- WebView registered in Explorer sidebar with `views.explorer` contribution
- Console logging allowed in extension code (ESLint override)

## Common Tasks

### Adding New Extension Commands

1. Add to `package.json` `contributes.commands`
2. Register in `extension.ts` with `vscode.commands.registerCommand`
3. Add to `context.subscriptions`

### Adding UI Components

1. Create in `packages/ui-components/src/components/`
2. Export from `src/index.ts`
3. Reference as `@crater/ui-components` in consuming apps

### Extension Development

- Use `pnpm dev` for watch mode compilation
- Press `F5` in VS Code to launch Extension Development Host
- Check Debug Console for extension logs
- Reload Extension Development Host to test changes

### Testing WebView Integration

- Focus Explorer panel to see "Game Asset Assistant"
- Use Command Palette: "Open Game Asset Chatbot"
- WebView supports VS Code theming automatically
