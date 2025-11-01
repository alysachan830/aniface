/**
 * Blendshape Retargeting Utilities
 * 
 * Provides functions to retarget and adjust blendshape values from MediaPipe
 * to work better with different 3D models.
 */

import type { BlendshapeCategory } from '../types'

/**
 * Map of blendshape names to multiplier values
 */
export type BlendshapeMultipliers = Record<string, number>

/**
 * Default multipliers for common blendshapes
 * These values are tuned to make facial expressions more visible
 */
export const DEFAULT_BLENDSHAPE_MULTIPLIERS: BlendshapeMultipliers = {
  // Eyebrows
  browOuterUpLeft: 1.2,
  browOuterUpRight: 1.2,
  browInnerUp: 1.2,
  
  // Eyes
  eyeBlinkLeft: 1.2,
  eyeBlinkRight: 1.2,
  eyeWideLeft: 1.1,
  eyeWideRight: 1.1,
  
  // Mouth
  mouthSmileLeft: 1.0,
  mouthSmileRight: 1.0,
  jawOpen: 1.0,
}

/**
 * Retarget blendshapes from MediaPipe to a format suitable for 3D models
 * Applies multipliers to adjust the intensity of certain expressions
 * 
 * @param categories - Blendshape categories from MediaPipe FaceLandmarker
 * @param customMultipliers - Optional custom multipliers to override defaults
 * @returns Map of blendshape names to adjusted values (0-1 range)
 * 
 * @example
 * ```typescript
 * const results = faceLandmarker.detectForVideo(video, timestamp)
 * if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
 *   const blendshapes = retargetBlendshapes(
 *     results.faceBlendshapes[0].categories,
 *     { eyeBlinkLeft: 1.5, eyeBlinkRight: 1.5 }
 *   )
 *   avatar.updateBlendshapes(blendshapes)
 * }
 * ```
 */
export function retargetBlendshapes(
  categories: BlendshapeCategory[],
  customMultipliers?: BlendshapeMultipliers
): Map<string, number> {
  const multipliers = {
    ...DEFAULT_BLENDSHAPE_MULTIPLIERS,
    ...customMultipliers
  }
  
  const coefsMap = new Map<string, number>()
  
  for (const blendshape of categories) {
    const multiplier = multipliers[blendshape.categoryName] ?? 1.0
    const adjustedScore = Math.min(blendshape.score * multiplier, 1.0) // Clamp to 1.0
    coefsMap.set(blendshape.categoryName, adjustedScore)
  }
  
  return coefsMap
}

/**
 * Apply dampening to blendshape values to smooth out jittery movements
 * 
 * @param currentValues - Current blendshape values
 * @param newValues - New blendshape values from detection
 * @param dampeningFactor - Factor between 0-1 (0 = no smoothing, 1 = no change)
 * @returns Smoothed blendshape values
 * 
 * @example
 * ```typescript
 * // Smooth the transition between frames
 * const smoothed = dampenBlendshapes(
 *   previousBlendshapes,
 *   currentBlendshapes,
 *   0.3 // 30% dampening
 * )
 * ```
 */
export function dampenBlendshapes(
  currentValues: Map<string, number>,
  newValues: Map<string, number>,
  dampeningFactor: number = 0.3
): Map<string, number> {
  const dampened = new Map<string, number>()
  
  // Clamp dampening factor between 0 and 1
  const factor = Math.max(0, Math.min(1, dampeningFactor))
  
  for (const [name, newValue] of newValues) {
    const currentValue = currentValues.get(name) ?? newValue
    const smoothedValue = currentValue * factor + newValue * (1 - factor)
    dampened.set(name, smoothedValue)
  }
  
  return dampened
}

