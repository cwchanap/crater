import {
    ChatMessage,
    ChatBotConfig,
    AssetSuggestion,
    BaseImageModelProvider,
    AIGenerationRequest,
    ImageGenerationRequest,
    ImageGenerationResponse,
} from './types'

/**
 * Core ChatBot service for generating AI responses and managing chat logic
 * This service is framework-agnostic and can be used in VS Code extensions, web apps, etc.
 */
export class ChatBotService {
    private config: ChatBotConfig
    private messages: ChatMessage[] = []
    private aiProvider?: BaseImageModelProvider

    constructor(
        config: ChatBotConfig = {},
        aiProvider?: BaseImageModelProvider
    ) {
        this.config = {
            systemPrompt: 'You are a helpful game asset assistant.',
            thinkingTime: 1000,
            maxMessageLength: 500,
            ...config,
        }
        this.aiProvider = aiProvider
    }

    /**
     * Set or update the AI provider
     */
    setAIProvider(provider: BaseImageModelProvider | undefined): void {
        this.aiProvider = provider
    }

    /**
     * Get the current AI provider
     */
    getAIProvider(): BaseImageModelProvider | undefined {
        return this.aiProvider
    }

    /**
     * Generate an AI response based on user input
     */
    async generateResponse(
        userMessage: string,
        images?: string[]
    ): Promise<string> {
        // Try AI provider first if available and configured
        if (this.aiProvider && this.aiProvider.isConfigured()) {
            try {
                const request: AIGenerationRequest = {
                    prompt: this.buildAIPrompt(userMessage),
                    images: images,
                    systemPrompt: this.config.systemPrompt,
                    temperature: 0.7,
                    maxTokens: 1000,
                }

                const response = await this.aiProvider.generateResponse(request)
                return response.text
            } catch {
                // AI provider failed, fall back to hardcoded responses
                // Fall through to hardcoded responses
            }
        }

        // Fallback to hardcoded responses
        return this.generateHardcodedResponse(userMessage)
    }

    /**
     * Generate an image based on user input
     */
    async generateImage(
        prompt: string,
        options: Partial<ImageGenerationRequest> = {}
    ): Promise<ImageGenerationResponse> {
        if (!this.aiProvider) {
            throw new Error('No AI provider configured for image generation')
        }

        if (!this.aiProvider.isConfigured()) {
            throw new Error(
                'AI provider is not configured. Please provide an API key.'
            )
        }

        if (!this.aiProvider.generateImage) {
            throw new Error(
                `Image generation is not supported by the current provider (${this.aiProvider.type}). ` +
                    'Please use the OpenAI provider for image generation capabilities.'
            )
        }

        const request: ImageGenerationRequest = {
            prompt: this.buildImagePrompt(prompt),
            size: options.size ?? '1024x1024',
            quality: options.quality ?? 'auto',
            style: options.style ?? 'vivid',
            n: options.n ?? 1,
            ...options,
        }

        return await this.aiProvider.generateImage(request)
    }

    /**
     * Build a comprehensive prompt for image generation specifically for game assets
     */
    private buildImagePrompt(userPrompt: string): string {
        return `Create a high-quality game asset: ${userPrompt}. 
Style: Professional game art, clean design, suitable for video games. 
Requirements: Clear details, good contrast, game-ready aesthetic.`
    }

    /**
     * Build a comprehensive prompt for AI generation
     */
    private buildAIPrompt(userMessage: string): string {
        const context = `You are an expert game development assistant specializing in game assets, art direction, and creative brainstorming. 

Your expertise includes:
- 2D and 3D art creation and optimization
- Character design and animation
- Environment and background design
- UI/UX design for games
- Audio design and implementation
- Visual effects and shaders
- Game asset optimization and technical constraints

Provide practical, actionable advice that considers:
- Different art styles (pixel art, hand-drawn, 3D, etc.)
- Technical constraints (file sizes, performance)
- Platform considerations (mobile, desktop, console)
- Industry best practices and trends

User's request: ${userMessage}

Please provide helpful, specific suggestions and feel free to ask clarifying questions to better assist the user.`

        return context
    }

