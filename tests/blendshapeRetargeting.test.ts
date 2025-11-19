/**
 * Blendshape retargeting utility tests
 */

import { describe, test, expect } from 'vitest'
import {
  retargetBlendshapes,
  dampenBlendshapes,
  filterBlendshapesByThreshold,
  mapBlendshapeNames,
  combineBlendshapes,
  DEFAULT_BLENDSHAPE_MULTIPLIERS,
  MEDIAPIPE_BLENDSHAPE_NAMES
} from '../src/utils/blendshapeRetargeting'

describe('retargetBlendshapes', () => {
  test('applies default multipliers to blendshapes', () => {
    const categories = [
      { categoryName: 'eyeBlinkLeft', score: 0.5 },
      { categoryName: 'eyeBlinkRight', score: 0.5 },
      { categoryName: 'jawOpen', score: 0.8 }
    ]
    
    const result = retargetBlendshapes(categories)
    
    // eyeBlinkLeft has default multiplier of 1.2
    expect(result.get('eyeBlinkLeft')).toBe(0.5 * 1.2)
    // eyeBlinkRight has default multiplier of 1.2
    expect(result.get('eyeBlinkRight')).toBe(0.5 * 1.2)
    // jawOpen has default multiplier of 1.0
    expect(result.get('jawOpen')).toBe(0.8)
  })

  test('applies custom multipliers', () => {
    const categories = [
      { categoryName: 'eyeBlinkLeft', score: 0.5 },
      { categoryName: 'jawOpen', score: 0.6 }
    ]
    
    const customMultipliers = {
      eyeBlinkLeft: 2.0,
      jawOpen: 0.5
    }
    
    const result = retargetBlendshapes(categories, customMultipliers)
    
    expect(result.get('eyeBlinkLeft')).toBe(1.0) // 0.5 * 2.0
    expect(result.get('jawOpen')).toBe(0.3) // 0.6 * 0.5
  })

  test('applies multipliers correctly', () => {
    const categories = [
      { categoryName: 'eyeBlinkLeft', score: 0.9 }
    ]
    
    const result = retargetBlendshapes(categories, { eyeBlinkLeft: 2.0 })
    
    // 0.9 * 2.0 = 1.8
    expect(result.get('eyeBlinkLeft')).toBe(1.8)
  })

  test('uses 1.0 multiplier for blendshapes without custom multiplier', () => {
    const categories = [
      { categoryName: 'unknownBlendshape', score: 0.5 }
    ]
    
    const result = retargetBlendshapes(categories)
    
    expect(result.get('unknownBlendshape')).toBe(0.5)
  })

  test('returns Map with correct size', () => {
    const categories = [
      { categoryName: 'a', score: 0.5 },
      { categoryName: 'b', score: 0.6 },
      { categoryName: 'c', score: 0.7 }
    ]
    
    const result = retargetBlendshapes(categories)
    
    expect(result.size).toBe(3)
  })
})

describe('dampenBlendshapes', () => {
  test('smooths blendshape transitions', () => {
    const current = new Map([
      ['eyeBlinkLeft', 0.0],
      ['jawOpen', 0.5]
    ])
    
    const newValues = new Map([
      ['eyeBlinkLeft', 1.0],
      ['jawOpen', 1.0]
    ])
    
    // With 0.3 dampening factor:
    // result = current * 0.3 + new * 0.7
    const result = dampenBlendshapes(current, newValues, 0.3)
    
    expect(result.get('eyeBlinkLeft')).toBe(0.7) // 0.0 * 0.3 + 1.0 * 0.7
    expect(result.get('jawOpen')).toBe(0.85) // 0.5 * 0.3 + 1.0 * 0.7
  })

  test('uses default dampening factor of 0.3', () => {
    const current = new Map([['test', 0.0]])
    const newValues = new Map([['test', 1.0]])
    
    const result = dampenBlendshapes(current, newValues)
    
    expect(result.get('test')).toBe(0.7)
  })

  test('handles new blendshapes not in current values', () => {
    const current = new Map([['a', 0.5]])
    const newValues = new Map([
      ['a', 0.8],
      ['b', 0.6] // New blendshape
    ])
    
    const result = dampenBlendshapes(current, newValues, 0.5)
    
    // For new blendshape, uses new value as current
    expect(result.get('b')).toBe(0.6)
  })

  test('clamps dampening factor between 0 and 1', () => {
    const current = new Map([['test', 0.0]])
    const newValues = new Map([['test', 1.0]])
    
    const resultNegative = dampenBlendshapes(current, newValues, -0.5)
    expect(resultNegative.get('test')).toBe(1.0) // Clamped to 0, so 0.0 * 0 + 1.0 * 1
    
    const resultTooHigh = dampenBlendshapes(current, newValues, 1.5)
    expect(resultTooHigh.get('test')).toBe(0.0) // Clamped to 1, so 0.0 * 1 + 1.0 * 0
  })
})

describe('filterBlendshapesByThreshold', () => {
  test('removes blendshapes below threshold', () => {
    const blendshapes = new Map([
      ['a', 0.1],
      ['b', 0.05],
      ['c', 0.01]
    ])
    
    const result = filterBlendshapesByThreshold(blendshapes, 0.05)
    
    expect(result.has('a')).toBe(true)
    expect(result.has('b')).toBe(true) // Exactly at threshold
    expect(result.has('c')).toBe(false) // Below threshold
  })

  test('uses default threshold of 0.05', () => {
    const blendshapes = new Map([
      ['high', 0.1],
      ['low', 0.04]
    ])
    
    const result = filterBlendshapesByThreshold(blendshapes)
    
    expect(result.has('high')).toBe(true)
    expect(result.has('low')).toBe(false)
  })

  test('returns empty map when all values below threshold', () => {
    const blendshapes = new Map([
      ['a', 0.01],
      ['b', 0.02]
    ])
    
    const result = filterBlendshapesByThreshold(blendshapes, 0.1)
    
    expect(result.size).toBe(0)
  })
})

