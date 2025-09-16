# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Crater is a Turborepo monorepo consisting of:

- **`apps/crater-ext/`** - VS Code extension with AI-powered game asset generation chatbot
- **`apps/crater-image-editor/`** - VS Code extension for image editing and processing
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

### Image Editor Extension (`apps/crater-image-editor/`)

```bash
cd apps/crater-image-editor
pnpm dev            # Watch mode for both extension and webview
pnpm build          # Production build
pnpm build:ext      # Build extension only
pnpm build:webview  # Build webview only
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

## Image Editor Extension Specifics

### Architecture & Critical Patterns

- **Svelte WebView**: Uses Svelte for reactive UI with Canvas-based image editing
- **WebView Provider**: `ImageEditorProvider` manages webview lifecycle and image loading
- **Message Queuing**: Critical timing system for webview-extension communication
- **Canvas Integration**: Direct HTML5 Canvas manipulation for image editing operations

### Key Timing Considerations

1. **Webview Initialization Race Conditions**:
   - Canvas element must be available in DOM before context initialization
   - Svelte component mounting happens asynchronously
   - Image loading must wait for canvas readiness
   - **Fix Pattern**: Use retry logic with `setTimeout` for canvas availability checking

2. **Extension-to-Extension Communication**:
   - `crater-ext` calls `crater-image-editor.loadImage` command
   - Proper view focusing required before image loading
   - Message queueing prevents lost messages during webview initialization

3. **Critical Timing Sequence**:
   ```
   1. Focus image editor view
   2. Wait 500ms for view availability
   3. Load image (queued if webview not ready)
   4. Force webview ready after 1500ms
   5. Canvas checks readiness with 100ms retry intervals
   ```

### Common Issues & Solutions

**Problem**: Image not displaying after `Open image at editor` command

- **Cause**: Canvas not ready when image data arrives
- **Solution**: Canvas readiness checking with retry mechanism in `loadImage()`

**Problem**: Webview messages being lost

- **Cause**: Messages sent before webview ready state
- **Solution**: Message queuing in `sendMessageToWebview()` with `flushPendingMessages()`

**Problem**: Tailwind CSS not applying

- **Cause**: Usually false alarm - CSS builds correctly via Vite + PostCSS
- **Solution**: Verify `dist/webview.css` contains classes, check CSP headers

### Debug Patterns

- Use extensive console logging in both extension and webview
- Check VS Code Developer Tools for webview console messages
- Verify canvas context initialization before image operations
- Monitor webview ready state transitions

### Key Files (Image Editor)

- `src/extension.ts` - Command registration and inter-extension communication
- `src/imageEditorProvider.ts` - WebView lifecycle and message handling
- `src/App.svelte` - Main Svelte component with canvas operations
- `src/webview.ts` - WebView entry point and Svelte app mounting
- `vite.config.mjs` - Svelte + Tailwind build configuration
