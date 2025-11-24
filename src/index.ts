/**
 * Aniface - Animate 3D avatars with real-time facial tracking
 * @module aniface
 */

// Main exports
export { Aniface } from './Aniface.js'

// Core exports (for advanced usage)
export { FacialLandmarkManager } from './core/FacialLandmarkManager.js'
export { AvatarRenderer } from './core/AvatarRenderer.js'
export { Avatar } from './core/Avatar.js'

// Utility exports
export {
  retargetBlendshapes,
  dampenBlendshapes,
  filterBlendshapesByThreshold,
  mapBlendshapeNames,
  combineBlendshapes,
  DEFAULT_BLENDSHAPE_MULTIPLIERS,
  MEDIAPIPE_BLENDSHAPE_NAMES
} from './utils/blendshapeRetargeting.js'

// Type exports
export type {
  AnifaceConfig,
  AnifaceEvents,
  BlendshapeMultipliers,
  BlendshapeCategory
} from './types.js'

export type {
  FacialLandmarkManagerConfig
} from './core/FacialLandmarkManager.js'

export type {
  AvatarRendererConfig,
  CameraConfig,
  LightingConfig
} from './core/AvatarRenderer.js'

export type {
  ApplyMatrixOptions,
  LoadModelOptions
} from './core/Avatar.js'

export type {
  MediaPipeBlendshapeName
} from './utils/blendshapeRetargeting.js'

// Version
export const VERSION = '0.1.0'

