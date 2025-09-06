# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **crater-ext**, a VSCode extension that provides an AI-powered game asset generation chatbot. The extension integrates with AI providers (Google Gemini, OpenAI) to help users generate creative game content through a webview-based chat interface.

## Architecture

### Core Components

- **`src/extension.ts`**: Main extension entry point that handles activation, command registration, and webview provider setup
- **`src/chatbotProvider.ts`**: Implements `WebviewViewProvider` for the chat interface, manages AI provider configuration, and handles message routing between webview and extension
- **`@crater/core`**: External workspace dependency providing `ChatBotService`, `GeminiImageProvider`, and `OpenAIImageProvider` classes

### VSCode Integration

- **Activity Bar Integration**: Adds "Crater Game Assets" container with webview panel
- **Commands**: Provides commands for opening chatbot, testing view registration, and updating AI providers
- **Configuration**: Uses VSCode settings API for AI provider selection and API key management
- **Dual Views**: Main view in activity bar and debug view in Explorer sidebar

### AI Provider System

- Supports Google Gemini (`GeminiImageProvider`) and OpenAI (`OpenAIImageProvider`)
- Dynamic provider switching based on user configuration
- API key validation with format checking
- Automatic provider reinitialization on configuration changes

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

### Key Scripts

- **esbuild.js**: Custom build configuration with VS Code problem matcher plugin
- Build outputs to `dist/extension.js` with external `vscode` dependency
- Production builds are minified, development builds include sourcemaps

## Configuration Architecture

### Extension Settings (`crater-ext.*`)

- `aiProvider`: Provider selection ("gemini" | "openai")
- `aiModel`: Model selection (provider-specific options)
- `geminiApiKey`: Google Gemini API key (secure storage)
- `openaiApiKey`: OpenAI API key (secure storage)

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

- `chat-response`: AI response to user message
- `provider-updated`: Provider configuration changed
- `settings`: Current settings data
- `settings-saved`: Confirmation of successful save
