# Crater AI Providers

This document explains how to use the AI providers in the Crater game asset chatbot system.

## Overview

Crater supports multiple AI providers for generating game asset suggestions:

- **MockImageProvider**: Hardcoded responses, no API key needed (great for demos and offline usage)
- **GeminiImageProvider**: Google Gemini AI with image analysis support
- **OpenAIImageProvider**: OpenAI GPT-4 Vision with image analysis support

## Usage

### VS Code Extension

The extension automatically uses the MockImageProvider by default. To configure real AI providers:

1. Open VS Code Settings (`Cmd/Ctrl + ,`)
2. Search for "Crater"
3. Configure the settings:
   - **AI Provider**: Choose between `mock`, `gemini`, or `openai`
   - **Gemini API Key**: Required when using Gemini provider
   - **OpenAI API Key**: Required when using OpenAI provider

### Web Applications

```typescript
import {
  WebChatBotService,
  MockImageProvider,
  GeminiImageProvider,
  OpenAIImageProvider,
} from '@crater/core'

// Option 1: Mock provider (no API key needed)
const mockProvider = new MockImageProvider()
const chatService = new WebChatBotService({}, mockProvider)

// Option 2: Gemini provider
const geminiProvider = new GeminiImageProvider({
  apiKey: 'your-gemini-api-key',
  model: 'gemini-2.0-flash-exp', // optional, uses default if not specified
})
const chatService = new WebChatBotService({}, geminiProvider)

// Option 3: OpenAI provider
const openaiProvider = new OpenAIImageProvider({
  apiKey: 'your-openai-api-key',
  model: 'gpt-4-vision-preview', // optional, uses default if not specified
})
const chatService = new WebChatBotService({}, openaiProvider)

// Send messages with optional image analysis
const response = await chatService.sendMessage(
  'Help me design a warrior sprite'
)
const responseWithImage = await chatService.sendMessage(
  'Analyze this game asset',
  ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'] // base64 image
)
```

### Core Service (Framework Agnostic)

```typescript
import { ChatBotService, GeminiImageProvider } from '@crater/core'

const aiProvider = new GeminiImageProvider({ apiKey: 'your-api-key' })
const chatService = new ChatBotService(
  {
    systemPrompt: 'You are a game asset expert.',
    thinkingTime: 1000,
  },
  aiProvider
)

// Generate responses
const response = await chatService.generateResponse('I need help with textures')
const imageResponse = await chatService.generateResponse(
  'What do you think of this sprite?',
  ['base64-encoded-image']
)
```

## AI Provider Details

### MockImageProvider

- **Purpose**: Demo and offline usage
- **Features**: Sophisticated hardcoded responses based on keywords
- **Benefits**: No API key needed, fast responses, works offline
- **Limitations**: No real AI, limited to predefined responses

```typescript
const mockProvider = new MockImageProvider({
  options: { delay: 500 }, // Optional delay to simulate network
})
```

### GeminiImageProvider

- **Model**: `gemini-2.0-flash-exp` (default)
- **Features**: Text generation, image analysis, creative brainstorming
- **API Key**: Get from [Google AI Studio](https://aistudio.google.com/)
- **Cost**: Pay-per-use pricing

```typescript
const geminiProvider = new GeminiImageProvider({
  apiKey: 'your-api-key',
  model: 'gemini-2.0-flash-exp', // optional
  options: {
    temperature: 0.7,
    maxTokens: 1000,
  },
})

// Test connection
const isConnected = await geminiProvider.testConnection()
```

### OpenAIImageProvider

- **Model**: `gpt-4-vision-preview` (default)
- **Features**: Text generation, image analysis, detailed technical advice
- **API Key**: Get from [OpenAI Platform](https://platform.openai.com/)
- **Cost**: Pay-per-use pricing

```typescript
const openaiProvider = new OpenAIImageProvider({
  apiKey: 'your-api-key',
  model: 'gpt-4-vision-preview', // optional
  options: {
    temperature: 0.7,
    maxTokens: 1000,
  },
})

// Test connection
const isConnected = await openaiProvider.testConnection()
```

## Image Analysis

All AI providers support image analysis (MockImageProvider provides simulated analysis):

```typescript
// Supported image formats
const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'
const base64ImagePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'

// Send message with images
const response = await chatService.generateResponse(
  'Analyze this sprite and suggest improvements',
  [base64Image, base64ImagePng] // Multiple images supported
)
```

## Provider Configuration

### Configuration Options

```typescript
interface AIProviderConfig {
  apiKey?: string
  model?: string
  options?: {
    temperature?: number // Creativity level (0.0 - 1.0)
    maxTokens?: number // Maximum response length
    timeout?: number // Request timeout in ms
    [key: string]: any // Provider-specific options
  }
}
```

### Switching Providers

```typescript
// Start with one provider
let provider = new MockImageProvider()
const chatService = new ChatBotService({}, provider)

// Switch to different provider
provider = new GeminiImageProvider({ apiKey: 'key' })
chatService.setAIProvider(provider)

// Or use web service
const webService = new WebChatBotService()
webService.setAIProvider(provider)
```

## Error Handling

The system gracefully falls back to hardcoded responses if AI providers fail:

```typescript
try {
  const response = await chatService.generateResponse('Help me!')
  // Will use AI provider if available and configured
  // Falls back to hardcoded responses if AI fails
} catch (error) {
  console.error('Chatbot error:', error)
  // Even errors are handled gracefully
}
```

## Best Practices

1. **Start with MockImageProvider** for development and testing
2. **Test connections** before using real AI providers
3. **Handle API costs** by setting appropriate token limits
4. **Cache responses** for repeated queries when possible
5. **Provide fallbacks** for when AI providers are unavailable
6. **Secure API keys** - never commit them to version control

## Example: Complete Integration

```typescript
import { GameAssetChatbotDemo } from './ai-provider-demo'

// Demo with mock provider
const mockDemo = new GameAssetChatbotDemo({ provider: 'mock' })
await mockDemo.sendMessage('I need a fantasy character')

// Demo with real AI (requires API key)
const aiDemo = new GameAssetChatbotDemo({
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY,
})

// Test connection first
if (await aiDemo.testConnection()) {
  const result = await aiDemo.sendMessage('Design a pixel art sword')
  console.log(result.aiResponse.text)
}
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Run `pnpm build` in the core package
2. **API key errors**: Verify your API key is correct and has sufficient credits
3. **Connection timeouts**: Check your internet connection and API service status
4. **Invalid image format**: Ensure images are base64-encoded with proper data URL format

### Debug Mode

```typescript
// Get provider information
const info = provider.getInfo()
console.log(
  'Provider:',
  info.type,
  'Model:',
  info.model,
  'Configured:',
  info.configured
)

// Test connection
const connected = await provider.testConnection()
console.log('Connection test:', connected)
```
