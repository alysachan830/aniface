/**
 * AvatarRenderer - Handles 3D rendering and facial landmark processing
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { Avatar } from './Avatar'
import { retargetBlendshapes } from '../utils/blendshapeRetargeting'

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
  
  /** Custom blendshape multipliers to adjust expression intensity */
  blendshapeMultipliers?: Record<string, number>
}

/**
 * AvatarRenderer - Manages Three.js scene and avatar rendering
 * 
 * @example
 * ```typescript
 * const renderer = new AvatarRenderer({
 *   canvas: document.getElementById('avatar'),
 *   modelPath: '/models/avatar.glb'
 * })
 * 
 * await renderer.initialize()
 * 
 * // Process landmarks from MediaPipe
 * renderer.processLandmarks(landmarkResults)
 * ```
 */
export class AvatarRenderer {
  private canvas: HTMLCanvasElement
  private modelPath: string
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private controls: OrbitControls | null = null
  private avatar: Avatar | null = null
  private landmarkQueue: FaceLandmarkerResult[] = []
  
  private config: Required<AvatarRendererConfig>

  constructor(config: AvatarRendererConfig) {
    this.canvas = config.canvas
    this.modelPath = config.modelPath
    
    this.config = {
      canvas: config.canvas,
      modelPath: config.modelPath,
      enableControls: config.enableControls ?? true,
      enableZoom: config.enableZoom ?? false,
      fov: config.fov ?? 60,
      blendshapeMultipliers: config.blendshapeMultipliers ?? {}
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
    const aspect = this.canvas.width / this.canvas.height || 1
    this.camera = new THREE.PerspectiveCamera(
      this.config.fov,
      aspect,
      0.01,
      5000
    )
    this.camera.position.z = 5
    
    // Set up WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    })
    this.renderer.setSize(this.canvas.width || 320, this.canvas.height || 240)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(0, 1, 2)
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
    this.renderer.setSize(width || 320, height || 240)
  }

  /**
   * Load the avatar model
   */
  private async loadAvatar(): Promise<void> {
    if (!this.scene) {
      throw new Error('Scene not initialized')
    }
    
    this.avatar = new Avatar(this.modelPath, this.scene)
    await this.avatar.initialize()
  }

  /**
   * Process facial landmarks and update avatar
   * @param results - Results from MediaPipe Face Landmarker
   */
  processLandmarks(results: FaceLandmarkerResult | null): void {
    if (!results) return
    
    // If avatar not ready, queue the landmarks
    if (!this.avatar || !this.avatar.loaded) {
      this.landmarkQueue.push(results)
      // Keep only the most recent 5 to avoid memory issues
      if (this.landmarkQueue.length > 5) {
        this.landmarkQueue.shift()
      }
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
            const matrix = new THREE.Matrix4().fromArray(transformMatrix.data)
          this.avatar.applyMatrix(matrix, { scale: 40 })
          
          // Optional: offset root bone
          const headPos = new THREE.Vector3(0, 0, 0)
          this.avatar.offsetRoot(headPos)
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
    this.landmarkQueue = []
  }
}

