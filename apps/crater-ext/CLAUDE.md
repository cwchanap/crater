# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **crater-ext**, a VSCode extension that provides an AI-powered game asset generation chatbot. The extension integrates with AI providers (Google Gemini, OpenAI) to help users generate creative game content through a webview-based chat interface.

## Architecture

### Core Components

- **`src/extension.ts`**: Main extension entry point that handles activation, command registration, and webview provider setup. Manages configuration change listeners and extension lifecycle.
- **`src/chatbotProvider.ts`**: Core `WebviewViewProvider` implementation. Manages AI provider initialization, chat session persistence, message routing, and image file saving. Handles all webview communication via message-based protocol.
- **`src/webview.ts`**: Webview entry point using Svelte 5 mount API. Creates and initializes the Svelte-based chat interface.
- **`@crater/core`**: External workspace dependency providing `ChatBotService`, `GeminiImageProvider`, and `OpenAIImageProvider` classes for AI integration.

### Webview Architecture (Svelte-based)

- **`src/webview/App.svelte`**: Root Svelte component managing application state and page routing
- **`src/webview/components/`**: Modular Svelte components for chat interface, settings, and history
- **`src/webview/stores/`**: Svelte stores for state management across components
- **`src/webview/types/`**: TypeScript definitions for webview message protocol

### VSCode Integration

- **Activity Bar Integration**: Adds "Crater Game Assets" container with webview panel
- **Commands**: `crater-ext.openChatbot` (focus view), `crater-ext.updateAIProvider` (refresh config)
- **Configuration**: Uses VSCode settings API with live configuration change detection
- **Storage**: Leverages VSCode `ExtensionContext.globalState` for chat session persistence

### AI Provider System

- Supports Google Gemini (`GeminiImageProvider`) and OpenAI (`OpenAIImageProvider`)
- Dynamic provider switching with real-time configuration updates
- API key validation with provider-specific format checking (Gemini: `AIza*`, OpenAI: `sk-*`)
- Image generation with automatic file saving to configurable workspace directory
- Model selection including Gemini 2.5 Flash, Imagen 4.0, and OpenAI GPT-Image-1

## Development Commands

### Build & Development

```bash
pnpm run build          # Full build with linting
pnpm run dev            # Development build with watch mode
pnpm run watch          # Parallel watch for TypeScript and esbuild
pnpm run compile        # Type check, lint, and build
```

### Quality Assurance

```bash
pnpm run type-check     # TypeScript type checking only
pnpm run lint           # ESLint validation
pnpm run lint:fix       # Auto-fix ESLint issues
pnpm run format         # Format code with Prettier
```

### Testing & Packaging

```bash
pnpm run test           # Run VSCode extension tests
pnpm run package        # Create .vsix package
pnpm run clean          # Clean build artifacts
```

### Build System

- **Extension Build**: Uses esbuild for TypeScript compilation and bundling
  - **esbuild.js**: Custom build configuration with VS Code problem matcher plugin
  - Outputs to `dist/extension.js` with `vscode` kept external
  - Production builds are minified, development builds include sourcemaps
- **Webview Build**: Uses Vite + Svelte for webview frontend
  - **vite.config.ts**: Configured for IIFE format compatible with VS Code webviews
  - Outputs to `dist/webview.js` and `dist/webview.css`
  - Supports Svelte 5 with modern TypeScript compilation
- **Parallel Development**: `npm-run-all` enables simultaneous extension and webview watching

## Configuration Architecture

### Extension Settings (`crater-ext.*`)

- `aiProvider`: Provider selection ("gemini" | "openai")
- `aiModel`: Model selection with options:
  - Gemini: `gemini-2.5-flash-image-preview`, `imagen-4.0-generate-001`, `gemini-2.0-flash-exp`, `gemini-1.5-flash`, `gemini-1.5-pro`
  - OpenAI: `gpt-image-1`
- `geminiApiKey`: Google Gemini API key (secure storage)
- `openaiApiKey`: OpenAI API key (secure storage)
- `imageSaveDirectory`: Directory for generated images (supports VS Code variables like `${workspaceFolder}`)
- `autoSaveImages`: Automatically save generated images to filesystem
- `imageSize`: Image dimensions for OpenAI provider ("auto", "1024x1024", "1024x1536", "1536x1024")
- `imageQuality`: Image quality for OpenAI provider ("auto", "low", "medium", "high")

### Settings Management Flow

1. User updates settings via webview interface or VS Code settings
2. Configuration change listener in `extension.ts` detects changes
3. `ChatbotProvider.updateAIProvider()` reinitializes provider
4. Webview receives provider update notification

## Message Protocol

The extension uses a message-based protocol between the webview and extension:

### Webview → Extension

- `send-message`: Send chat message to AI
- `get-settings`: Request current configuration
- `save-settings`: Update configuration
- `clear-chat`: Clear chat history
- `get-provider-info`: Request provider status

### Extension → Webview

- `image-response`: AI-generated image response with URLs and save paths
- `chat-response`: Text-based AI responses and error messages
- `provider-updated`: Provider configuration changed notification
- `settings`: Current extension settings
- `settings-saved`: Settings save confirmation
- `chat-history`: Historical messages for session restoration
- `chat-sessions`: Available chat sessions with metadata
- `chat-cleared`: New chat session created confirmation
- `provider-info`: Current AI provider status and availability

## Chat Session Management

### Session Persistence

- **Session Storage**: Uses VS Code `ExtensionContext.globalState` for persistence across extension reloads
- **Session Structure**: Each session contains ID, title, messages, creation date, and last activity timestamp
- **Message History**: Extended message format includes text, sender, timestamp, message type, and optional image data
- **Migration**: Automatic migration from legacy single-history format to multi-session format

### Session Operations

- **Auto-titling**: Session titles generated from first user message (30 char limit)
- **Session Switching**: Load different chat sessions without losing current session state
- **New Chat**: Creates fresh session while preserving previous chat in history

## Development Guidelines

### Testing Extension Changes

1. **Extension Development Host**: Press `F5` in VS Code to launch Extension Development Host
2. **View Registration**: Use Command Palette → "Open Game Asset Chatbot" to test view activation
3. **Configuration Testing**: Test provider switching and API key validation in settings
4. **Chat Session Testing**: Verify session persistence across extension reloads

### WebView Development

- **Hot Reload**: Use `pnpm run dev` for automatic rebuilds of both extension and webview
- **HMR Development**: Use "Run Extension with HMR" debug configuration for hot module replacement
  - Automatically refreshes webview on file changes
  - Shows status bar notifications when files reload
  - Environment variables: `NODE_ENV=development`, `CRATER_HMR_ENABLED=true`
- **Debug WebView**: Right-click webview → "Open WebView Developer Tools"
- **Message Protocol**: All extension ↔ webview communication uses structured message passing
- **State Management**: Svelte stores handle UI state; extension handles persistence

### Working with AI Providers

- **Provider Interface**: All providers implement common interface from `@crater/core`
- **Error Handling**: Provider errors are caught and displayed as chat responses
- **Image Processing**: Base64 data conversion and file saving handled in `chatbotProvider.ts:saveImageToFile()`
- **Model Selection**: Different models trigger different image generation strategies

### Key File Dependencies

- **Extension HTML**: `src/webview.html` template with placeholder substitution
- **Webview Assets**: Built assets loaded via `webview.asWebviewUri()` with cache-busting
- **External Dependencies**: `@crater/core` must be available in workspace for AI provider classes
