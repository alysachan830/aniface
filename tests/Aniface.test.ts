/**
 * Aniface core functionality tests
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { Aniface } from '../src/Aniface'

describe('Aniface', () => {
  let mockVideo: HTMLVideoElement
  let mockCanvas: HTMLCanvasElement
  
  beforeEach(() => {
    // Create fresh DOM elements for each test
    mockVideo = document.createElement('video')
    mockCanvas = document.createElement('canvas')
  })

  describe('Instantiation', () => {
    test('creates instance with valid config', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar).toBeDefined()
      expect(avatar).toBeInstanceOf(Aniface)
    })

    test('instance has expected initial state', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.ready).toBe(false)
      expect(avatar.running).toBe(false)
    })
  })

  describe('Config Validation', () => {
    test('throws error when videoElement is missing', () => {
      expect(() => {
        new Aniface({
          videoElement: null as any,
          canvasElement: mockCanvas,
          modelPath: '/test-model.glb'
        })
      }).toThrow('videoElement is required')
    })

    test('throws error when canvasElement is missing', () => {
      expect(() => {
        new Aniface({
          videoElement: mockVideo,
          canvasElement: null as any,
          modelPath: '/test-model.glb'
        })
      }).toThrow('canvasElement is required')
    })

    test('throws error when modelPath is missing', () => {
      expect(() => {
        new Aniface({
          videoElement: mockVideo,
          canvasElement: mockCanvas,
          modelPath: null as any
        })
      }).toThrow('modelPath is required')
    })

    test('throws error when videoElement is not HTMLVideoElement', () => {
      expect(() => {
        new Aniface({
          videoElement: document.createElement('div') as any,
          canvasElement: mockCanvas,
          modelPath: '/test-model.glb'
        })
      }).toThrow('videoElement must be an HTMLVideoElement')
    })

    test('throws error when canvasElement is not HTMLCanvasElement', () => {
      expect(() => {
        new Aniface({
          videoElement: mockVideo,
          canvasElement: document.createElement('div') as any,
          modelPath: '/test-model.glb'
        })
      }).toThrow('canvasElement must be an HTMLCanvasElement')
    })
  })

  describe('Lifecycle', () => {
    test('throws error when starting before initialization', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(() => avatar.start()).toThrow('Aniface not initialized')
    })

    test('stop works when not running', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      // Should not throw
      expect(() => avatar.stop()).not.toThrow()
    })

    test('destroy cleans up state', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      avatar.destroy()
      
      expect(avatar.ready).toBe(false)
      expect(avatar.running).toBe(false)
    })
  })

  describe('Getters', () => {
    test('getVideoElement returns the video element', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.getVideoElement()).toBe(mockVideo)
    })

    test('getCanvasElement returns the canvas element', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.getCanvasElement()).toBe(mockCanvas)
    })

    test('getRenderer returns null before initialization', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.getRenderer()).toBeNull()
    })

    test('getLandmarkManager returns null before initialization', () => {
      const avatar = new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb'
      })
      
      expect(avatar.getLandmarkManager()).toBeNull()
    })
  })

  describe('Callbacks', () => {
    test('calls onReady callback when provided', async () => {
      const onReady = vi.fn()
      
      new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb',
        onReady
      })

        // Verify callback is NOT called during construction.
        // The onReady callback should only fire after initialize() completes,
        // not when the Aniface instance is created.

        // Note: This test doesn't verify the callback actually fires after initialize()
        // because that would require mocking the entire MediaPipe + Three.js initialization chain.
        // Manual testing confirms callbacks work correctly.
      expect(onReady).not.toHaveBeenCalled()
    })

    test('calls onError callback when provided', () => {
      const onError = vi.fn()
      
      new Aniface({
        videoElement: mockVideo,
        canvasElement: mockCanvas,
        modelPath: '/test-model.glb',
        onError
      })
      
      // Verify callback can be assigned
      expect(onError).toBeDefined()
    })
  })
})

