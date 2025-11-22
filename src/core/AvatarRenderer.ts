/**
 * AvatarRenderer - Handles 3D rendering and facial landmark processing
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { Avatar, type LoadModelOptions } from './Avatar'
import { retargetBlendshapes } from '../utils/blendshapeRetargeting'

/**
 * Camera configuration
 */
export interface CameraConfig {
  /** Camera field of view in degrees (default: 60) */
  fov?: number
  /** Enable orbit controls (default: false) */
  enableControls?: boolean
  /** Enable zoom controls (default: true) */
  enableZoom?: boolean
}

/**
 * Lighting configuration
 */
export interface LightingConfig {
  /** Ambient light intensity */
  ambientIntensity: number
  /** Directional light intensity */
  directionalIntensity: number
  /** Directional light position */
  directionalPosition: [number, number, number]
}

/**
 * Configuration options for AvatarRenderer
 */
export interface AvatarRendererConfig {
  /** Canvas element to render on */
  canvas: HTMLCanvasElement
  
  /** Path to GLB model file */
  modelPath: string
  
  /** Camera configuration (optional) */
  cameraConfig?: Partial<CameraConfig>
  
  /** Custom blendshape multipliers to adjust expression intensity */
  blendshapeMultipliers?: Record<string, number>
  
  /** Model loading options */
  modelOptions?: LoadModelOptions
  
  /** Lighting configuration (optional, defaults: ambientIntensity=0.5, directionalIntensity=0.8, directionalPosition=[0,1,2]) */
  lightingConfig?: Partial<LightingConfig>
}

/**
 * Internal configuration with all defaults applied
 */
interface AvatarRendererInternalConfig extends Required<Omit<AvatarRendererConfig, 'lightingConfig' | 'cameraConfig' | 'blendshapeMultipliers' | 'modelOptions'>> {
  cameraConfig: Required<CameraConfig>
  lightingConfig: LightingConfig
  blendshapeMultipliers: Record<string, number>
  modelOptions: LoadModelOptions
}

/**
 * AvatarRenderer - Manages Three.js scene and avatar rendering
 * 
 * @example
 * ```typescript
 * const renderer = new AvatarRenderer({
 *   canvas: document.getElementById('avatar'),
 *   modelPath: '/models/avatar.glb',
 *   // Optional: customize camera
 *   cameraConfig: {
 *     fov: 60,
 *     enableControls: true
 *   },
 *   // Optional: customize lighting
 *   lightingConfig: {
 *     ambientIntensity: 0.6,
 *     directionalIntensity: 0.9,
 *     directionalPosition: [1, 2, 3]
 *   }
 * })
 * 
 * await renderer.initialize()
 * 
 * // Process landmarks from MediaPipe
 * renderer.processLandmarks(landmarkResults)
 * ```
 */
export class AvatarRenderer {
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private controls: OrbitControls | null = null
  private avatar: Avatar | null = null
  
  // Reusable objects to avoid allocations in hot paths
  private _tempMatrix4: THREE.Matrix4 = new THREE.Matrix4()
  private _tempVector3: THREE.Vector3 = new THREE.Vector3()
  
  private config: AvatarRendererInternalConfig

  constructor(config: AvatarRendererConfig) {
    this.config = {
      canvas: config.canvas,
      modelPath: config.modelPath,
      cameraConfig: {
        fov: config.cameraConfig?.fov ?? 60,
        enableControls: config.cameraConfig?.enableControls ?? false,
        enableZoom: config.cameraConfig?.enableZoom ?? true
      },
      blendshapeMultipliers: config.blendshapeMultipliers ?? {},
      modelOptions: config.modelOptions ?? {},
      lightingConfig: {
        ambientIntensity: config.lightingConfig?.ambientIntensity ?? 0.5,
        directionalIntensity: config.lightingConfig?.directionalIntensity ?? 0.8,
        directionalPosition: config.lightingConfig?.directionalPosition ?? [0, 1, 2]
      }
    }
  }

  /**
   * Initialize the renderer - sets up Three.js scene and loads avatar
   */
  async initialize(): Promise<void> {
    this.setupScene()
    await this.loadAvatar()
  }

