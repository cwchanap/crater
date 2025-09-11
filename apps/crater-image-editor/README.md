# Crater Image Editor

A VS Code extension for cropping and resizing images directly within the editor.

## Features

- **Crop Images**: Interactively select and crop regions of your images
- **Resize Images**: Adjust image dimensions with aspect ratio preservation
- **Multiple Formats**: Export to PNG, JPG, JPEG, and WebP formats
- **Quality Control**: Adjust compression quality for lossy formats
- **Context Menu Integration**: Right-click on image files in the Explorer to edit them
- **Activity Bar Integration**: Dedicated Image Editor panel in the activity bar

## Usage

### Opening Images

1. **From Explorer**: Right-click on any image file (PNG, JPG, JPEG, GIF, BMP, WebP) and select "Edit with Crater Image Editor"
2. **From Activity Bar**: Click the Image Editor icon in the activity bar and use "Select Image"
3. **Command Palette**: Use `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and search for "Open Image Editor"

### Editing Images

1. **Crop Mode**: Click "Crop" to enter cropping mode. A blue rectangle will appear that you can drag to position your crop area. Click "Apply Crop" to crop the image.

2. **Resize Mode**: Click "Resize" to enter resizing mode. Enter new width and height values. Enable "Maintain aspect ratio" to preserve the image proportions.

3. **Export**: Choose your desired output format (PNG, JPG, JPEG, WebP) and quality settings, then click "Save" to export the edited image.

4. **Reset**: Click "Reset" to return to the original image at any time.

### Keyboard Shortcuts

- `Ctrl+Shift+I` / `Cmd+Shift+I` - Refresh the webview (development)

## Configuration

The extension can be configured through VS Code settings:

- **Output Directory**: Where edited images are saved (default: `${workspaceFolder}/edited-images`)
- **Output Format**: Default format for saved images (PNG, JPG, JPEG, WebP)
- **Quality**: Default quality for lossy formats (1-100)
- **Preserve Original**: Whether to keep the original image file when saving edited versions

## Development

This extension is part of the Crater monorepo and follows the same architecture as other Crater extensions.

### Prerequisites

Make sure you have VS Code and the recommended extensions installed:

- TypeScript and JavaScript Language Features
- Prettier - Code formatter
- ESLint
- Svelte for VS Code
- Tailwind CSS IntelliSense

### Building

```bash
# From the extension directory
pnpm build

# For production build
pnpm run compile

# From the monorepo root
pnpm build --filter=crater-image-editor
```

### Development Mode

```bash
# Start development mode with watch and HMR
pnpm dev

# Or from workspace root
pnpm run dev --filter=crater-image-editor
```

This will start both the extension compilation and webview development servers with hot reload support.

### Debugging

#### VS Code Workspace

If using the crater.code-workspace file, you have several debug configurations available:

1. **Run Image Editor Extension** - Standard debugging
2. **Run Image Editor Extension (Development)** - With other extensions disabled
3. **Run Image Editor Extension with HMR** - With hot module reload enabled
4. **Image Editor Extension Tests** - For running unit tests

#### Local Development

From the crater-image-editor directory, use F5 to start debugging or use these configurations:

1. **Run Extension** - Basic debugging setup
2. **Run Extension (Development)** - Clean environment debugging
3. **Run Extension with HMR** - Development with auto-reload

#### Debug Workflow

1. Set breakpoints in your TypeScript files (`src/extension.ts`, `src/imageEditorProvider.ts`)
2. Press F5 or use the Debug panel to start debugging
3. A new Extension Development Host window will open
4. Test your extension functionality in the development window

#### Debugging WebView

- WebView code runs in a separate context from the extension
- Use browser DevTools by right-clicking in the webview and selecting "Inspect Element"
- Console logs from the webview appear in the browser DevTools console
- Extension logs appear in VS Code's Developer Tools console

### Tasks Available

- `build` - Build the extension for production
- `watch` - Watch mode for development
- `compile-tests` - Compile test files
- `dev-hmr` - Development mode with hot module reload
- `build-for-debug` - Quick build for debugging

## Architecture

The extension consists of:

- **Extension Host** (`src/extension.ts`): Main extension logic, command registration
- **Image Editor Provider** (`src/imageEditorProvider.ts`): WebView provider for the image editing interface
- **WebView Interface** (`src/App.svelte`): Svelte-based UI for image editing with HTML5 Canvas
- **Build System**: esbuild for extension compilation, Vite for webview bundling

## Contributing

This extension is part of the larger Crater project. Please refer to the main project documentation for contribution guidelines.
