/**
 * Avatar - Handles loading and animating GLB 3D models
 */

import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

/**
 * Options for applying transformation matrix
 */
export interface ApplyMatrixOptions {
  scale?: number
}

/**
 * Options for loading and positioning the model
 */
export interface LoadModelOptions {
  /** Center the model at origin. Default: true */
  center?: boolean
  /** Apply automatic rotation. Default: true */
  autoRotate?: boolean
  /** Rotation in radians around Y-axis. Default: Math.PI (180°) */
  rotation?: number
  /** Uniform scale factor. Default: 1 */
  scale?: number
}

/**
 * Cache entry for fast blendshape updates
 */
interface BlendshapeCache {
  mesh: THREE.Mesh
  influences: number[]
  index: number
}

/**
 * Avatar class - Loads and animates GLB models with blendshapes
 */
export class Avatar {
  private url: string
  private scene: THREE.Scene
  private loader: GLTFLoader
  private gltf: GLTF | null = null
  private morphTargetMeshes: THREE.Mesh[] = []
  private root: THREE.Bone | null = null
  private options: Required<LoadModelOptions>
  
  private blendshapeCache: Map<string, BlendshapeCache[]> = new Map()
  
  // Reusable objects to avoid allocations in hot paths
  private _tempVector3: THREE.Vector3 = new THREE.Vector3()
  private _tempMatrix4: THREE.Matrix4 = new THREE.Matrix4()
  private _tempQuaternion: THREE.Quaternion = new THREE.Quaternion()
  private _tempEuler: THREE.Euler = new THREE.Euler()
  private _tempBox3: THREE.Box3 = new THREE.Box3()
  
  public loaded: boolean = false

  constructor(url: string, scene: THREE.Scene, options: LoadModelOptions = {}) {
    this.url = url
    this.scene = scene
    this.loader = new GLTFLoader()
    
    // Set default options
    this.options = {
      center: true,
      autoRotate: true,
      rotation: Math.PI,
      scale: 1,
      ...options
    }
    
    // Set the MeshoptDecoder for compressed files
    this.loader.setMeshoptDecoder(MeshoptDecoder)
  }