describe('mapBlendshapeNames', () => {
  test('remaps blendshape names according to mapping', () => {
    const blendshapes = new Map([
      ['eyeBlinkLeft', 0.5],
      ['eyeBlinkRight', 0.6],
      ['jawOpen', 0.7]
    ])
    
    const mapping = {
      eyeBlinkLeft: 'blink_L',
      eyeBlinkRight: 'blink_R',
      jawOpen: 'mouth_open'
    }
    
    const result = mapBlendshapeNames(blendshapes, mapping)
    
    expect(result.get('blink_L')).toBe(0.5)
    expect(result.get('blink_R')).toBe(0.6)
    expect(result.get('mouth_open')).toBe(0.7)
    expect(result.has('eyeBlinkLeft')).toBe(false)
  })

  test('keeps original names when not in mapping', () => {
    const blendshapes = new Map([
      ['eyeBlinkLeft', 0.5],
      ['unmapped', 0.6]
    ])
    
    const mapping = {
      eyeBlinkLeft: 'blink_L'
    }
    
    const result = mapBlendshapeNames(blendshapes, mapping)
    
    expect(result.get('blink_L')).toBe(0.5)
    expect(result.get('unmapped')).toBe(0.6) // Kept original name
  })
})

describe('combineBlendshapes', () => {
  test('averages blendshapes by default', () => {
    const blendshapes = new Map([
      ['eyeBlinkLeft', 0.5],
      ['eyeBlinkRight', 0.7]
    ])
    
    const combinations = {
      eyeBlink: ['eyeBlinkLeft', 'eyeBlinkRight']
    }
    
    const result = combineBlendshapes(blendshapes, combinations)
    
    expect(result.get('eyeBlink')).toBe(0.6) // (0.5 + 0.7) / 2
  })

  test('uses max combination method', () => {
    const blendshapes = new Map([
      ['a', 0.5],
      ['b', 0.8],
      ['c', 0.3]
    ])
    
    const combinations = {
      combined: ['a', 'b', 'c']
    }
    
    const result = combineBlendshapes(blendshapes, combinations, 'max')
    
    expect(result.get('combined')).toBe(0.8)
  })

  test('uses sum combination method and clamps to 1.0', () => {
    const blendshapes = new Map([
      ['a', 0.6],
      ['b', 0.7]
    ])
    
    const combinations = {
      combined: ['a', 'b']
    }
    
    const result = combineBlendshapes(blendshapes, combinations, 'sum')
    
    // 0.6 + 0.7 = 1.3, should be clamped to 1.0
    expect(result.get('combined')).toBe(1.0)
  })

  test('preserves original blendshapes', () => {
    const blendshapes = new Map([
      ['a', 0.5],
      ['b', 0.6]
    ])
    
    const combinations = {
      combined: ['a', 'b']
    }
    
    const result = combineBlendshapes(blendshapes, combinations)
    
    expect(result.get('a')).toBe(0.5)
    expect(result.get('b')).toBe(0.6)
    expect(result.get('combined')).toBe(0.55)
  })

  test('skips combination when source blendshapes not found', () => {
    const blendshapes = new Map([
      ['a', 0.5]
    ])
    
    const combinations = {
      combined: ['nonexistent1', 'nonexistent2']
    }
    
    const result = combineBlendshapes(blendshapes, combinations)
    
    expect(result.has('combined')).toBe(false)
  })
})

describe('Constants', () => {
  test('DEFAULT_BLENDSHAPE_MULTIPLIERS is defined', () => {
    expect(DEFAULT_BLENDSHAPE_MULTIPLIERS).toBeDefined()
    expect(typeof DEFAULT_BLENDSHAPE_MULTIPLIERS).toBe('object')
  })

  test('DEFAULT_BLENDSHAPE_MULTIPLIERS has expected properties', () => {
    expect(DEFAULT_BLENDSHAPE_MULTIPLIERS.eyeBlinkLeft).toBe(1.2)
    expect(DEFAULT_BLENDSHAPE_MULTIPLIERS.eyeBlinkRight).toBe(1.2)
    expect(DEFAULT_BLENDSHAPE_MULTIPLIERS.jawOpen).toBe(1.0)
  })

  test('MEDIAPIPE_BLENDSHAPE_NAMES is defined and is an array', () => {
    expect(MEDIAPIPE_BLENDSHAPE_NAMES).toBeDefined()
    expect(Array.isArray(MEDIAPIPE_BLENDSHAPE_NAMES)).toBe(true)
    expect(MEDIAPIPE_BLENDSHAPE_NAMES.length).toBeGreaterThan(0)
  })

  test('MEDIAPIPE_BLENDSHAPE_NAMES contains expected blendshapes', () => {
    expect(MEDIAPIPE_BLENDSHAPE_NAMES).toContain('eyeBlinkLeft')
    expect(MEDIAPIPE_BLENDSHAPE_NAMES).toContain('eyeBlinkRight')
    expect(MEDIAPIPE_BLENDSHAPE_NAMES).toContain('jawOpen')
  })
})