    /**
     * Generate hardcoded response (fallback when AI provider is not available)
     */
    private async generateHardcodedResponse(
        userMessage: string
    ): Promise<string> {
        // Simulate thinking time
        if (this.config.thinkingTime && this.config.thinkingTime > 0) {
            await new Promise((resolve) =>
                setTimeout(resolve, this.config.thinkingTime)
            )
        }

        // Analyze the message and generate appropriate response
        const lowercaseMessage = userMessage.toLowerCase()

        // Character and sprite suggestions
        if (
            lowercaseMessage.includes('sprite') ||
            lowercaseMessage.includes('character')
        ) {
            return this.generateCharacterResponse(lowercaseMessage)
        }

        // Background and environment suggestions
        if (
            lowercaseMessage.includes('background') ||
            lowercaseMessage.includes('environment')
        ) {
            return this.generateBackgroundResponse(lowercaseMessage)
        }

        // Texture and material suggestions
        if (
            lowercaseMessage.includes('texture') ||
            lowercaseMessage.includes('material')
        ) {
            return this.generateTextureResponse(lowercaseMessage)
        }

        // UI and interface suggestions
        if (
            lowercaseMessage.includes('ui') ||
            lowercaseMessage.includes('interface')
        ) {
            return this.generateUIResponse(lowercaseMessage)
        }

        // Sound effect suggestions
        if (
            lowercaseMessage.includes('sound') ||
            lowercaseMessage.includes('audio') ||
            lowercaseMessage.includes('music')
        ) {
            return this.generateSoundResponse(lowercaseMessage)
        }

        // Animation suggestions
        if (
            lowercaseMessage.includes('animation') ||
            lowercaseMessage.includes('animate')
        ) {
            return this.generateAnimationResponse(lowercaseMessage)
        }

        // VFX and effects suggestions
        if (
            lowercaseMessage.includes('effect') ||
            lowercaseMessage.includes('vfx') ||
            lowercaseMessage.includes('particle')
        ) {
            return this.generateVFXResponse(lowercaseMessage)
        }

        // Default welcome response
        return this.generateWelcomeResponse()
    }

    /**
     * Add a message to the chat history
     */
    addMessage(text: string, sender: 'user' | 'assistant'): ChatMessage {
        const message: ChatMessage = {
            id: this.generateMessageId(),
            text,
            sender,
            timestamp: new Date(),
        }
        this.messages.push(message)
        return message
    }

    /**
     * Get all chat messages
     */
    getMessages(): ChatMessage[] {
        return [...this.messages]
    }

    /**
     * Clear all chat messages
     */
    clearMessages(): void {
        this.messages = []
    }

    /**
     * Get the chat history as a formatted string
     */
    getChatHistory(): string {
        return this.messages
            .map((msg) => `${msg.sender}: ${msg.text}`)
            .join('\n')
    }

    /**
     * Update the chatbot configuration
     */
    updateConfig(newConfig: Partial<ChatBotConfig>): void {
        this.config = { ...this.config, ...newConfig }
    }

    // Private methods for generating specific types of responses

    private generateCharacterResponse(message: string): string {
        const suggestions: AssetSuggestion = {
            category: 'Character Sprites',
            items: [
                '2D pixel art characters (8-bit, 16-bit style)',
                'Modern high-resolution sprites',
                'Animated character frames',
                'Different poses and animations',
                'Character portraits and avatars',
                'Idle, walking, and action animations',
            ],
            followUpQuestion:
                'What type of character are you looking for? (e.g., warrior, mage, robot, etc.)',
        }

        if (message.includes('warrior') || message.includes('knight')) {
            return this.formatCharacterSuggestion('Warrior/Knight', [
                'Medieval armor sets',
                'Sword and shield animations',
                'Battle stances and combat moves',
                'Different armor variations',
                'Victory and defeat poses',
            ])
        }

        if (message.includes('mage') || message.includes('wizard')) {
            return this.formatCharacterSuggestion('Mage/Wizard', [
                'Robed character designs',
                'Staff-wielding animations',
                'Spell-casting effects',
                'Different magical elements',
                'Meditation and concentration poses',
            ])
        }

        return this.formatSuggestion(suggestions)
    }

    private generateBackgroundResponse(message: string): string {
        const suggestions: AssetSuggestion = {
            category: 'Background Assets',
            items: [
                'Parallax scrolling backgrounds',
                'Tiled environments',
                'Sky boxes and landscapes',
                'Interior scenes',
                'Sci-fi or fantasy environments',
                'Day/night cycle variations',
            ],
            followUpQuestion:
                'What setting are you creating? (e.g., forest, city, space, dungeon)',
        }

        if (message.includes('forest') || message.includes('nature')) {
            return this.formatBackgroundSuggestion('Forest/Nature', [
                'Layered tree silhouettes',
                'Animated foliage',
                'Forest floor textures',
                'Sunlight filtering through trees',
                'Wildlife elements',
            ])
        }

        if (message.includes('city') || message.includes('urban')) {
            return this.formatBackgroundSuggestion('Urban/City', [
                'Building skylines',
                'Street-level environments',
                'Neon signs and lighting',
                'Traffic and crowd elements',
                'Day and night variations',
            ])
        }

        return this.formatSuggestion(suggestions)
    }

