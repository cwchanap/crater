import {
    BaseImageModelProvider,
    AIProviderConfig,
    AIGenerationRequest,
    AIGenerationResponse,
} from '../base-provider'

/**
 * Mock AI Provider for testing and offline usage
 * Simulates real AI responses with hardcoded game asset suggestions
 */
export class MockImageProvider extends BaseImageModelProvider {
    private static readonly DEFAULT_MODEL = 'mock-game-assistant'

    constructor(config: AIProviderConfig = {}) {
        super('mock', MockImageProvider.DEFAULT_MODEL, config)
    }

    /**
     * Generate a mock response based on the request
     */
    async generateResponse(
        request: AIGenerationRequest
    ): Promise<AIGenerationResponse> {
        // Simulate network delay
        const delay = (this.config.options?.delay as number) || 500
        await new Promise((resolve) => setTimeout(resolve, delay))

        const response = this.generateMockResponse(
            request.prompt,
            request.images
        )

        return {
            text: response,
            usage: {
                promptTokens: Math.floor(request.prompt.length / 4),
                completionTokens: Math.floor(response.length / 4),
                totalTokens: Math.floor(
                    (request.prompt.length + response.length) / 4
                ),
            },
            metadata: {
                model: this.getModel(),
                mock: true,
                hasImages: !!(request.images && request.images.length > 0),
            },
        }
    }

    /**
     * Mock provider is always configured
     */
    isConfigured(): boolean {
        return true
    }

    private generateMockResponse(prompt: string, images?: string[]): string {
        const lowercasePrompt = prompt.toLowerCase()

        // Image-specific responses
        if (images && images.length > 0) {
            return this.generateImageAnalysisResponse(
                lowercasePrompt,
                images.length
            )
        }

        // Character and sprite suggestions
        if (
            lowercasePrompt.includes('sprite') ||
            lowercasePrompt.includes('character')
        ) {
            return this.generateCharacterResponse(lowercasePrompt)
        }

        // Background and environment suggestions
        if (
            lowercasePrompt.includes('background') ||
            lowercasePrompt.includes('environment')
        ) {
            return this.generateBackgroundResponse(lowercasePrompt)
        }

        // Texture and material suggestions
        if (
            lowercasePrompt.includes('texture') ||
            lowercasePrompt.includes('material')
        ) {
            return this.generateTextureResponse()
        }

        // UI and interface suggestions
        if (
            lowercasePrompt.includes('ui') ||
            lowercasePrompt.includes('interface')
        ) {
            return this.generateUIResponse()
        }

        // Sound and audio suggestions
        if (
            lowercasePrompt.includes('sound') ||
            lowercasePrompt.includes('audio') ||
            lowercasePrompt.includes('music')
        ) {
            return this.generateSoundResponse()
        }

        // Animation suggestions
        if (
            lowercasePrompt.includes('animation') ||
            lowercasePrompt.includes('animate')
        ) {
            return this.generateAnimationResponse()
        }

        // VFX and effects suggestions
        if (
            lowercasePrompt.includes('effect') ||
            lowercasePrompt.includes('vfx') ||
            lowercasePrompt.includes('particle')
        ) {
            return this.generateVFXResponse()
        }

        // Default welcome response
        return this.generateWelcomeResponse()
    }

    private generateImageAnalysisResponse(
        prompt: string,
        imageCount: number
    ): string {
        const imageText = imageCount === 1 ? 'image' : `${imageCount} images`

        if (prompt.includes('improve') || prompt.includes('enhance')) {
            return `I can see you've shared ${imageText}! Here are some ways to enhance your game assets:

**Image Enhancement Suggestions:**
- **Color Palette**: Consider adjusting the color scheme to match your game's mood
- **Detail Level**: Add more texture detail for close-up views, or simplify for distance
- **Lighting**: Improve shadows and highlights to add depth
- **Consistency**: Ensure the style matches your other game assets
- **Resolution**: Optimize for your target platform and viewing distance

**Specific Improvements:**
- Add ambient occlusion for more realistic shadows
- Enhance edge definition for better clarity
- Consider adding subtle animation elements
- Optimize file size without losing quality

Would you like me to elaborate on any of these suggestions?`
        }

        return `I can analyze the ${imageText} you've shared! Based on what I see, here are some game asset recommendations:

**Asset Analysis:**
- The style and composition look great for game development
- Consider how this fits into your overall art direction
- Think about how players will interact with this asset
- Ensure it works well at different zoom levels

**Next Steps:**
- Create variations for different game states
- Consider animation possibilities
- Plan for different lighting conditions
- Test readability at target resolution

What specific aspect of this asset would you like to develop further?`
    }

    private generateCharacterResponse(prompt: string): string {
        if (prompt.includes('warrior') || prompt.includes('knight')) {
            return `Perfect! Here are some Warrior/Knight asset ideas:

**Warrior/Knight Assets:**
- Medieval armor sets with customizable pieces
- Sword and shield attack animations
- Battle stances and defensive poses
- Victory and defeat animation sequences
- Different armor variations (light, medium, heavy)
- Horseback riding poses and animations

**Style Considerations:**
- Pixel art vs. hand-drawn vs. 3D rendered
- Color schemes that convey strength and nobility
- Animated cape or banner elements
- Weapon trail effects for combat

Would you like me to elaborate on any of these suggestions?`
        }

        if (prompt.includes('mage') || prompt.includes('wizard')) {
            return `Excellent choice! Here are Mage/Wizard asset concepts:

**Mage/Wizard Assets:**
- Flowing robed character designs
- Staff-wielding spell-casting animations
- Magical aura and spell effect overlays
- Different elemental magic themes
- Meditation and concentration poses
- Familiar creatures or magical companions

**Magical Elements:**
- Spell circle and rune graphics
- Particle effects for different spell types
- Glowing staff or orb accessories
- Elemental color schemes (fire, ice, earth, air)

What type of magic system are you designing for?`
        }

        return `Great! I can help with character sprites:

**Character Sprite Categories:**
- **2D Pixel Art**: Classic 8-bit and 16-bit styles
- **Modern High-Res**: Detailed hand-drawn sprites
- **Animated Frames**: Walk cycles, attacks, idles
- **Portrait Variations**: Different expressions and poses
- **Customizable Parts**: Mix-and-match clothing/armor

**Animation Suggestions:**
- Idle breathing animations
- Multi-directional walk cycles
- Attack and skill animations
- Reaction animations (hurt, victory, etc.)

What type of character are you looking to create?`
    }

