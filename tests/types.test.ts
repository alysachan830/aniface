/**
 * TypeScript types compilation tests
 * These tests verify that the TypeScript types are correctly defined and compile
 */

import { describe, test, expect } from 'vitest'
import type {
  AnifaceConfig,
  BlendshapeMultipliers,
  BlendshapeCategory
} from '../src/types'
import type {
  FacialLandmarkManagerConfig
} from '../src/core/FacialLandmarkManager'
import type {
  AvatarRendererConfig,
  CameraConfig,
  LightingConfig
} from '../src/core/AvatarRenderer'
import type {
  LoadModelOptions,
  ApplyMatrixOptions
} from '../src/core/Avatar'

describe('Type Definitions', () => {
  test('AnifaceConfig type compiles', () => {
    const config: AnifaceConfig = {
      videoElement: document.createElement('video'),
      canvasElement: document.createElement('canvas'),
      modelPath: '/test.glb'
    }
    
    expect(config).toBeDefined()
  })

  test('AnifaceConfig with all optional properties compiles', () => {
    const config: AnifaceConfig = {
      videoElement: document.createElement('video'),
      canvasElement: document.createElement('canvas'),
      modelPath: '/test.glb',
      onReady: () => {},
      onError: () => {},
      onLandmarksDetected: () => {},
      onNoFaceDetected: () => {},
      blendshapeMultipliers: {
        eyeBlinkLeft: 1.2,
        eyeBlinkRight: 1.2
      },
      cameraConfig: {
        fov: 60,
        enableControls: true,
        enableZoom: false
      },
      lightingConfig: {
        ambientIntensity: 0.6,
        directionalIntensity: 0.9,
        directionalPosition: [1, 2, 3]
      },
      modelOptions: {
        center: true,
        scale: 1.0
      },
      landmarkConfig: {
        wasmPath: '/wasm'
      }
    }
    
    expect(config).toBeDefined()
  })

  test('BlendshapeMultipliers type compiles', () => {
    const multipliers: BlendshapeMultipliers = {
      eyeBlinkLeft: 1.2,
      eyeBlinkRight: 1.2,
      jawOpen: 1.0
    }
    
    expect(multipliers).toBeDefined()
  })

  test('BlendshapeCategory type compiles', () => {
    const category: BlendshapeCategory = {
      categoryName: 'eyeBlinkLeft',
      score: 0.5
    }
    
    expect(category).toBeDefined()
  })

  test('FacialLandmarkManagerConfig type compiles', () => {
    const config: FacialLandmarkManagerConfig = {
      wasmPath: '/mediapipe/wasm',
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      delegate: 'GPU',
      modelAssetPath: '/models/face_landmarker.task'
    }
    
    expect(config).toBeDefined()
  })

  test('AvatarRendererConfig type compiles', () => {
    const config: AvatarRendererConfig = {
      canvas: document.createElement('canvas'),
      modelPath: '/model.glb',
      cameraConfig: {
        fov: 60,
        enableControls: true,
        enableZoom: false
      }
    }
    
    expect(config).toBeDefined()
  })

  test('CameraConfig type compiles', () => {
    const config: CameraConfig = {
      fov: 60,
      near: 0.1,
      far: 1000,
      enableControls: true,
      enableZoom: false
    }
    
    expect(config).toBeDefined()
  })

  test('LightingConfig type compiles', () => {
    const config: LightingConfig = {
      ambientIntensity: 0.6,
      directionalIntensity: 0.9,
      directionalPosition: [1, 2, 3]
    }
    
    expect(config).toBeDefined()
  })

  test('LoadModelOptions type compiles', () => {
    const options: LoadModelOptions = {
      center: true,
      autoRotate: false,
      rotation: 0,
      scale: 1.0,
      fullBodyAvatar: true
    }
    
    expect(options).toBeDefined()
  })

  test('ApplyMatrixOptions type compiles', () => {
    const options: ApplyMatrixOptions = {
      scale: 1.0
    }
    
    expect(options).toBeDefined()
  })
})