    private generateTextureResponse(_message: string): string {
        const suggestions: AssetSuggestion = {
            category: 'Textures & Materials',
            items: [
                'Stone and brick textures',
                'Metal and rust patterns',
                'Fabric and cloth materials',
                'Natural textures (wood, grass, water)',
                'Sci-fi materials',
                'Seamless tileable patterns',
            ],
            followUpQuestion: 'What surface are you trying to texture?',
        }

        return this.formatSuggestion(suggestions)
    }

    private generateUIResponse(_message: string): string {
        const suggestions: AssetSuggestion = {
            category: 'UI Elements',
            items: [
                'Buttons and menus',
                'Health bars and progress indicators',
                'Inventory panels',
                'Dialog boxes and speech bubbles',
                'Icons and symbols',
                'Loading screens and transitions',
            ],
            followUpQuestion: 'What type of UI element do you need help with?',
        }

        return this.formatSuggestion(suggestions)
    }

    private generateSoundResponse(_message: string): string {
        const suggestions: AssetSuggestion = {
            category: 'Audio Assets',
            items: [
                'Character action sounds (footsteps, jumps)',
                'Weapon and combat audio',
                'Environmental ambience',
                'UI feedback sounds',
                'Background music themes',
                'Voice acting and dialog',
            ],
            followUpQuestion: 'What type of audio are you looking for?',
        }

        return this.formatSuggestion(suggestions)
    }

    private generateAnimationResponse(_message: string): string {
        const suggestions: AssetSuggestion = {
            category: 'Animation Assets',
            items: [
                'Character walk/run cycles',
                'Attack and combat animations',
                'Idle and breathing animations',
                'Object interactions',
                'UI element transitions',
                'Environmental animations (flags, water)',
            ],
            followUpQuestion: 'What needs to be animated in your game?',
        }

        return this.formatSuggestion(suggestions)
    }

    private generateVFXResponse(_message: string): string {
        const suggestions: AssetSuggestion = {
            category: 'Visual Effects',
            items: [
                'Particle systems (fire, smoke, magic)',
                'Explosion and impact effects',
                'Weather effects (rain, snow)',
                'Lighting and glow effects',
                'Screen transitions and shaders',
                'Power-up and collection effects',
            ],
            followUpQuestion:
                'What kind of visual effect are you trying to create?',
        }

        return this.formatSuggestion(suggestions)
    }

    private generateWelcomeResponse(): string {
        return `Hello! I'm your game asset assistant. I can help you brainstorm and plan:

🎮 **Game Assets I Can Help With:**
- Character sprites and animations
- Background environments
- Textures and materials
- UI elements and interfaces
- Sound effects and music
- Visual effects and particles
- Animation sequences

What type of game asset are you working on today?`
    }

    private formatSuggestion(suggestion: AssetSuggestion): string {
        const itemList = suggestion.items.map((item) => `- ${item}`).join('\n')

        let response = `Great! I can help with ${suggestion.category.toLowerCase()}:\n\n**${suggestion.category}:**\n${itemList}`

        if (suggestion.followUpQuestion) {
            response += `\n\n${suggestion.followUpQuestion}`
        }

        return response
    }

    private formatCharacterSuggestion(
        characterType: string,
        items: string[]
    ): string {
        const itemList = items.map((item) => `- ${item}`).join('\n')

        return `Perfect! Here are some ${characterType} asset ideas:\n\n**${characterType} Assets:**\n${itemList}\n\nWould you like me to elaborate on any of these suggestions?`
    }

    private formatBackgroundSuggestion(
        environmentType: string,
        items: string[]
    ): string {
        const itemList = items.map((item) => `- ${item}`).join('\n')

        return `Excellent choice! Here are ${environmentType} background ideas:\n\n**${environmentType} Elements:**\n${itemList}\n\nWhat mood or atmosphere are you aiming for?`
    }

    private generateMessageId(): string {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }
}
