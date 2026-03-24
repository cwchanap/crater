import { describe, it, expect, beforeEach } from 'vitest'
import { ChatBotService } from '../chatbot-service'
import { ImageGenerationResponse } from '../types'
import { MockImageProvider, MockTextOnlyProvider } from './test-utils'

describe('ChatBotService', () => {
    let chatBot: ChatBotService
    let mockProvider: MockImageProvider

    beforeEach(() => {
        mockProvider = new MockImageProvider({ apiKey: 'test-key' })
        chatBot = new ChatBotService(
            {
                systemPrompt: 'Test system prompt',
                thinkingTime: 0, // Disable for faster tests
                maxMessageLength: 100,
            },
            mockProvider
        )
    })

    describe('constructor', () => {
        it('should initialize with default config', () => {
            const defaultBot = new ChatBotService()
            expect(defaultBot.getAIProvider()).toBeUndefined()
        })

        it('should initialize with custom config', () => {
            const config = {
                systemPrompt: 'Custom prompt',
                thinkingTime: 2000,
                maxMessageLength: 200,
            }
            const customBot = new ChatBotService(config)
            // Config is private, so we test behavior instead
            expect(customBot).toBeDefined()
        })

        it('should accept AI provider in constructor', () => {
            expect(chatBot.getAIProvider()).toBe(mockProvider)
        })
    })

    describe('setAIProvider and getAIProvider', () => {
        it('should set and get AI provider', () => {
            const newProvider = new MockImageProvider({ apiKey: 'test-key' })
            chatBot.setAIProvider(newProvider)
            expect(chatBot.getAIProvider()).toBe(newProvider)
        })

        it('should allow setting provider to undefined', () => {
            chatBot.setAIProvider(undefined)
            expect(chatBot.getAIProvider()).toBeUndefined()
        })
    })

    describe('generateResponse', () => {
        it('should generate response using AI provider when available', async () => {
            mockProvider.setMockResponse({
                text: 'AI generated response',
                usage: {
                    promptTokens: 10,
                    completionTokens: 15,
                    totalTokens: 25,
                },
            })

            const response = await chatBot.generateResponse('Test message')

            expect(response).toBe('AI generated response')
        })

        it('should fall back to hardcoded response when AI provider fails', async () => {
            mockProvider.setShouldThrowError(true)

            const response = await chatBot.generateResponse('character sprite')

            // Should contain fallback response about characters
            expect(response).toContain('character')
            expect(response).not.toBe('AI generated response')
        })

        it('should use hardcoded response when no AI provider', async () => {
            const noBotService = new ChatBotService()

            const response =
                await noBotService.generateResponse('character design')

            expect(response).toContain('character')
        })

        it('should use hardcoded response when AI provider not configured', async () => {
            const unconfiguredProvider = new MockImageProvider({})
            chatBot.setAIProvider(unconfiguredProvider)

            const response = await chatBot.generateResponse('background art')

            expect(response).toContain('background')
        })

        it('should handle images parameter', async () => {
            const images = ['base64-image-1', 'base64-image-2']
            mockProvider.setMockResponse({
                text: 'Image analysis response',
                usage: {
                    promptTokens: 10,
                    completionTokens: 15,
                    totalTokens: 25,
                },
            })

            const response = await chatBot.generateResponse(
                'Analyze this image',
                images
            )

            expect(response).toBe('Image analysis response')
        })

        it('should generate character-specific responses', async () => {
            const noAIBot = new ChatBotService()

            const response = await noAIBot.generateResponse(
                'I need a character sprite'
            )

            expect(response.toLowerCase()).toContain('character')
        })

        it('should generate background-specific responses', async () => {
            const noAIBot = new ChatBotService()

            const response = await noAIBot.generateResponse(
                'I need a background environment'
            )

            expect(response.toLowerCase()).toContain('background')
        })

        it('should generate texture-specific responses', async () => {
            const noAIBot = new ChatBotService()

            const response = await noAIBot.generateResponse(
                'I need texture materials'
            )

            expect(response.toLowerCase()).toContain('texture')
        })

        it('should generate UI-specific responses', async () => {
            const noAIBot = new ChatBotService()

            const response = await noAIBot.generateResponse(
                'I need UI interface design'
            )

            expect(response.toLowerCase()).toContain('ui')
        })
    })

    describe('generateImage', () => {
        it('should generate image successfully', async () => {
            const mockImageResponse: ImageGenerationResponse = {
                images: [
                    {
                        base64: 'mock-image-data',
                        revisedPrompt: 'A beautiful game character',
                    },
                ],
            }
            mockProvider.setMockImageResponse(mockImageResponse)

            const result = await chatBot.generateImage(
                'Create a game character'
            )

            expect(result).toEqual(mockImageResponse)
        })

        it('should throw error when no AI provider', async () => {
            const noBotService = new ChatBotService()

            await expect(
                noBotService.generateImage('test prompt')
            ).rejects.toThrow('No AI provider configured')
        })

        it('should throw error when AI provider not configured', async () => {
            const unconfiguredProvider = new MockImageProvider({})
            chatBot.setAIProvider(unconfiguredProvider)

            await expect(chatBot.generateImage('test prompt')).rejects.toThrow(
                'AI provider is not configured'
            )
        })

        it('should throw error when provider does not support image generation', async () => {
            const textOnlyProvider = new MockTextOnlyProvider(true)
            chatBot.setAIProvider(textOnlyProvider)

            await expect(chatBot.generateImage('test prompt')).rejects.toThrow(
                'Image generation is not supported'
            )
        })

        it('should use default image generation options', async () => {
            const result = await chatBot.generateImage('test prompt')

            expect(result).toBeDefined()
            expect(result.images).toHaveLength(1)
        })

        it('should accept custom image generation options', async () => {
            const options = {
                size: '512x512',
                quality: 'high' as const,
                style: 'natural' as const,
                n: 2,
            }

            const result = await chatBot.generateImage('test prompt', options)

            expect(result).toBeDefined()
        })

        it('should handle AI provider errors during image generation', async () => {
            mockProvider.setShouldThrowError(true)

            await expect(chatBot.generateImage('test prompt')).rejects.toThrow(
                'Mock image generation error'
            )
        })
    })

    describe('error handling', () => {
        it('should handle AI provider errors gracefully in text generation', async () => {
            mockProvider.setShouldThrowError(true)

            // Should not throw, should fall back to hardcoded response
            const response = await chatBot.generateResponse('test message')
            expect(response).toBeDefined()
            expect(typeof response).toBe('string')
        })

        it('should propagate errors in image generation', async () => {
            mockProvider.setShouldThrowError(true)

            await expect(chatBot.generateImage('test')).rejects.toThrow()
        })
    })

    describe('thinking time simulation', () => {
        it('should respect thinking time configuration', async () => {
            const thinkingBot = new ChatBotService({
                thinkingTime: 50, // Short time for testing
            })

            const startTime = Date.now()
            await thinkingBot.generateResponse('test')
            const endTime = Date.now()

            expect(endTime - startTime).toBeGreaterThanOrEqual(40) // Allow some variance
        })

        it('should skip thinking time when set to 0', async () => {
            const quickBot = new ChatBotService({
                thinkingTime: 0,
            })

            const startTime = Date.now()
            await quickBot.generateResponse('test')
            const endTime = Date.now()

            expect(endTime - startTime).toBeLessThan(20) // Should be very fast
        })
    })

    describe('hardcoded response branches', () => {
        let noAIBot: ChatBotService

        beforeEach(() => {
            noAIBot = new ChatBotService({ thinkingTime: 0 })
        })

        it.each([
            // [description, input message, expected substring in response]
            ['sound keyword "sound"', 'I need sound effects', 'audio'],
            ['sound keyword "audio"', 'help with audio assets', 'audio'],
            ['sound keyword "music"', 'I need music tracks', 'audio'],
            [
                'animation keyword "animation"',
                'I need animation assets',
                'animation',
            ],
            [
                'animation keyword "animate"',
                'how to animate characters',
                'animation',
            ],
            ['vfx keyword "effect"', 'visual effect ideas', 'effect'],
            ['vfx keyword "vfx"', 'VFX for explosions', 'effect'],
            ['vfx keyword "particle"', 'particle systems', 'effect'],
            [
                'welcome response when no keywords match',
                'hello there',
                'game asset assistant',
            ],
            [
                'warrior character for "warrior"',
                'warrior character sprite',
                'warrior',
            ],
            [
                'warrior character for "knight"',
                'knight character design',
                'warrior',
            ],
            ['mage character for "mage"', 'mage character sprite', 'mage'],
            ['mage character for "wizard"', 'wizard sprite design', 'mage'],
            [
                'forest background for "forest"',
                'forest background scene',
                'forest',
            ],
            [
                'forest background for "nature"',
                'nature environment design',
                'forest',
            ],
            ['city background for "city"', 'city background art', 'urban'],
            ['city background for "urban"', 'urban environment', 'urban'],
        ])('should generate %s', async (_label, message, expectedSubstring) => {
            const response = await noAIBot.generateResponse(message)
            expect(response.toLowerCase()).toContain(expectedSubstring)
        })
    })

    describe('message management', () => {
        it('should add a user message and return it', () => {
            const msg = chatBot.addMessage('Hello!', 'user')
            expect(msg.text).toBe('Hello!')
            expect(msg.sender).toBe('user')
            expect(msg.id).toBeDefined()
            expect(msg.timestamp).toBeInstanceOf(Date)
        })

        it('should add an assistant message and return it', () => {
            const msg = chatBot.addMessage('Response', 'assistant')
            expect(msg.sender).toBe('assistant')
        })

        it('should accumulate messages in getMessages', () => {
            chatBot.addMessage('First', 'user')
            chatBot.addMessage('Second', 'assistant')
            expect(chatBot.getMessages()).toHaveLength(2)
        })

        it('should return a copy of messages from getMessages', () => {
            chatBot.addMessage('Test', 'user')
            const messages = chatBot.getMessages()
            messages.pop()
            expect(chatBot.getMessages()).toHaveLength(1)
        })

        it('should clear all messages', () => {
            chatBot.addMessage('First', 'user')
            chatBot.addMessage('Second', 'assistant')
            chatBot.clearMessages()
            expect(chatBot.getMessages()).toHaveLength(0)
        })

        it('should return formatted chat history', () => {
            chatBot.addMessage('Hello', 'user')
            chatBot.addMessage('Hi there', 'assistant')
            const history = chatBot.getChatHistory()
            expect(history).toContain('user: Hello')
            expect(history).toContain('assistant: Hi there')
        })

        it('should return empty string for chat history when no messages', () => {
            expect(chatBot.getChatHistory()).toBe('')
        })

        it('should update configuration via updateConfig', async () => {
            // Start with a non-zero thinkingTime, then update it to 0
            const timedBot = new ChatBotService({ thinkingTime: 50 })

            // Before update: response should take at least ~50ms
            const startBefore = Date.now()
            await timedBot.generateResponse('hello there')
            const durationBefore = Date.now() - startBefore
            expect(durationBefore).toBeGreaterThanOrEqual(40)

            // After updateConfig to thinkingTime: 0, response should be fast
            timedBot.updateConfig({ thinkingTime: 0 })
            const startAfter = Date.now()
            await timedBot.generateResponse('hello there')
            const durationAfter = Date.now() - startAfter
            expect(durationAfter).toBeLessThan(20)
        })

        it('should generate unique message ids', () => {
            const msg1 = chatBot.addMessage('A', 'user')
            const msg2 = chatBot.addMessage('B', 'user')
            expect(msg1.id).not.toBe(msg2.id)
        })
    })
})
