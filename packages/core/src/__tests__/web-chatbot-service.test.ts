import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WebChatBotService } from '../web-chatbot-service'
import { MockImageProvider } from './test-utils'

// Mock ChatBotService
vi.mock('../chatbot-service', () => ({
    ChatBotService: vi.fn().mockImplementation(() => ({
        addMessage: vi.fn().mockImplementation((text, sender) => ({
            id: `msg-${Date.now()}`,
            text,
            sender,
            timestamp: new Date(),
        })),
        generateResponse: vi.fn().mockResolvedValue('Mock AI response'),
        getMessages: vi.fn().mockReturnValue([]),
        clearMessages: vi.fn(),
        getChatHistory: vi.fn().mockReturnValue('Mock chat history'),
        updateConfig: vi.fn(),
        setAIProvider: vi.fn(),
        getAIProvider: vi.fn().mockReturnValue(undefined),
    })),
}))

describe('WebChatBotService - Web-specific features', () => {
    let webChatBot: WebChatBotService
    let mockProvider: MockImageProvider

    beforeEach(() => {
        vi.clearAllMocks()
        mockProvider = new MockImageProvider({ apiKey: 'test-key' })
        webChatBot = new WebChatBotService(
            {
                systemPrompt: 'Test web prompt',
                thinkingTime: 100,
                maxMessageLength: 500,
            },
            mockProvider
        )
    })

    describe('sendMessage - web-enhanced functionality', () => {
        beforeEach(() => {
            const mockMessages = [
                {
                    id: 'msg-1',
                    text: 'Test user message',
                    sender: 'user' as const,
                    timestamp: new Date(),
                },
            ]
            vi.mocked(webChatBot['chatbotService'].getMessages).mockReturnValue(
                mockMessages
            )
        })

        it('should return both user and assistant messages for web UI updates', async () => {
            const mockUserMessage = {
                id: 'msg-user',
                text: 'Hello',
                sender: 'user' as const,
                timestamp: new Date(),
            }
            const mockAssistantMessage = {
                id: 'msg-assistant',
                text: 'Mock AI response',
                sender: 'assistant' as const,
                timestamp: new Date(),
            }

            vi.mocked(webChatBot['chatbotService'].addMessage)
                .mockReturnValueOnce(mockUserMessage)
                .mockReturnValueOnce(mockAssistantMessage)

            const result = await webChatBot.sendMessage('Hello')

            expect(result).toEqual([mockUserMessage, mockAssistantMessage])
        })

        it('should handle errors with user-friendly web messages', async () => {
            const mockUserMessage = {
                id: 'msg-user',
                text: 'Error message',
                sender: 'user' as const,
                timestamp: new Date(),
            }
            const mockErrorMessage = {
                id: 'msg-error',
                text: 'Sorry, I encountered an error. Please try again.',
                sender: 'assistant' as const,
                timestamp: new Date(),
            }

            vi.mocked(
                webChatBot['chatbotService'].generateResponse
            ).mockRejectedValue(new Error('AI Error'))
            vi.mocked(webChatBot['chatbotService'].addMessage)
                .mockReturnValueOnce(mockUserMessage)
                .mockReturnValueOnce(mockErrorMessage)

            const consoleSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {})

            const result = await webChatBot.sendMessage('Error message')

            expect(result).toEqual([mockUserMessage, mockErrorMessage])
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error generating response:',
                expect.any(Error)
            )

            consoleSpy.mockRestore()
        })
    })

    describe('subscription system (web-specific reactive updates)', () => {
        it('should provide reactive subscription interface for web UIs', () => {
            const mockCallback = vi.fn()
            const mockMessages = [
                {
                    id: 'msg-1',
                    text: 'Test',
                    sender: 'user' as const,
                    timestamp: new Date(),
                },
            ]

            vi.mocked(webChatBot['chatbotService'].getMessages).mockReturnValue(
                mockMessages
            )

            const unsubscribe = webChatBot.subscribe(mockCallback)

            expect(typeof unsubscribe).toBe('function')
            expect(webChatBot['subscribers']).toContain(mockCallback)
        })

        it('should notify all subscribers when messages change for real-time updates', async () => {
            const mockCallback1 = vi.fn()
            const mockCallback2 = vi.fn()
            const mockMessages = [
                {
                    id: 'msg-1',
                    text: 'Test',
                    sender: 'user' as const,
                    timestamp: new Date(),
                },
            ]

            vi.mocked(webChatBot['chatbotService'].getMessages).mockReturnValue(
                mockMessages
            )
            webChatBot.subscribe(mockCallback1)
            webChatBot.subscribe(mockCallback2)

            const mockUserMessage = {
                id: 'msg-user',
                text: 'Hello',
                sender: 'user' as const,
                timestamp: new Date(),
            }

            vi.mocked(webChatBot['chatbotService'].addMessage).mockReturnValue(
                mockUserMessage
            )

            await webChatBot.sendMessage('Hello')

            // Both callbacks should be notified twice (user message + AI response)
            expect(mockCallback1).toHaveBeenCalledWith(mockMessages)
            expect(mockCallback1).toHaveBeenCalledTimes(2)
            expect(mockCallback2).toHaveBeenCalledWith(mockMessages)
            expect(mockCallback2).toHaveBeenCalledTimes(2)
        })

        it('should support unsubscribing for component cleanup', () => {
            const mockCallback = vi.fn()
            const unsubscribe = webChatBot.subscribe(mockCallback)

            expect(webChatBot['subscribers']).toContain(mockCallback)

            unsubscribe()

            expect(webChatBot['subscribers']).not.toContain(mockCallback)
        })

        it('should handle subscriber errors without crashing the service', () => {
            const faultyCallback = vi.fn().mockImplementation(() => {
                throw new Error('Subscriber error')
            })

            webChatBot.subscribe(faultyCallback)

            // Should handle errors gracefully
            expect(() => {
                webChatBot['notifySubscribers']()
            }).toThrow('Subscriber error')
        })
    })

    describe('web UI integration', () => {
        it('should notify subscribers when clearing messages for UI updates', () => {
            const mockCallback = vi.fn()
            webChatBot.subscribe(mockCallback)

            webChatBot.clearMessages()

            expect(
                webChatBot['chatbotService'].clearMessages
            ).toHaveBeenCalled()
            expect(mockCallback).toHaveBeenCalled()
        })

        it('should provide constructor suitable for web environments', () => {
            const webOnlyBot = new WebChatBotService()
            expect(webOnlyBot).toBeDefined()
            expect(webOnlyBot.getMessages).toBeDefined()
            expect(webOnlyBot.subscribe).toBeDefined()
        })

        it('should maintain backward compatibility with base chatbot features', () => {
            // Verify web service exposes all necessary methods
            expect(typeof webChatBot.sendMessage).toBe('function')
            expect(typeof webChatBot.getMessages).toBe('function')
            expect(typeof webChatBot.clearMessages).toBe('function')
            expect(typeof webChatBot.getChatHistory).toBe('function')
            expect(typeof webChatBot.updateConfig).toBe('function')
            expect(typeof webChatBot.setAIProvider).toBe('function')
            expect(typeof webChatBot.getAIProvider).toBe('function')
        })
    })
})
