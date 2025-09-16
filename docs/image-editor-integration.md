# Image Editor Integration

## Overview

The crater-ext extension integrates with the crater-image-editor extension to provide seamless image editing capabilities. Users can generate images in the chatbot and open them directly in the image editor.

## Integration Flow

1. **Image Generation**: User generates images via crater-ext chatbot
2. **Open in Editor**: User clicks "🎨 Open in Image Editor" button in gallery
3. **Command Execution**: crater-ext calls `crater-image-editor.loadImage` command
4. **Image Loading**: crater-image-editor loads and displays the image for editing

## Key Implementation Details

- **Command**: `crater-ext.openInImageEditor` handles the integration
- **Extension Lookup**: Simplified to direct command execution (no extension ID lookup)
- **Webview Management**: Automatic refresh and readiness handling ensures reliable loading
- **Error Handling**: Graceful fallbacks for missing image editor extension

## Troubleshooting Guide

If "Open in Image Editor" doesn't work, check:

1. **Both extensions installed**: crater-ext and crater-image-editor must both be active
2. **Build status**: Run `pnpm run build:ext` in both extension directories
3. **Console logs**: Check VS Code Developer Tools for error messages
4. **File paths**: Ensure image files exist at the specified paths

## Common Issues & Solutions

### Issue: "Cannot read properties of undefined (reading 'getContext')"

**Cause**: Canvas element not available when trying to get 2D context
**Solution**: Ensure canvas initialization happens after DOM element exists (conditional rendering)

### Issue: Webview not responding to messages

**Cause**: Webview JavaScript not loading or cached version conflicts
**Solution**:

- Force webview refresh with aggressive cache busting
- Use triple cache-busting parameters: `?v=X&bust=Y&force=Z`
- Reset webview state when refreshing

### Issue: Extension command not found

**Cause**: Extension not loaded or command not registered
**Solution**:

- Check if extension is active: `vscode.extensions.getExtension('crater-image-editor')`
- Ensure command is properly registered in package.json
- Try activating extension before calling command

## Development Best Practices

1. **Webview Timing**: Always account for webview initialization delays
2. **Canvas Management**: Check element existence before getting context
3. **Cache Busting**: Use aggressive cache busting for reliable development
4. **Error Boundaries**: Implement comprehensive error handling for robustness
5. **State Management**: Reset webview state when refreshing to avoid stale data
