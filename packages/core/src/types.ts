// Types and interfaces for the ChatBot service

export interface ChatMessage {
    id: string
    text: string
    sender: 'user' | 'assistant'
    timestamp: Date
}

export interface ChatBotConfig {
    /** Custom AI prompt or instructions for the chatbot */
    systemPrompt?: string
    /** Thinking time simulation in milliseconds */
    thinkingTime?: number
    /** Maximum message length */
    maxMessageLength?: number
}

export interface AssetSuggestion {
    category: string
    items: string[]
    followUpQuestion?: string
}
