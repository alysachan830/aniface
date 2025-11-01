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
 * Avatar class - Loads and animates GLB models with blendshapes
 */
export class Avatar {
  private url: string
  private scene: THREE.Scene
  private loader: GLTFLoader
  private gltf: GLTF | null = null
  private morphTargetMeshes: THREE.Mesh[] = []
  private root: THREE.Bone | null = null
  
  public loaded: boolean = false

  constructor(url: string, scene: THREE.Scene) {
    this.url = url
    this.scene = scene
    this.loader = new GLTFLoader()
    
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
            this.root = null
          }
          
          this.gltf = gltf
          this.scene.add(gltf.scene)
          this.initializeLoadedModel(gltf)
          this.loaded = true
          
          // Center the model
          const box = new THREE.Box3().setFromObject(gltf.scene)
          const center = box.getCenter(new THREE.Vector3())
          gltf.scene.position.x = -center.x
          gltf.scene.position.y = -center.y
          gltf.scene.position.z = -center.z
          
          // Face forward
          gltf.scene.rotation.y = Math.PI
          
          // Default scale
          gltf.scene.scale.set(1, 1, 1)
          
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
    }
  }

  /**
   * Update blendshape values
   * @param blendshapes - Map of blendshape names to values (0-1)
   */
  updateBlendshapes(blendshapes: Map<string, number>): void {
    for (const mesh of this.morphTargetMeshes) {
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
        continue
      }
      
      for (const [name, value] of blendshapes) {
        if (name in mesh.morphTargetDictionary) {
          const idx = mesh.morphTargetDictionary[name]
          if (idx !== undefined && mesh.morphTargetInfluences[idx] !== undefined) {
            mesh.morphTargetInfluences[idx] = value
          }
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
    
    // Apply scale
    matrix.scale(new THREE.Vector3(scale, scale, scale))
    
    // Fix horizontal mirroring by flipping X-axis
    const flipMatrix = new THREE.Matrix4().makeScale(-1, 1, 1)
    matrix.premultiply(flipMatrix)
    
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
        const offsetQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rotation.x, rotation.y, rotation.z)
        )
        this.root.quaternion.copy(offsetQuat)
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
    this.root = null
    this.gltf = null
    this.loaded = false
  }
}

