import { describe, it, expect } from 'vitest'
import {
    wantsImage,
    createAssistantTextMessage,
    createMissingApiKeyMessage,
    createImageProviderWarning,
    createChatModeImageWarning,
    createErrorMessage,
    computeUsageSummary,
    getPlaceholderText,
    getProviderStatus,
} from './helpers'
import type { ChatSession } from '$lib/chat/sessionTypes'

describe('wantsImage', () => {
    it('returns true when prompt contains "generate"', () => {
        expect(wantsImage('generate a hero')).toBe(true)
        expect(wantsImage('GENERATE a dragon')).toBe(true)
    })

    it('returns true when prompt contains "create"', () => {
        expect(wantsImage('create a sword icon')).toBe(true)
    })

    it('returns true when prompt contains "image"', () => {
        expect(wantsImage('show me an image')).toBe(true)
    })

    it('returns true when prompt contains "art"', () => {
        expect(wantsImage('draw pixel art')).toBe(true)
    })

    it('returns false for unrelated prompts', () => {
        expect(wantsImage('tell me a story')).toBe(false)
        expect(wantsImage('what is the best pipeline')).toBe(false)
        expect(wantsImage('')).toBe(false)
    })
})

describe('createAssistantTextMessage', () => {
    it('creates a message with the given text', () => {
        const msg = createAssistantTextMessage('Hello!')
        expect(msg.text).toBe('Hello!')
        expect(msg.sender).toBe('assistant')
        expect(msg.messageType).toBe('text')
    })

    it('generates a unique id each time', () => {
        const a = createAssistantTextMessage('A')
        const b = createAssistantTextMessage('B')
        expect(a.id).not.toBe(b.id)
    })

    it('sets a timestamp', () => {
        const before = new Date()
        const msg = createAssistantTextMessage('test')
        const after = new Date()
        expect(msg.timestamp).toBeInstanceOf(Date)
        expect(msg.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
        expect(msg.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
})

describe('createMissingApiKeyMessage', () => {
    it('mentions "Chat responses" in chat mode', () => {
        const msg = createMissingApiKeyMessage('chat')
        expect(msg.text).toContain('Chat responses')
        expect(msg.text).toContain('API key')
    })

    it('mentions "AI features" in image mode', () => {
        const msg = createMissingApiKeyMessage('image')
        expect(msg.text).toContain('AI features')
        expect(msg.text).toContain('API key')
    })

    it('returns an assistant text message', () => {
        const msg = createMissingApiKeyMessage('chat')
        expect(msg.sender).toBe('assistant')
        expect(msg.messageType).toBe('text')
    })
})

describe('createImageProviderWarning', () => {
    it('returns a message about image generation requiring a provider', () => {
        const msg = createImageProviderWarning()
        expect(msg.text).toContain('Image generation')
        expect(msg.sender).toBe('assistant')
    })
})

describe('createChatModeImageWarning', () => {
    it('returns a message about chat mode not supporting image generation', () => {
        const msg = createChatModeImageWarning()
        expect(msg.text).toContain('chat mode')
        expect(msg.sender).toBe('assistant')
    })
})

describe('createErrorMessage', () => {
    it('includes the error message for Error instances', () => {
        const msg = createErrorMessage(new Error('API failed'))
        expect(msg.text).toContain('API failed')
        expect(msg.text).toContain('❌')
    })

    it('uses generic text for non-Error values', () => {
        const msg = createErrorMessage('something bad')
        expect(msg.text).toContain('Unknown error occurred')
    })

    it('handles null/undefined gracefully', () => {
        const msg = createErrorMessage(null)
        expect(msg.text).toContain('Unknown error occurred')
    })

    it('returns an assistant text message', () => {
        const msg = createErrorMessage(new Error('oops'))
        expect(msg.sender).toBe('assistant')
        expect(msg.messageType).toBe('text')
    })
})

describe('computeUsageSummary', () => {
    it('returns zeroed summary for null session', () => {
        const result = computeUsageSummary(null)
        expect(result.hasData).toBe(false)
        expect(result.inputTokens).toBe(0)
        expect(result.outputTokens).toBe(0)
        expect(result.totalTokens).toBe(0)
        expect(result.cost).toBe(0)
        expect(result.currency).toBeNull()
    })

    it('returns zeroed summary for session with no messages', () => {
        const session: ChatSession = {
            id: 'test',
            mode: 'image',
            title: 'Test',
            createdAt: new Date().toISOString(),
            messages: [],
        }
        const result = computeUsageSummary(session)
        expect(result.hasData).toBe(false)
    })

    it('aggregates token usage from messages', () => {
        const session: ChatSession = {
            id: 'test',
            mode: 'image',
            title: 'Test',
            createdAt: new Date().toISOString(),
            messages: [
                {
                    id: '1',
                    text: 'img1',
                    sender: 'assistant',
                    timestamp: new Date(),
                    imageData: {
                        images: [],
                        prompt: 'p',
                        usage: {
                            inputTextTokens: 10,
                            outputImageTokens: 20,
                            totalTokens: 30,
                        },
                    },
                },
                {
                    id: '2',
                    text: 'img2',
                    sender: 'assistant',
                    timestamp: new Date(),
                    imageData: {
                        images: [],
                        prompt: 'p2',
                        usage: {
                            inputTextTokens: 5,
                            outputImageTokens: 15,
                            totalTokens: 20,
                        },
                    },
                },
            ],
        }
        const result = computeUsageSummary(session)
        expect(result.hasData).toBe(true)
        expect(result.inputTokens).toBe(15)
        expect(result.outputTokens).toBe(35)
        expect(result.totalTokens).toBe(50)
    })

    it('aggregates cost from messages', () => {
        const session: ChatSession = {
            id: 'test',
            mode: 'image',
            title: 'Test',
            createdAt: new Date().toISOString(),
            messages: [
                {
                    id: '1',
                    text: 'img1',
                    sender: 'assistant',
                    timestamp: new Date(),
                    imageData: {
                        images: [],
                        prompt: 'p',
                        cost: { totalCost: 0.05, currency: 'USD' },
                    },
                },
                {
                    id: '2',
                    text: 'img2',
                    sender: 'assistant',
                    timestamp: new Date(),
                    imageData: {
                        images: [],
                        prompt: 'p2',
                        cost: { totalCost: 0.03, currency: 'USD' },
                    },
                },
            ],
        }
        const result = computeUsageSummary(session)
        expect(result.hasData).toBe(true)
        expect(result.cost).toBeCloseTo(0.08)
        expect(result.currency).toBe('USD')
    })

    it('uses the first currency found', () => {
        const session: ChatSession = {
            id: 'test',
            mode: 'image',
            title: 'Test',
            createdAt: new Date().toISOString(),
            messages: [
                {
                    id: '1',
                    text: '',
                    sender: 'assistant',
                    timestamp: new Date(),
                    imageData: {
                        images: [],
                        prompt: 'p',
                        cost: { totalCost: 0.01, currency: 'USD' },
                    },
                },
                {
                    id: '2',
                    text: '',
                    sender: 'assistant',
                    timestamp: new Date(),
                    imageData: {
                        images: [],
                        prompt: 'p2',
                        cost: { totalCost: 0.01, currency: 'EUR' },
                    },
                },
            ],
        }
        const result = computeUsageSummary(session)
        expect(result.currency).toBe('USD')
    })

    it('ignores messages without imageData', () => {
        const session: ChatSession = {
            id: 'test',
            mode: 'chat',
            title: 'Test',
            createdAt: new Date().toISOString(),
            messages: [
                {
                    id: '1',
                    text: 'hello',
                    sender: 'user',
                    timestamp: new Date(),
                },
            ],
        }
        const result = computeUsageSummary(session)
        expect(result.hasData).toBe(false)
    })
})

describe('getPlaceholderText', () => {
    it('returns generic text when no active session', () => {
        expect(getPlaceholderText(null, true, true)).toBe(
            'Ask me about game assets...'
        )
    })

    it('returns configured chat text when chat session is configured', () => {
        const session: ChatSession = {
            id: '1',
            mode: 'chat',
            title: 'Chat',
            createdAt: '',
            messages: [],
        }
        const text = getPlaceholderText(session, true, false)
        expect(text).toContain('Chat about game asset')
        expect(text).not.toContain('configure')
    })

    it('returns unconfigured chat text when chat session is not configured', () => {
        const session: ChatSession = {
            id: '1',
            mode: 'chat',
            title: 'Chat',
            createdAt: '',
            messages: [],
        }
        const text = getPlaceholderText(session, false, false)
        expect(text).toContain('configure AI')
    })

    it('returns configured image text when image session is configured', () => {
        const session: ChatSession = {
            id: '1',
            mode: 'image',
            title: 'Image',
            createdAt: '',
            messages: [],
        }
        const text = getPlaceholderText(session, false, true)
        expect(text).toContain('pixel art')
    })

    it('returns unconfigured image text when image session is not configured', () => {
        const session: ChatSession = {
            id: '1',
            mode: 'image',
            title: 'Image',
            createdAt: '',
            messages: [],
        }
        const text = getPlaceholderText(session, false, false)
        expect(text).toContain('configure AI')
    })
})

describe('getProviderStatus', () => {
    it('returns active status when configured', () => {
        const status = getProviderStatus(true, 'gemini', 'AIzaKey')
        expect(status.indicator).toBe('active')
        expect(status.text).toContain('GEMINI')
    })

    it('returns DEBUG Ready for debug when configured', () => {
        const status = getProviderStatus(true, 'debug', '')
        expect(status.indicator).toBe('active')
        expect(status.text).toBe('DEBUG Ready')
    })

    it('returns active DEBUG Ready for debug even when not configured', () => {
        const status = getProviderStatus(false, 'debug', '')
        expect(status.indicator).toBe('active')
        expect(status.text).toBe('DEBUG Ready')
    })

    it('returns inactive with add key message when not configured and no api key', () => {
        const status = getProviderStatus(false, 'gemini', '')
        expect(status.indicator).toBe('inactive')
        expect(status.text).toContain('Add')
        expect(status.text).toContain('GEMINI')
    })

    it('returns inactive with check settings when not configured but has api key', () => {
        const status = getProviderStatus(false, 'openai', 'sk-somekey')
        expect(status.indicator).toBe('inactive')
        expect(status.text).toContain('Check')
        expect(status.text).toContain('OPENAI')
    })
})
