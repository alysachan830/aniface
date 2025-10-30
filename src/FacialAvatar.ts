/**
 * Main FacialAvatar class - Entry point for the library
 */

import type { FacialAvatarConfig } from './types'
import { FacialLandmarkManager } from './core/FacialLandmarkManager'
import { AvatarRenderer } from './core/AvatarRenderer'
import { retargetBlendshapes } from './utils/blendshapeRetargeting'

/**
 * FacialAvatar - Animate 3D avatars with real-time facial tracking
 * 
 * This is the main class that brings together facial landmark detection,
 * 3D rendering, and blendshape animation into a simple, unified API.
 * 
 * @example
 * ```typescript
 * const avatar = new FacialAvatar({
 *   videoElement: document.getElementById('webcam') as HTMLVideoElement,
 *   canvasElement: document.getElementById('avatar') as HTMLCanvasElement,
 *   modelPath: '/models/avatar.glb',
 *   onReady: () => console.log('Avatar ready!'),
 *   onError: (err) => console.error('Avatar error:', err)
 * })
 * 
 * await avatar.initialize()
 * avatar.start()
 * 
 * // Later...
 * avatar.stop()
 * avatar.destroy()
 * ```
 */
export class FacialAvatar {
  private config: FacialAvatarConfig
  private landmarkManager: FacialLandmarkManager | null = null
  private avatarRenderer: AvatarRenderer | null = null
  private isRunning: boolean = false
  private isInitialized: boolean = false
  private animationFrameId: number | null = null
  private lastProcessTime: number = 0
  private noFaceDetectedCount: number = 0
  private readonly NO_FACE_THRESHOLD = 5 // Frames before triggering callback

  constructor(config: FacialAvatarConfig) {
    this.config = config
    this.validateConfig()
  }

  /**
   * Validate the configuration
   */
  private validateConfig(): void {
    if (!this.config.videoElement) {
      throw new Error('videoElement is required')
    }
    if (!this.config.canvasElement) {
      throw new Error('canvasElement is required')
    }
    if (!this.config.modelPath) {
      throw new Error('modelPath is required')
    }
    
    // Validate video element
    if (!(this.config.videoElement instanceof HTMLVideoElement)) {
      throw new Error('videoElement must be an HTMLVideoElement')
    }
    
    // Validate canvas element
    if (!(this.config.canvasElement instanceof HTMLCanvasElement)) {
      throw new Error('canvasElement must be an HTMLCanvasElement')
    }
  }

  /**
   * Initialize the avatar system
   * Must be called before start()
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('FacialAvatar already initialized')
      return
    }

    try {
      console.log('🎭 Initializing FacialAvatar...')
      
      // Initialize landmark manager
      this.landmarkManager = new FacialLandmarkManager({
        delegate: this.config.delegate ?? 'GPU',
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true
      })
      
      await this.landmarkManager.initialize()
      console.log('✅ Landmark manager initialized')
      
      // Initialize avatar renderer
      this.avatarRenderer = new AvatarRenderer({
        canvas: this.config.canvasElement,
        modelPath: this.config.modelPath,
        enableControls: this.config.enableControls ?? true,
        enableZoom: this.config.enableZoom ?? false,
        fov: this.config.fov ?? 60
      })
      
      await this.avatarRenderer.initialize()
      console.log('✅ Avatar renderer initialized')
      
      this.isInitialized = true
      console.log('✅ FacialAvatar initialized successfully')
      
      // Call ready callback
      if (this.config.onReady) {
        this.config.onReady()
      }
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error('❌ Failed to initialize FacialAvatar:', err)
      
      if (this.config.onError) {
        this.config.onError(err)
      }
      
      throw err
    }
  }

  /**
   * Start avatar processing
   * Begins the facial tracking and animation loop
   */
  start(): void {
    if (!this.isInitialized) {
      throw new Error('FacialAvatar not initialized. Call initialize() first.')
    }
    
    if (this.isRunning) {
      console.warn('Avatar is already running')
      return
    }
    
    this.isRunning = true
    this.lastProcessTime = performance.now()
    this.processFrame()
    console.log('▶️  Avatar started')
  }

