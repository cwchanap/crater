# Crater - Game Asset Generator

A VS Code extension featuring an AI-powered chatbot assistant for brainstorming and planning game assets.

## Features

🎮 **Game Asset Assistant Chatbot**

- Interactive chatbot interface in the Explorer panel
- Helps brainstorm ideas for various game assets:
    - Character sprites and animations
    - Background environments and textures
    - UI elements and interfaces
    - Sound effect concepts
    - Game mechanics ideas

## Usage

### Opening the Chatbot

1. **Via Command Palette**:
    - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
    - Type "Open Game Asset Chatbot" and select the command

2. **Via Explorer Panel**:
    - The "Game Asset Assistant" panel will appear in the Explorer sidebar
    - Click on it to start chatting

### Using the Chatbot

- Type your questions or requests about game assets
- The assistant can help with:
    - Character design ideas
    - Environment and background concepts
    - Texture and material suggestions
    - UI/UX element planning
    - Game mechanics brainstorming

### Example Questions

- "I need ideas for a fantasy warrior character sprite"
- "What textures would work well for a sci-fi spaceship interior?"
- "Help me design UI elements for a retro platformer game"
- "I'm creating a forest background, what elements should I include?"

## Development

### Building the Extension

```bash
cd apps/crater-ext
pnpm install
pnpm run build
```

### Running in Development Mode

```bash
pnpm run dev
```

This will start esbuild in watch mode for development.

### Testing the Extension

1. Open VS Code
2. Press `F5` to open a new Extension Development Host window
3. The extension will be loaded and ready to test

## Technical Details

The extension uses:

- **WebView API** for the chatbot interface
- **Custom CSS** styled to match VS Code themes
- **Message passing** between the webview and extension
- **Rule-based responses** (can be extended with real AI integration)

## Future Enhancements

- Integration with real AI services (OpenAI, Claude, etc.)
- Asset generation capabilities
- Export functionality for generated ideas
- Integration with popular game development tools
- Custom asset templates and libraries

## Requirements

- VS Code 1.103.0 or higher

## Release Notes5

### 0.0.1

Initial release with basic chatbot functionality for game asset brainstorming.
