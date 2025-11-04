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
  /** Camera near clipping plane */
  near: number
  /** Camera far clipping plane */
  far: number
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
  
  /** Enable orbit controls (default: true) */
  enableControls?: boolean
  
  /** Enable zoom controls (default: false) */
  enableZoom?: boolean
  
  /** Camera field of view in degrees (default: 60) */
  fov?: number
  
  /** Pixel ratio for rendering (default: window.devicePixelRatio). Set to 1 for better performance on lower-end devices. */
  pixelRatio?: number
  
  /** Camera configuration (optional, defaults: near=0.01, far=2000) */
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
interface AvatarRendererInternalConfig extends Required<Omit<AvatarRendererConfig, 'lightingConfig' | 'cameraConfig'>> {
  cameraConfig: CameraConfig
  lightingConfig: LightingConfig
}

/**
 * AvatarRenderer - Manages Three.js scene and avatar rendering
 * 
 * @example
 * ```typescript
 * const renderer = new AvatarRenderer({
 *   canvas: document.getElementById('avatar'),
 *   modelPath: '/models/avatar.glb',
 *   // Optional: customize pixel ratio for quality/performance balance
 *   pixelRatio: window.devicePixelRatio, // Default, or set to 1 for better performance
 *   // Optional: customize camera
 *   cameraConfig: {
 *     near: 0.01,
 *     far: 1000
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
      enableControls: config.enableControls ?? true,
      enableZoom: config.enableZoom ?? false,
      fov: config.fov ?? 60,
      pixelRatio: config.pixelRatio ?? window.devicePixelRatio,
      cameraConfig: {
        near: config.cameraConfig?.near ?? 0.01,
        far: config.cameraConfig?.far ?? 2000
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
      this.config.fov,
      aspect,
      this.config.cameraConfig.near,
      this.config.cameraConfig.far
    )

    // Set up WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.config.canvas,
      alpha: true,
      antialias: true
    })
    this.renderer.setPixelRatio(this.config.pixelRatio)
    this.renderer.setSize(this.config.canvas.width || 320, this.config.canvas.height || 240)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      this.config.lightingConfig.ambientIntensity
    )
    this.scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      this.config.lightingConfig.directionalIntensity
    )
    const [x, y, z] = this.config.lightingConfig.directionalPosition
    directionalLight.position.set(x, y, z)
    this.scene.add(directionalLight)
    
    // Set up camera controls
    if (this.config.enableControls) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.25
      this.controls.enableZoom = this.config.enableZoom
      this.controls.enablePan = false
      this.controls.target.set(0, 0, 0)
      this.controls.update()
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
    this.renderer.setPixelRatio(this.config.pixelRatio)
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
  }

  /**
   * Process facial landmarks and update avatar
   * @param results - Results from MediaPipe Face Landmarker
   */
  processLandmarks(results: FaceLandmarkerResult | null): void {
    if (!results) return
    
    if (!this.avatar || !this.avatar.loaded) {
      return
    }
    
    this.processLandmarksInternal(results)
  }

  /**
   * Internal method to process landmarks
   */
  private processLandmarksInternal(results: FaceLandmarkerResult): void {
    if (!this.avatar) return
    
    try {
      // Process facial transformation matrix
      if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
        const transformMatrix = results.facialTransformationMatrixes[0]
        if (transformMatrix && transformMatrix.data) {
          // Reuse temp objects to avoid allocation
          this._tempMatrix4.fromArray(transformMatrix.data)
          this.avatar.applyMatrix(this._tempMatrix4, { scale: 40 })
          
          // Optional: offset root bone
          this._tempVector3.set(0, 0, 0)
          this.avatar.offsetRoot(this._tempVector3)
        }
      }
      
      // Process blendshapes
      if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        const faceBlendshape = results.faceBlendshapes[0]
        if (faceBlendshape && faceBlendshape.categories) {
          const coefsMap = retargetBlendshapes(faceBlendshape.categories, this.config.blendshapeMultipliers)
          this.avatar.updateBlendshapes(coefsMap)
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