    private generateBackgroundResponse(prompt: string): string {
        if (prompt.includes('forest') || prompt.includes('nature')) {
            return `Beautiful choice! Here are Forest/Nature background ideas:

**Forest Elements:**
- Layered tree silhouettes for depth
- Animated foliage that sways gently
- Dappled sunlight filtering through leaves
- Forest floor with fallen logs and mushrooms
- Wildlife elements (birds, butterflies)
- Seasonal variations (spring, autumn, winter)

**Technical Considerations:**
- Parallax scrolling layers (background, midground, foreground)
- Seamless tiling for infinite scrolling
- Day/night cycle support
- Weather effects integration

What mood are you aiming for - peaceful, mysterious, or dangerous?`
        }

        return `Excellent! Background assets can really set the mood:

**Background Types:**
- **Parallax Layers**: Multiple scrolling speeds for depth
- **Tiled Environments**: Seamless repeating patterns
- **Atmospheric Elements**: Fog, lighting, weather
- **Interactive Elements**: Doors, platforms, decorations
- **Skyboxes**: 360-degree environment wrapping

**Style Approaches:**
- Photorealistic vs. stylized
- Hand-painted vs. pixel art
- Static vs. animated elements

What kind of environment are you creating?`
    }

    private generateTextureResponse(): string {
        return `Textures are crucial for visual appeal! Here are some suggestions:

**Texture Categories:**
- **Stone & Brick**: Weathered walls, ancient ruins
- **Metal & Industrial**: Rust, steel, copper patina
- **Natural Materials**: Wood grain, grass, water
- **Fabric & Cloth**: Canvas, leather, silk
- **Fantasy Materials**: Magical crystals, otherworldly surfaces

**Technical Tips:**
- Create seamless tileable patterns
- Include normal maps for 3D depth
- Provide multiple resolution versions
- Consider compression for mobile platforms

What surface are you trying to texture?`
    }

    private generateUIResponse(): string {
        return `UI assets can make or break the user experience!

**Essential UI Elements:**
- **Buttons**: Normal, hover, pressed, disabled states
- **Panels**: Inventory, menus, dialog boxes
- **Indicators**: Health bars, progress meters, timers
- **Icons**: Items, skills, status effects
- **Frames**: Borders, decorative elements

**Design Principles:**
- Consistent visual language
- Clear hierarchy and readability
- Responsive design for different screen sizes
- Accessibility considerations

What type of UI element are you focusing on?`
    }

    private generateSoundResponse(): string {
        return `Audio assets bring your game to life!

**Sound Categories:**
- **Character Sounds**: Footsteps, voice clips, breathing
- **Combat Audio**: Weapon sounds, impact effects
- **Environmental**: Ambient nature, machinery, crowds
- **UI Feedback**: Button clicks, menu sounds, notifications
- **Music**: Background themes, stingers, transitions

**Technical Considerations:**
- Multiple file formats (WAV, OGG, MP3)
- Looping vs. one-shot sounds
- Volume and compression optimization
- Spatial audio for 3D games

What type of audio experience are you creating?`
    }

    private generateAnimationResponse(): string {
        return `Animation brings static assets to life!

**Animation Types:**
- **Character Animations**: Walk cycles, attacks, idles
- **Object Animations**: Rotating items, pulsing effects
- **UI Animations**: Smooth transitions, feedback
- **Environmental**: Flowing water, swaying trees
- **Effects**: Particle systems, spell animations

**Technical Approaches:**
- Sprite sheet animations
- Bone-based character rigs
- Tween-based UI animations
- Particle system setups

What needs to be animated in your game?`
    }

    private generateVFXResponse(): string {
        return `Visual effects add excitement and polish!

**VFX Categories:**
- **Particle Systems**: Fire, smoke, magic sparkles
- **Screen Effects**: Camera shake, color grading
- **Lighting**: Dynamic shadows, glowing elements
- **Post-Processing**: Blur, bloom, distortion
- **Transitions**: Scene wipes, dissolves, portals

**Implementation Tips:**
- Start simple and iterate
- Consider performance impact
- Match your game's art style
- Test on target hardware

What kind of visual effect are you trying to create?`
    }

    private generateWelcomeResponse(): string {
        return `Hello! I'm your AI-powered game asset assistant. I can help you brainstorm and plan:

🎮 **Game Assets I Can Help With:**
- Character sprites and animations
- Background environments and landscapes  
- Textures and materials
- UI elements and interfaces
- Sound effects and music
- Visual effects and particle systems
- Animation sequences and transitions

💡 **I can also analyze images** you share to provide specific feedback and suggestions!

What type of game asset are you working on today? Feel free to share any reference images you'd like me to analyze!`
    }

    /**
     * Test connection (always succeeds for mock)
     */
    async testConnection(): Promise<boolean> {
        return true
    }

    /**
     * Available mock models
     */
    static getAvailableModels(): string[] {
        return [
            'mock-game-assistant',
            'mock-pixel-artist',
            'mock-3d-modeler',
            'mock-ui-designer',
        ]
    }
}
