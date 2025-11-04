/**
 * Type definitions for Aniface
 */

import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import type { MediaPipeBlendshapeName } from './utils/blendshapeRetargeting'
import type { LoadModelOptions } from './core/Avatar'

/**
 * Configuration options for FacialAvatar
 */
export interface FacialAvatarConfig {
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
  
  /** Enable orbit controls (default: true) */
  enableControls?: boolean
  
  /** Enable zoom controls (default: false) */
  enableZoom?: boolean
  
  /** Camera field of view in degrees (default: 60) */
  fov?: number
  
  /** Delegate for MediaPipe processing: 'CPU' or 'GPU' (default: 'GPU') */
  delegate?: 'CPU' | 'GPU'
  
  /** Model loading options (position, rotation, scale) */
  modelOptions?: LoadModelOptions
}

/**
 * Blendshape multiplier configuration
 * Keys are MediaPipe blendshape names, values are multipliers
 */
export type BlendshapeMultipliers = Partial<Record<MediaPipeBlendshapeName, number>>

/**
 * Event handlers for FacialAvatar
 */
export interface FacialAvatarEvents {
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