/**
 * Filter blendshapes by removing values below a threshold
 * Useful for reducing noise and micro-movements
 * 
 * @param blendshapes - Blendshape values to filter
 * @param threshold - Minimum value to keep (0-1 range)
 * @returns Filtered blendshape values
 * 
 * @example
 * ```typescript
 * // Remove small movements below 5%
 * const filtered = filterBlendshapesByThreshold(blendshapes, 0.05)
 * ```
 */
export function filterBlendshapesByThreshold(
  blendshapes: Map<string, number>,
  threshold: number = 0.05
): Map<string, number> {
  const filtered = new Map<string, number>()
  
  for (const [name, value] of blendshapes) {
    if (value >= threshold) {
      filtered.set(name, value)
    }
  }
  
  return filtered
}

/**
 * Map MediaPipe blendshape names to custom model blendshape names
 * Useful when your GLB model uses different naming conventions
 * 
 * @param blendshapes - Blendshape values with MediaPipe names
 * @param nameMapping - Map of MediaPipe names to custom model names
 * @returns Blendshapes with remapped names
 * 
 * @example
 * ```typescript
 * const nameMapping = {
 *   'eyeBlinkLeft': 'blink_L',
 *   'eyeBlinkRight': 'blink_R',
 *   'jawOpen': 'mouth_open'
 * }
 * const remapped = mapBlendshapeNames(blendshapes, nameMapping)
 * ```
 */
export function mapBlendshapeNames(
  blendshapes: Map<string, number>,
  nameMapping: Record<string, string>
): Map<string, number> {
  const mapped = new Map<string, number>()
  
  for (const [name, value] of blendshapes) {
    const mappedName = nameMapping[name] ?? name
    mapped.set(mappedName, value)
  }
  
  return mapped
}

/**
 * Combine multiple blendshapes into one
 * Useful for simplifying expressions or combining left/right movements
 * 
 * @param blendshapes - Input blendshape values
 * @param combinations - Map of target name to source names to combine
 * @param combineMethod - How to combine: 'average', 'max', or 'sum'
 * @returns Blendshapes with combined values
 * 
 * @example
 * ```typescript
 * // Create a single 'eyeBlink' from left and right
 * const combined = combineBlendshapes(
 *   blendshapes,
 *   { 'eyeBlink': ['eyeBlinkLeft', 'eyeBlinkRight'] },
 *   'average'
 * )
 * ```
 */
export function combineBlendshapes(
  blendshapes: Map<string, number>,
  combinations: Record<string, string[]>,
  combineMethod: 'average' | 'max' | 'sum' = 'average'
): Map<string, number> {
  const result = new Map(blendshapes)
  
  for (const [targetName, sourceNames] of Object.entries(combinations)) {
    const values = sourceNames
      .map(name => blendshapes.get(name))
      .filter((v): v is number => v !== undefined)
    
    if (values.length === 0) continue
    
    let combinedValue: number
    switch (combineMethod) {
      case 'max':
        combinedValue = Math.max(...values)
        break
      case 'sum':
        combinedValue = Math.min(values.reduce((a, b) => a + b, 0), 1.0)
        break
      case 'average':
      default:
        combinedValue = values.reduce((a, b) => a + b, 0) / values.length
        break
    }
    
    result.set(targetName, combinedValue)
  }
  
  return result
}

/**
 * Get a list of all available MediaPipe blendshape names
 * Useful for reference and debugging
 */
export const MEDIAPIPE_BLENDSHAPE_NAMES = [
  // Eyes
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  
  // Eyebrows
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  
  // Cheeks
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  
  // Nose
  'noseSneerLeft',
  'noseSneerRight',
  
  // Mouth
  'mouthClose',
  'mouthFunnel',
  'mouthPucker',
  'mouthLeft',
  'mouthRight',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  
  // Jaw
  'jawOpen',
  'jawForward',
  'jawLeft',
  'jawRight',
] as const

/**
 * Type for MediaPipe blendshape names
 */
export type MediaPipeBlendshapeName = typeof MEDIAPIPE_BLENDSHAPE_NAMES[number]


