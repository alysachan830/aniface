/**
 * Test setup file - Mocks browser APIs and MediaPipe for testing
 * 
 * Note: Requires Node.js >= 18.0.0 for Vitest/Vite to work properly
 */

import { vi } from 'vitest'

// Mock MediaPipe FaceLandmarker (it's large and doesn't work in Node.js)
vi.mock('@mediapipe/tasks-vision', () => ({
  FaceLandmarker: vi.fn(() => ({
    setOptions: vi.fn(),
    detect: vi.fn(),
    detectForVideo: vi.fn(),
    close: vi.fn()
  })),
  FilesetResolver: {
    forVisionTasks: vi.fn(() => Promise.resolve({}))
  },
  FaceLandmarkerResult: {},
  Category: {}
}))

// Mock Three.js WebGL context (not available in jsdom)
const mockWebGLContext = {
  canvas: null,
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
  getParameter: vi.fn(),
  getExtension: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  viewport: vi.fn(),
  useProgram: vi.fn(),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn(() => true),
  getShaderParameter: vi.fn(() => true)
}

// Mock HTMLCanvasElement getContext to return mock WebGL
const originalGetContext = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
    return mockWebGLContext
  }
  return originalGetContext.call(this, contextId)
}) as any

// Mock HTMLVideoElement properties needed for testing
Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  get: vi.fn(() => 640)
})

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  get: vi.fn(() => 480)
})

Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
  get: vi.fn(() => 4) // HAVE_ENOUGH_DATA
})

// Mock requestAnimationFrame for tests that use it
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16) // ~60fps
  return 1
}) as any

global.cancelAnimationFrame = vi.fn()

