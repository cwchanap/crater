export interface ChatMessage {
    text: string
    sender: 'user' | 'assistant'
    timestamp: Date
    messageType?: 'text' | 'image'
    imageData?: {
        images: string[]
        prompt: string
        savedPaths?: string[]
    }
}

export interface ChatSession {
    id: string
    title: string
    createdAt: string
    lastActivity: string
    messageCount: number
}

export interface WebviewMessage {
    type: string
    text?: string
    message?: string
    response?: string
    images?: string[]
    prompt?: string
    savedPaths?: string[]
    messages?: ChatMessage[]
    sessions?: ChatSession[]
    currentSessionId?: string
    sessionId?: string
    provider?: string
    configured?: boolean
    aiProvider?: string
    aiModel?: string
    geminiApiKey?: string
    openaiApiKey?: string
    imageSaveDirectory?: string
    autoSaveImages?: boolean
    imageSize?: string
    imageQuality?: string
    apiKey?: string
    [key: string]: unknown
}