  /**
   * Stop avatar processing
   * Pauses the facial tracking loop
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Avatar is not running')
      return
    }
    
    this.isRunning = false
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    
    console.log('⏸️  Avatar stopped')
  }

  /**
   * Main processing loop - detects landmarks and updates avatar
   */
  private processFrame(): void {
    if (!this.isRunning) return
    
    this.animationFrameId = requestAnimationFrame(() => this.processFrame())
    
    // Throttle processing to avoid overload (process every ~16ms = 60fps)
    const now = performance.now()
    if (now - this.lastProcessTime < 16) {
      return
    }
    this.lastProcessTime = now
    
    if (!this.landmarkManager || !this.avatarRenderer) {
      return
    }
    
    try {
      // Detect facial landmarks
      const results = this.landmarkManager.detectLandmarks(this.config.videoElement)
      
      if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        // Face detected - reset counter
        this.noFaceDetectedCount = 0
        
        // Apply custom blendshape multipliers if provided
        if (this.config.blendshapeMultipliers && results.faceBlendshapes && results.faceBlendshapes.length > 0) {
          const faceBlendshape = results.faceBlendshapes[0]
          if (faceBlendshape && faceBlendshape.categories) {
            const retargeted = retargetBlendshapes(faceBlendshape.categories, this.config.blendshapeMultipliers)
            
            // Replace the blendshapes with retargeted ones
            const retargetedCategories = Array.from(retargeted.entries()).map(([name, score]) => ({
              categoryName: name,
              score,
              index: 0,
              displayName: name
            }))
            
            faceBlendshape.categories = retargetedCategories
          }
        }
        
        // Update avatar with landmarks
        this.avatarRenderer.processLandmarks(results)
        
        // Trigger callback
        if (this.config.onLandmarksDetected) {
          this.config.onLandmarksDetected(results)
        }
        
      } else {
        // No face detected
        this.noFaceDetectedCount++
        
        // Only trigger callback after threshold to avoid flicker
        if (this.noFaceDetectedCount === this.NO_FACE_THRESHOLD) {
          if (this.config.onNoFaceDetected) {
            this.config.onNoFaceDetected()
          }
        }
      }
      
    } catch (error) {
      console.error('Error processing frame:', error)
      
      if (this.config.onError && error instanceof Error) {
        this.config.onError(error)
      }
    }
  }

  /**
   * Update canvas size (call when window is resized)
   */
  updateSize(width: number, height: number): void {
    if (this.avatarRenderer) {
      this.avatarRenderer.updateSize(width, height)
    }
  }

  /**
   * Set custom blendshape multipliers at runtime
   */
  setBlendshapeMultipliers(multipliers: Record<string, number>): void {
    this.config.blendshapeMultipliers = {
      ...this.config.blendshapeMultipliers,
      ...multipliers
    }
  }

  /**
   * Get the current video element
   */
  getVideoElement(): HTMLVideoElement {
    return this.config.videoElement
  }

  /**
   * Get the current canvas element
   */
  getCanvasElement(): HTMLCanvasElement {
    return this.config.canvasElement
  }

  /**
   * Get the avatar renderer instance (for advanced usage)
   */
  getRenderer(): AvatarRenderer | null {
    return this.avatarRenderer
  }

  /**
   * Get the landmark manager instance (for advanced usage)
   */
  getLandmarkManager(): FacialLandmarkManager | null {
    return this.landmarkManager
  }

  /**
   * Check if avatar is currently running
   */
  get running(): boolean {
    return this.isRunning
  }

  /**
   * Check if avatar system is initialized
   */
  get ready(): boolean {
    return this.isInitialized
  }

  /**
   * Destroy avatar and cleanup resources
   * Call this when you're done with the avatar
   */
  destroy(): void {
    console.log('🧹 Destroying FacialAvatar...')
    
    this.stop()
    
    if (this.landmarkManager) {
      this.landmarkManager.destroy()
      this.landmarkManager = null
    }
    
    if (this.avatarRenderer) {
      this.avatarRenderer.destroy()
      this.avatarRenderer = null
    }
    
    this.isInitialized = false
    console.log('✅ FacialAvatar destroyed')
  }
}

