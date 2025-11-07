# Aniface

**Animate 3D avatars with real-time facial tracking using MediaPipe and Three.js**

A powerful, easy-to-use library that brings your 3D avatar models to life with real-time facial expressions captured from a webcam.

## Features

- 🎭 **Real-time facial tracking** - Powered by MediaPipe Face Landmarker
- 🎨 **Automatic blendshape mapping** - Works with ARKit-compatible models
- 🎯 **Simple API** - Get started in minutes
- 🔧 **Highly customizable** - Fine-tune every aspect of rendering and tracking
- 📦 **TypeScript support** - Full type definitions included
- ⚡ **Performance optimized** - Efficient rendering and blendshape updates

## Installation

### For Local Development

If you're developing this library locally and want to use it in another project:

```bash
cd /path/to/aniface
npm install

# In your other project:
cd /path/to/your-project
npm install /path/to/aniface
```

### Prerequisites

Make sure your project has these peer dependencies:

```bash
npm install three @mediapipe/tasks-vision
```

## Quick Start

```javascript
import { FacialAvatar } from 'aniface'

// Get your video and canvas elements
const videoElement = document.getElementById('webcam')
const canvasElement = document.getElementById('avatar')

// Create the avatar
const avatar = new FacialAvatar({
  videoElement,
  canvasElement,
  modelPath: '/path/to/your/model.glb',
  onReady: () => console.log('Avatar ready!'),
  onError: (error) => console.error('Error:', error)
})

// Initialize and start
await avatar.initialize()
avatar.start()

// When done
avatar.stop()
avatar.destroy()
```

## Configuration Options

### Basic Configuration

```javascript
new FacialAvatar({
  // Required
  videoElement: HTMLVideoElement,    // Video element for webcam
  canvasElement: HTMLCanvasElement,  // Canvas for rendering avatar
  modelPath: string,                 // Path to GLB/GLTF model
  
  // Optional callbacks
  onReady: () => void,
  onError: (error: Error) => void,
  onLandmarksDetected: (results) => void,
  onNoFaceDetected: () => void
})
```

### Common Scenarios

#### 1. Video Call Avatar (Close-up Face)

```javascript
const avatar = new FacialAvatar({
  videoElement,
  canvasElement,
  modelPath: '/models/avatar.glb',
  
  // Zoom in for close-up
  modelOptions: { 
    scale: 0.6,      // Smaller scale = larger appearance
    center: true,
    autoRotate: true
  },
  fov: 70,           // Wider FOV = closer view
  
  enableControls: false,  // Disable user camera controls
  enableZoom: false
})
```

#### 2. Full Avatar Display

```javascript
const avatar = new FacialAvatar({
  videoElement,
  canvasElement,
  modelPath: '/models/full-body.glb',
  
  // Show full model
  modelOptions: { 
    scale: 1.0       // Default scale
  },
  fov: 60,           // Standard FOV
  
  enableControls: true,  // Let users rotate
  enableZoom: true       // Let users zoom
})
```

#### 3. Custom Canvas Size

```javascript
const avatar = new FacialAvatar({
  videoElement,
  canvasElement,
  modelPath: '/models/avatar.glb',
  
  // Adjust for your canvas aspect ratio
  modelOptions: { scale: 0.5 },
  fov: 75,
  
  // Handle window resize
  onReady: () => {
    window.addEventListener('resize', () => {
      const width = canvasElement.clientWidth
      const height = canvasElement.clientHeight
      avatar.updateSize(width, height)
    })
  }
})
```

## Advanced Configuration

### Blendshape Customization

Fine-tune expression intensity:

```javascript
const avatar = new FacialAvatar({
  videoElement,
  canvasElement,
  modelPath: '/models/avatar.glb',
  
  // Adjust specific blendshapes
  blendshapeMultipliers: {
    eyeBlinkLeft: 1.2,     // Make blinks more pronounced
    eyeBlinkRight: 1.2,
    jawOpen: 0.8,          // Reduce mouth opening
    mouthSmileLeft: 1.5,   // Exaggerate smiles
    mouthSmileRight: 1.5
  }
})
```

### Camera & Lighting

```javascript
const avatar = new FacialAvatar({
  videoElement,
  canvasElement,
  modelPath: '/models/avatar.glb',
  
  // Camera settings
  fov: 60,                    // Field of view
  enableControls: true,       // Orbit controls
  enableZoom: false,          // Disable zoom
  
  // Renderer settings
  rendererConfig: {
    antialias: true,
    alpha: true,
    camera: {
      near: 0.1,
      far: 1000
    },
    lighting: {
      ambient: { 
        color: 0xffffff, 
        intensity: 0.6 
      },
      directional: {
        color: 0xffffff,
        intensity: 0.9,
        position: { x: 5, y: 5, z: 5 }
      }
    }
  }
})
```

### MediaPipe Configuration

```javascript
const avatar = new FacialAvatar({
  videoElement,
  canvasElement,
  modelPath: '/models/avatar.glb',
  
  // Facial tracking settings
  landmarkConfig: {
    wasmPath: '/mediapipe/wasm',     // Path to MediaPipe WASM files
    minDetectionConfidence: 0.5,      // Lower = more detections
    minTrackingConfidence: 0.5        // Lower = smoother tracking
  }
})
```

## Model Requirements

Your 3D model must have:

1. **ARKit-compatible blendshapes** - Standard facial animation targets
2. **GLB or GLTF format** - Three.js compatible
3. **Proper rigging** - Face mesh with morph targets

### Common Blendshape Names

Aniface maps MediaPipe blendshapes to these standard names:
- `eyeBlinkLeft`, `eyeBlinkRight`
- `jawOpen`, `jawLeft`, `jawRight`
- `mouthSmileLeft`, `mouthSmileRight`
- `browInnerUp`, `browOuterUpLeft`, `browOuterUpRight`
- And many more... (52 total)

## API Reference

### FacialAvatar Class

#### Methods

```typescript
// Initialize the avatar system
await avatar.initialize(): Promise<void>

// Start facial tracking and animation
avatar.start(): void

// Stop the animation loop
avatar.stop(): void

// Clean up all resources
avatar.destroy(): void

// Update canvas size (call on window resize)
avatar.updateSize(width: number, height: number): void

// Check if avatar is running
avatar.running: boolean

// Check if avatar is initialized
avatar.ready: boolean
```

#### Advanced Access

```typescript
// Get the renderer (for advanced customization)
const renderer = avatar.getRenderer()

// Get the landmark manager
const landmarkManager = avatar.getLandmarkManager()

// Get video/canvas elements
const video = avatar.getVideoElement()
const canvas = avatar.getCanvasElement()
```

### Using Individual Components

For more control, use the low-level components:

```javascript
import { 
  FacialLandmarkManager,
  AvatarRenderer,
  Avatar,
  retargetBlendshapes
} from 'aniface'

// Create facial landmark manager
const landmarkManager = new FacialLandmarkManager({
  videoElement,
  onResults: (result) => {
    if (result.faceBlendshapes?.[0]) {
      const blendshapes = retargetBlendshapes(
        result.faceBlendshapes[0].categories
      )
      // Apply to your avatar...
    }
  }
})

await landmarkManager.initialize()
landmarkManager.start()

// Create renderer
const renderer = new AvatarRenderer({
  canvas: canvasElement,
  modelPath: '/path/to/model.glb'
})

await renderer.initialize()

// Animation loop
function animate() {
  renderer.render()
  requestAnimationFrame(animate)
}
animate()
```