  /**
   * Set up the Three.js scene, camera, lights, and controls
   */
  private setupScene(): void {
    // Initialize scene
    this.scene = new THREE.Scene()
    
    // Set up camera
    const aspect = this.config.canvas.width / this.config.canvas.height || 1
    this.camera = new THREE.PerspectiveCamera(
      this.config.cameraConfig.fov,
      aspect,
    )

    // Set up WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.config.canvas,
      alpha: true,
      antialias: true
    })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.config.canvas.width || 320, this.config.canvas.height || 240)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // Add lighting setup for better depth and visibility
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      this.config.lightingConfig.ambientIntensity
    )
    this.scene.add(ambientLight)
    
    // Main directional light (key light)
    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      this.config.lightingConfig.directionalIntensity
    )
    const [x, y, z] = this.config.lightingConfig.directionalPosition
    directionalLight.position.set(x, y, z)
    this.scene.add(directionalLight)
    
    // Fill light from the opposite side to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
    fillLight.position.set(-2, 1, 2)
    this.scene.add(fillLight)

    // Rim light from behind for depth and separation
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3)
    rimLight.position.set(0, 2, -2)
    this.scene.add(rimLight)
    
    // Set up camera controls
    // Create OrbitControls if either controls or zoom is enabled
    if (this.config.cameraConfig.enableControls || this.config.cameraConfig.enableZoom) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.05  // Smoother damping
      this.controls.enableZoom = this.config.cameraConfig.enableZoom
      this.controls.enableRotate = this.config.cameraConfig.enableControls
      this.controls.enablePan = false
      this.controls.target.set(0, 0, 0)
      
      // Set reasonable zoom/rotation limits
      this.controls.minDistance = 0.5  // Min zoom distance
      this.controls.maxDistance = 10   // Max zoom distance
      
      this.controls.update()
      console.log('✅ OrbitControls enabled - Rotate:', this.config.cameraConfig.enableControls, 'Zoom:', this.config.cameraConfig.enableZoom)
    } else {
      console.log('ℹ️ OrbitControls disabled (both controls and zoom are off)')
    }
    
    console.log('✅ Three.js scene setup complete')
  }

  /**
   * Render a single frame
   * This should be called from the main animation loop
   */
  render(): void {
    if (!this.renderer || !this.scene || !this.camera) return
    
    if (this.controls) {
      this.controls.update()
    }
    
    this.renderer.render(this.scene, this.camera)
  }

  /**
   * Update renderer size (call when canvas is resized)
   */
  updateSize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return
    
    this.camera.aspect = width / height || 1
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(width || 320, height || 240)
  }

  /**
   * Load the avatar model
   */
  private async loadAvatar(): Promise<void> {
    if (!this.scene) {
      throw new Error('Scene not initialized')
    }
    
    this.avatar = new Avatar(this.config.modelPath, this.scene, this.config.modelOptions)
    await this.avatar.initialize()
    
    // Adjust camera position based on model type
    if (this.avatar.isFullBodyAvatar() && this.camera) {
      // Full-body models with head tracking (Ready Player Me, etc.)
      // Position camera higher to frame upper body/face area
      this.camera.position.set(0, 0.5, 1.5)
      this.camera.lookAt(0, 0.5, 0)

      // Update orbit controls target if enabled
      if (this.controls) {
        this.controls.target.set(0, 0.5, 0)
        this.controls.update()
      }

      console.log('📷 Camera adjusted for body model (head-only mode)')
    } else if (this.camera) {
      // Head-only models (like raccoon) - position camera in front
      this.camera.position.set(0, 0, 1.5)
      this.camera.lookAt(0, 0, 0)

      // Update orbit controls target if enabled
      if (this.controls) {
        this.controls.target.set(0, 0, 0)
        this.controls.update()
      }

      console.log('📷 Using default camera position for head-only model')
    }
  }

  /**
   * Process facial landmarks and update avatar
   * @param results - Results from MediaPipe Face Landmarker
   */
  processLandmarks(results: FaceLandmarkerResult | null): void {
    if (!results) return
    if (!this.avatar || !this.avatar.loaded) return
    
    const avatar = this.avatar
    
    try {
      // Process facial transformation matrix
      if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
        const transformMatrix = results.facialTransformationMatrixes[0]
        if (transformMatrix && transformMatrix.data) {
          // Reuse temp objects to avoid allocation
          this._tempMatrix4.fromArray(transformMatrix.data)
          
          // Use smaller scale for full-body models to prevent excessive movement
          const scale = avatar.isFullBodyAvatar() ? 1 : 40
          avatar.applyMatrix(this._tempMatrix4, { scale })
          
          // Optional: offset root bone (only for head-only models)
          if (!avatar.isFullBodyAvatar()) {
            this._tempVector3.set(0, 0, 0)
            avatar.offsetRoot(this._tempVector3)
          }
        }
      }
      
      // Process blendshapes
      if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        const faceBlendshape = results.faceBlendshapes[0]
        if (faceBlendshape && faceBlendshape.categories) {
          const coefsMap = retargetBlendshapes(faceBlendshape.categories, this.config.blendshapeMultipliers)
          avatar.updateBlendshapes(coefsMap)
        }
      }
    } catch (error) {
      console.error('Error processing landmarks:', error)
    }
  }

  /**
   * Get the Three.js scene
   */
  getScene(): THREE.Scene | null {
    return this.scene
  }

  /**
   * Get the camera
   */
  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera
  }

  /**
   * Get the avatar instance
   */
  getAvatar(): Avatar | null {
    return this.avatar
  }

  /**
   * Check if avatar is loaded and ready
   */
  isReady(): boolean {
    return this.avatar?.loaded ?? false
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.avatar) {
      this.avatar.destroy()
      this.avatar = null
    }
    
    if (this.controls) {
      this.controls.dispose()
      this.controls = null
    }
    
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer = null
    }
    
    this.scene = null
    this.camera = null
  }
}