  /**
   * Initialize the avatar by loading the model
   * Must be called after construction
   */
  async initialize(): Promise<void> {
    const url = this.url
    
    console.log('Loading avatar model from:', url)
    
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        // Success callback
        (gltf: GLTF) => {
          if (this.gltf) {
            // Reset if a previous model was loaded
            this.scene.remove(this.gltf.scene)
            this.morphTargetMeshes = []
            this.blendshapeCache.clear()
            this.root = null
          }
          
          this.gltf = gltf
          this.scene.add(gltf.scene)
          this.initializeLoadedModel(gltf)
          this.loaded = true
          
          // Apply transformations based on options
          if (this.options.center) {
            // Center the model (reuse temp objects to avoid allocation)
            this._tempBox3.setFromObject(gltf.scene)
            const center = this._tempBox3.getCenter(this._tempVector3)
            gltf.scene.position.x = -center.x
            gltf.scene.position.y = -center.y
            gltf.scene.position.z = -center.z
          }
          
          // Apply rotation if enabled
          if (this.options.autoRotate) {
            gltf.scene.rotation.y = this.options.rotation
          }
          
          // Apply scale
          gltf.scene.scale.set(this.options.scale, this.options.scale, this.options.scale)
          
          console.log('✅ Avatar model loaded successfully')
          resolve()
        },
        // Progress callback
        (progress) => {
          const percentage = Math.round(100.0 * (progress.loaded / progress.total))
          console.log(`Loading model... ${percentage}%`)
        },
        // Error callback
        (error: unknown) => {
          console.error('Error loading avatar model:', error)
          console.error('Failed URL:', this.url)
          const err = error instanceof Error ? error : new Error(String(error))
          reject(new Error(`Failed to load avatar model: ${err.message}`))
        }
      )
    })
  }

  /**
   * Initialize the loaded model - find bones and morph targets
   */
  private initializeLoadedModel(gltf: GLTF): void {
    gltf.scene.traverse((object) => {
      // Find root bone
      if (object instanceof THREE.Bone && !this.root) {
        this.root = object
        console.log('Found root bone:', object.name)
      }
      
      // Find meshes with morph targets (blendshapes)
      if (object instanceof THREE.Mesh) {
        object.frustumCulled = false
        
        if (object.morphTargetDictionary && object.morphTargetInfluences) {
          this.morphTargetMeshes.push(object)
          const blendshapeCount = Object.keys(object.morphTargetDictionary).length
          console.log(`Found mesh "${object.name}" with ${blendshapeCount} blendshapes`)
        }
      }
    })
    
    if (!this.root) {
      console.warn('No root bone found - avatar may not animate correctly')
    }
    
    if (this.morphTargetMeshes.length === 0) {
      console.warn('No morph targets found - avatar will not have facial expressions')
    } else {
      // Build blendshape cache for fast updates
      this.buildBlendshapeCache()
    }
  }

  /**
   * Build cache mapping blendshape names to mesh/index pairs
   * This enables O(1) blendshape updates
   */
  private buildBlendshapeCache(): void {
    this.blendshapeCache.clear()
    
    for (const mesh of this.morphTargetMeshes) {
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
        continue
      }
      
      // For each blendshape in this mesh, add to cache
      for (const [blendshapeName, index] of Object.entries(mesh.morphTargetDictionary)) {
        if (index === undefined) continue
        
        // Get or create array for this blendshape name
        let cacheEntries = this.blendshapeCache.get(blendshapeName)
        if (!cacheEntries) {
          cacheEntries = []
          this.blendshapeCache.set(blendshapeName, cacheEntries)
        }
        
        // Add this mesh/index pair to the cache
        cacheEntries.push({
          mesh,
          influences: mesh.morphTargetInfluences,
          index
        })
      }
    }
    
    console.log(`Built blendshape cache with ${this.blendshapeCache.size} unique blendshapes`)
  }

  /**
   * Update blendshape values
   * Uses cached indices for O(1) performance
   * @param blendshapes - Map of blendshape names to values (0-1)
   */
  updateBlendshapes(blendshapes: Map<string, number>): void {
    for (const [name, value] of blendshapes) {
      const cacheEntries = this.blendshapeCache.get(name)
      
      if (cacheEntries) {
        for (const entry of cacheEntries) {
          entry.influences[entry.index] = value
        }
      }
    }
  }

  /**
   * Apply transformation matrix to the avatar
   * @param matrix - Transformation matrix
   * @param options - Options including scale
   */
  applyMatrix(matrix: THREE.Matrix4, options: ApplyMatrixOptions = {}): void {
    const { scale = 1 } = options
    
    if (!this.gltf) return
    
    // Apply scale (reuse temp vector to avoid allocation)
    this._tempVector3.set(scale, scale, scale)
    matrix.scale(this._tempVector3)
    
    // Fix horizontal mirroring by flipping X-axis (reuse temp matrix)
    this._tempMatrix4.makeScale(-1, 1, 1)
    matrix.premultiply(this._tempMatrix4)
    
    // Apply matrix to the avatar
    this.gltf.scene.matrixAutoUpdate = false
    this.gltf.scene.matrix.copy(matrix)
  }

  /**
   * Offset the root bone position and rotation
   * @param offset - Position offset
   * @param rotation - Optional rotation offset in Euler angles
   */
  offsetRoot(offset: THREE.Vector3, rotation?: THREE.Vector3): void {
    if (this.root) {
      this.root.position.copy(offset)
      
      if (rotation) {
        // Reuse temp objects to avoid allocation
        this._tempEuler.set(rotation.x, rotation.y, rotation.z)
        this._tempQuaternion.setFromEuler(this._tempEuler)
        this.root.quaternion.copy(this._tempQuaternion)
      }
    }
  }

  /**
   * Get the loaded GLTF scene
   */
  getScene(): THREE.Group | null {
    return this.gltf?.scene ?? null
  }

  /**
   * Get all meshes with morph targets
   */
  getMorphTargetMeshes(): THREE.Mesh[] {
    return this.morphTargetMeshes
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.gltf) {
      this.scene.remove(this.gltf.scene)
    }
    this.morphTargetMeshes = []
    this.blendshapeCache.clear()
    this.root = null
    this.gltf = null
    this.loaded = false
  }
}

