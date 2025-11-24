# Aniface

**Animate 3D avatars with real-time facial tracking using MediaPipe and Three.js**

A powerful, easy-to-use library that brings your 3D avatar models to life with real-time facial expressions captured from a webcam.

![raccoon-demo](https://github.com/user-attachments/assets/285cfeae-8fe8-45ca-afc4-dbafe6fa1cf7)

![rpm-demo](https://github.com/user-attachments/assets/ce9e72a0-ef45-487d-aca2-fccd319456b2)

## Features

- 🎭 **Real-time facial tracking** - Powered by MediaPipe Face Landmarker
- 🎨 **Automatic blendshape mapping** - Works with ARKit-compatible models
- 🎯 **Simple API** - Get started in minutes
- 🔧 **Highly customizable** - Fine-tune every aspect of rendering and tracking
- 📦 **TypeScript support** - Full type definitions included
- ⚡ **Performance optimized** - Efficient rendering and blendshape updates

## Installation

```bash
npm install aniface three @mediapipe/tasks-vision
```

## Quick Start

```javascript
import { Aniface } from 'aniface'

// Get your video and canvas elements
const videoElement = document.getElementById('webcam')
const canvasElement = document.getElementById('avatar')

// Create the avatar
const avatar = new Aniface({
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
new Aniface({
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

### Examples

#### Head-only Avatar (Raccoon avatar)

```javascript
const avatar = new Aniface({
  videoElement,
  canvasElement,
  modelPath: './raccoon_head_small.glb',
  
  cameraConfig: {
    fov: 60,
    enableControls: false,
    enableZoom: false
  },
  
  blendshapeMultipliers: {
    eyeBlinkLeft: 1.2,
    eyeBlinkRight: 1.2,
    jawOpen: 1.0,
    mouthSmileLeft: 1.1,
    mouthSmileRight: 1.1
  },
  
  modelOptions: {
    scale: 1.0
  },
  
  onReady: () => console.log('Avatar ready!'),
  onError: (error) => console.error('Error:', error)
})

await avatar.initialize()
avatar.start()
```

#### Half-body Avatar (Ready Player Me avatar)

```javascript
const avatar = new Aniface({
  videoElement,
  canvasElement,
  modelPath: 'https://models.readyplayer.me/[YOUR_ID].glb?morphTargets=ARKit&useHands=false',
  
  cameraConfig: {
    fov: 60,
    enableControls: false,
    enableZoom: false
  },
  
  blendshapeMultipliers: {
    eyeBlinkLeft: 1.3,
    eyeBlinkRight: 1.3,
    browInnerUp: 1.2,
    browOuterUpLeft: 1.2,
    browOuterUpRight: 1.2,
    jawOpen: 1.0,
    mouthSmileLeft: 1.0,
    mouthSmileRight: 1.0
  },
  
  lightingConfig: {
    ambientIntensity: 1.2,
    directionalIntensity: 1.5,
    directionalPosition: [2, 3, 3]
  },
  
  modelOptions: {
    scale: 1.8,
    center: true,
    autoRotate: false,
    rotation: 0,
    fullBodyAvatar: true
  },
  
  onReady: () => console.log('Avatar ready!'),
  onError: (error) => console.error('Error:', error)
})

await avatar.initialize()
avatar.start()
```


## Advanced Configuration Examples

### Blendshape Customization

Fine-tune expression intensity:

```javascript
const avatar = new Aniface({
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
const avatar = new Aniface({
  videoElement,
  canvasElement,
  modelPath: '/models/avatar.glb',
  
  // Camera settings
  cameraConfig: {
    fov: 60,                 // Field of view
    enableControls: true,    // Orbit controls
    enableZoom: false        // Disable zoom
  },
  
  // Lighting settings
  lightingConfig: {
    ambientIntensity: 0.6,              // Ambient light intensity
    directionalIntensity: 0.9,          // Main light intensity
    directionalPosition: [5, 5, 5]      // Light position
  }
})
```

### MediaPipe Configuration

Fine-tune facial detection and tracking:

```javascript
const avatar = new Aniface({
  videoElement,
  canvasElement,
  modelPath: '/models/avatar.glb',
  
  // Optional: Adjust facial tracking sensitivity
  landmarkConfig: {
    minDetectionConfidence: 0.5,      // 0-1: Lower = more detections (default: 0.5)
    minTrackingConfidence: 0.5        // 0-1: Lower = smoother tracking (default: 0.5)
  }
})
```

**Configuration tips:**
- Lower confidence values = more sensitive detection but may be less stable
- Higher confidence values = more stable but may miss subtle movements
- WASM files load from CDN automatically - no `wasmPath` needed unless self-hosting

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

### Aniface Class

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

## License

MIT - see [LICENSE](LICENSE) file for details
