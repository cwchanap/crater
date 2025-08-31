import { ChatBotService } from './chatbot-service'
import type { ChatMessage, ChatBotConfig } from './types'

/**
 * Web-specific wrapper around ChatBotService for use in Svelte/React/Vue apps
 * This provides a convenient interface for web applications
 */
export class WebChatBotService {
    private chatbotService: ChatBotService
    private subscribers: Array<(messages: ChatMessage[]) => void> = []

    constructor(config: ChatBotConfig = {}) {
        this.chatbotService = new ChatBotService({
            systemPrompt:
                'You are a helpful game asset assistant for web-based game development.',
            thinkingTime: 800, // Slightly faster for web
            maxMessageLength: 1000, // Allow longer messages in web
            ...config,
        })
    }

    /**
     * Send a message and get a response
     */
    async sendMessage(text: string): Promise<ChatMessage[]> {
        // Add user message
        const userMessage = this.chatbotService.addMessage(text, 'user')
        this.notifySubscribers()

        try {
            // Generate AI response
            const aiResponse = await this.chatbotService.generateResponse(text)
            const assistantMessage = this.chatbotService.addMessage(
                aiResponse,
                'assistant'
            )

            this.notifySubscribers()
            return [userMessage, assistantMessage]
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error generating response:', error)
            const errorMessage = this.chatbotService.addMessage(
                'Sorry, I encountered an error. Please try again.',
                'assistant'
            )
            this.notifySubscribers()
            return [userMessage, errorMessage]
        }
    }

    /**
     * Get all messages
     */
    getMessages(): ChatMessage[] {
        return this.chatbotService.getMessages()
    }

    /**
     * Clear all messages
     */
    clearMessages(): void {
        this.chatbotService.clearMessages()
        this.notifySubscribers()
    }

    /**
     * Subscribe to message changes (for reactive UI updates)
     */
    subscribe(callback: (messages: ChatMessage[]) => void): () => void {
        this.subscribers.push(callback)

        // Return unsubscribe function
        return () => {
            const index = this.subscribers.indexOf(callback)
            if (index > -1) {
                this.subscribers.splice(index, 1)
            }
        }
    }

    /**
     * Get chat history as formatted text
     */
    getChatHistory(): string {
        return this.chatbotService.getChatHistory()
    }

    /**
     * Update service configuration
     */
    updateConfig(config: Partial<ChatBotConfig>): void {
        this.chatbotService.updateConfig(config)
    }

    private notifySubscribers(): void {
        const messages = this.getMessages()
        this.subscribers.forEach((callback) => callback(messages))
    }
}
