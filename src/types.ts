/**
 * Type definitions for Aniface
 */

import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import type { MediaPipeBlendshapeName } from './utils/blendshapeRetargeting.js'
import type { LoadModelOptions } from './core/Avatar.js'
import type { FacialLandmarkManagerConfig } from './core/FacialLandmarkManager.js'
import type { CameraConfig, LightingConfig } from './core/AvatarRenderer.js'

/**
 * Configuration options for Aniface
 */
export interface AnifaceConfig {
  /** Video element containing the face to track */
  videoElement: HTMLVideoElement
  
  /** Canvas element where the avatar will be rendered */
  canvasElement: HTMLCanvasElement
  
  /** Path to the GLB model file */
  modelPath: string
  
  /** Callback when avatar system is ready */
  onReady?: () => void
  
  /** Callback when an error occurs */
  onError?: (error: Error) => void
  
  /** Callback when landmarks are detected */
  onLandmarksDetected?: (results: FaceLandmarkerResult) => void
  
  /** Callback when no face is detected */
  onNoFaceDetected?: () => void
  
  /** Optional multipliers for blendshape values (0-2 range recommended) */
  blendshapeMultipliers?: BlendshapeMultipliers
  
  /** Camera configuration (fov, controls, zoom) */
  cameraConfig?: Partial<CameraConfig>
  
  /** Lighting configuration */
  lightingConfig?: Partial<LightingConfig>
  
  /** Model loading options (position, rotation, scale) */
  modelOptions?: LoadModelOptions
  
  /** Landmark detection configuration (MediaPipe settings) */
  landmarkConfig?: FacialLandmarkManagerConfig
}

/**
 * Blendshape multiplier configuration
 * Keys are MediaPipe blendshape names, values are multipliers
 */
export type BlendshapeMultipliers = Partial<Record<MediaPipeBlendshapeName, number>>

/**
 * Event handlers for Aniface
 */
export interface AnifaceEvents {
  /** Fired when facial landmarks are detected */
  landmarksDetected: (data: FaceLandmarkerResult) => void
  
  /** Fired when no face is detected in the frame */
  noFaceDetected: () => void
  
  /** Fired when avatar system is initialized and ready */
  ready: () => void
  
  /** Fired when an error occurs */
  error: (error: Error) => void
}

/**
 * Blendshape category with name and score
 */
export interface BlendshapeCategory {
  categoryName: string
  score: number
}


