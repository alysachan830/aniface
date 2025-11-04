/**
 * Aniface - Animate 3D avatars with real-time facial tracking
 * @module aniface
 */

// Main exports
export { FacialAvatar } from './FacialAvatar'

// Core exports (for advanced usage)
export { FacialLandmarkManager } from './core/FacialLandmarkManager'
export { AvatarRenderer } from './core/AvatarRenderer'
export { Avatar } from './core/Avatar'

// Utility exports
export {
  retargetBlendshapes,
  dampenBlendshapes,
  filterBlendshapesByThreshold,
  mapBlendshapeNames,
  combineBlendshapes,
  DEFAULT_BLENDSHAPE_MULTIPLIERS,
  MEDIAPIPE_BLENDSHAPE_NAMES
} from './utils/blendshapeRetargeting'

// Type exports
export type {
  FacialAvatarConfig,
  FacialAvatarEvents,
  BlendshapeMultipliers,
  BlendshapeCategory
} from './types'

export type {
  FacialLandmarkManagerConfig
} from './core/FacialLandmarkManager'

export type {
  AvatarRendererConfig,
  CameraConfig,
  LightingConfig
} from './core/AvatarRenderer'

export type {
  ApplyMatrixOptions,
  LoadModelOptions
} from './core/Avatar'

export type {
  MediaPipeBlendshapeName
} from './utils/blendshapeRetargeting'

// Version
export const VERSION = '0.1.0'

