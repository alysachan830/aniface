/**
 * FacialLandmarkManager - Manages MediaPipe Face Landmarker for facial tracking
 */

import {
  FaceLandmarker,
  FaceLandmarkerResult,
  FilesetResolver,
  DrawingUtils
} from '@mediapipe/tasks-vision'

/**
 * Configuration options for FacialLandmarkManager
 */
export interface FacialLandmarkManagerConfig {
  /** Whether to output face blendshapes (default: true) */
  outputFaceBlendshapes?: boolean
  
  /** Whether to output facial transformation matrices (default: true) */
  outputFacialTransformationMatrixes?: boolean
  
  /** Delegate for processing: 'CPU' or 'GPU' (default: 'GPU') */
  delegate?: 'CPU' | 'GPU'
  
  /** Custom model path (optional) */
  modelAssetPath?: string
  
  /** Custom WASM path (optional) */
  wasmPath?: string
}

/**
 * FacialLandmarkManager - Handles facial landmark detection using MediaPipe
 * 
 * @example
 * ```typescript
 * const manager = new FacialLandmarkManager()
 * await manager.initialize()
 * 
 * const results = manager.detectLandmarks(videoElement)
 * if (results) {
 *   console.log('Detected landmarks:', results.faceLandmarks)
 * }
 * ```
 */
export class FacialLandmarkManager {
  private faceLandmarker: FaceLandmarker | null = null
  private isInitialized: boolean = false
  private results: FaceLandmarkerResult | null = null
  private config: FacialLandmarkManagerConfig

  constructor(config: FacialLandmarkManagerConfig = {}) {
    this.config = {
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      delegate: 'GPU',
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      wasmPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      ...config
    }
  }

  /**
   * Initialize the MediaPipe Face Landmarker model
   * Must be called before using detectLandmarks
   */
  async initialize(): Promise<void> {
    try {
      this.faceLandmarker = null
      
      const vision = await FilesetResolver.forVisionTasks(
        this.config.wasmPath!
      )
      // createFromOptions customizes the Face Landmarker with configuration options
      this.faceLandmarker = await FaceLandmarker.createFromOptions(
          vision,
        {
          baseOptions: {
            modelAssetPath: this.config.modelAssetPath!,
            delegate: this.config.delegate!,
          },
          outputFaceBlendshapes: this.config.outputFaceBlendshapes!,
          outputFacialTransformationMatrixes: this.config.outputFacialTransformationMatrixes!,
          runningMode: 'VIDEO',
          numFaces: 1,
        }
      )
      
      this.isInitialized = true
      console.log('✅ FacialLandmarkManager initialized successfully')
      
    } catch (error) {
      console.error('Error initializing FacialLandmarkManager:', error)
      this.isInitialized = false
      throw error
    }
  }

  /**
   * Detect facial landmarks from a video element
   * 
   * @param videoElement - The video element to analyze
   * @param timestamp - Optional timestamp (uses performance.now() if not provided)
   * @returns FaceLandmarkerResult or null if detection fails
   */
  detectLandmarks(
    videoElement: HTMLVideoElement,
    timestamp?: number
  ): FaceLandmarkerResult | null {
    if (!this.faceLandmarker || !this.isInitialized) {
      console.warn('FaceLandmarkManager not initialized yet')
      return null
    }

    if (!videoElement || videoElement.readyState < 2) {
      console.warn('Video element not ready for landmark detection')
      return null
    }

    try {
      // Use provided timestamp or performance.now() for consistent timing
      const time = timestamp ?? performance.now()
      const results = this.faceLandmarker.detectForVideo(videoElement, time)
      this.results = results
      return results
    } catch (error) {
      console.error('Error detecting landmarks:', error)
      return null
    }
  }

  /**
   * Get the most recent detection results
   */
  getResults(): FaceLandmarkerResult | null {
    return this.results
  }

  /**
   * Check if the landmark manager is ready for use
   */
  isReady(): boolean {
    return this.isInitialized && this.faceLandmarker !== null
  }

  /**
   * Draw facial landmarks on a canvas (useful for debugging)
   * 
   * @param canvas - Canvas element to draw on
   */
  drawLandmarks(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')
    if (!ctx || !this.results?.faceLandmarks) return

    // Clear canvas with black background
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const drawingUtils = new DrawingUtils(ctx)
    const lineWidth = 1.3

    for (const landmarks of this.results.faceLandmarks) {
      // Face mesh tesselation
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        { color: '#C0C0C070', lineWidth }
      )
      
      // Right eye
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        { color: '#FF3030', lineWidth }
      )
      
      // Right eyebrow
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
        { color: '#FF3030', lineWidth }
      )
      
      // Left eye
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        { color: '#30FF30', lineWidth }
      )
      
      // Left eyebrow
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        { color: '#30FF30', lineWidth }
      )
      
      // Face oval
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        { color: '#E0E0E0', lineWidth }
      )
      
      // Lips
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LIPS,
        { color: '#E0E0E0', lineWidth }
      )
      
      // Right iris
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
        { color: '#FF3030', lineWidth }
      )
      
      // Left iris
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
        { color: '#30FF30', lineWidth }
      )
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.faceLandmarker = null
    this.results = null
    this.isInitialized = false
  }
}


