import { FacialAvatar } from './src'

let avatar: FacialAvatar | null = null
let webcamStream: MediaStream | null = null
let lastFrameTime = Date.now()
let frameCount = 0

const webcam = document.getElementById('webcam') as HTMLVideoElement
const canvas = document.getElementById('avatar') as HTMLCanvasElement
const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLDivElement
const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement
const toast = document.getElementById('toast') as HTMLDivElement
const cameraControlsReminder = document.getElementById('camera-controls-reminder') as HTMLDivElement
const codeTitleTry = document.getElementById('code-title-try') as HTMLHeadingElement
const codeTitleUpdated = document.getElementById('code-title-updated') as HTMLHeadingElement

// Sliders
const eyeBlinkSlider = document.getElementById('eyeBlink-slider') as HTMLInputElement
const jawOpenSlider = document.getElementById('jawOpen-slider') as HTMLInputElement
const smileSlider = document.getElementById('smile-slider') as HTMLInputElement
const fovSlider = document.getElementById('fov-slider') as HTMLInputElement
const scaleSlider = document.getElementById('scale-slider') as HTMLInputElement

// Checkboxes
const enableControlsCheckbox = document.getElementById('enable-controls-checkbox') as HTMLInputElement
const enableZoomCheckbox = document.getElementById('enable-zoom-checkbox') as HTMLInputElement

// Value displays
const eyeBlinkValue = document.getElementById('eyeBlink-value') as HTMLSpanElement
const jawOpenValue = document.getElementById('jawOpen-value') as HTMLSpanElement
const smileValue = document.getElementById('smile-value') as HTMLSpanElement
const fovValue = document.getElementById('fov-value') as HTMLSpanElement
const scaleValue = document.getElementById('scale-value') as HTMLSpanElement

// Stats
const fpsValue = document.getElementById('fps-value') as HTMLSpanElement

// Original config for comparison (never changes)
const ORIGINAL_CONFIG = {
  eyeBlink: 1.2,
  jawOpen: 1.0,
  smile: 1.1,
  fov: 60,
  scale: 1.0
}

// Track if avatar is currently tracking
let isCurrentlyTracking = false

// Track timeout for "Updated" status
let codeTitleTimeout: NodeJS.Timeout | null = null

// SVG icons for button states
const stopIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="6" y="6" width="12" height="12"></rect>
</svg>`

const startIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="5 3 19 12 5 21 5 3"></polygon>
</svg>`

// Set canvas size immediately to prevent initialization override
canvas.width = 800
canvas.height = 600

// Status helper
function setStatus(message: string, type: 'loading' | 'success' | 'error' | 'warning' = 'loading') {
  statusEl.className = `status status-${type}`
  
  if (type === 'loading') {
    statusEl.innerHTML = `<div class="spinner"></div><span>${message}</span>`
  } else {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }
    statusEl.innerHTML = `<span>${icons[type] || ''} ${message}</span>`
  }
}

// Throttle utility - limits function calls to once per 500ms
function throttle(func: (...args: any[]) => void, delay: number) {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0
  
  return function(this: any, ...args: any[]) {
    const currentTime = Date.now()
    const timeSinceLastExec = currentTime - lastExecTime
    
    if (timeSinceLastExec >= delay) {
      func.apply(this, args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func.apply(this, args)
        lastExecTime = Date.now()
      }, delay - timeSinceLastExec)
    }
  }
}

// Show "Updated" status and revert back to "Try now" after 2 seconds
function showUpdatedStatus() {
  // Clear any existing timeout
  if (codeTitleTimeout) {
    clearTimeout(codeTitleTimeout)
  }
  
  // Hide "Try now", show "Updated"
  codeTitleTry.classList.remove('code-title-visible')
  codeTitleTry.classList.add('code-title-hidden')
  codeTitleUpdated.classList.remove('code-title-hidden')
  codeTitleUpdated.classList.add('code-title-visible')
  
  // Revert back after 2 seconds
  codeTitleTimeout = setTimeout(() => {
    codeTitleTry.classList.remove('code-title-hidden')
    codeTitleTry.classList.add('code-title-visible')
    codeTitleUpdated.classList.remove('code-title-visible')
    codeTitleUpdated.classList.add('code-title-hidden')
    codeTitleTimeout = null
  }, 2000)
}

// Show camera controls reminder and fade out after 4 seconds
function showCameraControlsReminder() {
  // Show the reminder
  cameraControlsReminder.classList.add('show')
  cameraControlsReminder.classList.remove('fade-out')
  
  // Fade out after 4 seconds
  setTimeout(() => {
    cameraControlsReminder.classList.add('fade-out')
    cameraControlsReminder.classList.remove('show')
  }, 4000)
}

// Update code viewer with current config values and highlight changes
function updateConfigCode() {
  const currentEyeBlink = parseFloat(eyeBlinkSlider.value)
  const currentJawOpen = parseFloat(jawOpenSlider.value)
  const currentSmile = parseFloat(smileSlider.value)
  const currentFov = parseInt(fovSlider.value)
  const currentScale = parseFloat(scaleSlider.value)
  const currentEnableControls = enableControlsCheckbox.checked
  const currentEnableZoom = enableZoomCheckbox.checked

  // Highlight if different from ORIGINAL config
  const highlight = (value: number, originalValue: number) => {
    return value !== originalValue ? `<span class="code-highlight">${value}</span>` : value
  }

  // Build optional cameraConfig properties
  let cameraConfigProps = `    fov: ${highlight(currentFov, ORIGINAL_CONFIG.fov)}`
  if (currentEnableControls) {
    cameraConfigProps += `,\n    enableControls: <span class="code-highlight">true</span>`
  }
  if (currentEnableZoom) {
    cameraConfigProps += `,\n    enableZoom: <span class="code-highlight">true</span>`
  }

  const code = `const avatar = new FacialAvatar({
  // videoElement: Your HTML video element,
  // canvasElement: Your canvas HTML canvas element,
  // modelPath: Your 3D model GLTF file path,
  cameraConfig: {
${cameraConfigProps}
  },
  blendshapeMultipliers: {
    eyeBlinkLeft: ${highlight(currentEyeBlink, ORIGINAL_CONFIG.eyeBlink)},
    eyeBlinkRight: ${highlight(currentEyeBlink, ORIGINAL_CONFIG.eyeBlink)},
    jawOpen: ${highlight(currentJawOpen, ORIGINAL_CONFIG.jawOpen)},
    mouthSmileLeft: ${highlight(currentSmile, ORIGINAL_CONFIG.smile)},
    mouthSmileRight: ${highlight(currentSmile, ORIGINAL_CONFIG.smile)}
  },
  modelOptions: {
    scale: ${highlight(currentScale, ORIGINAL_CONFIG.scale)}
  }
})`

  document.getElementById('config-code')!.innerHTML = code
  
  // Show "Updated" status
  showUpdatedStatus()
}

// Update avatar configuration in real-time
async function updateAvatarConfig() {
  if (!avatar) return
  
  // Show updating status
  setStatus('Updating configuration...', 'loading')
  
  // Stop and destroy current avatar
  if (isCurrentlyTracking) {
    avatar.stop()
  }
  avatar.destroy()
  avatar = null
  
  // Reinitialize with new config (will auto-start tracking in onReady callback)
  await initAvatar()
  
  // Update code viewer
  updateConfigCode()
}

// Create throttled version (500ms delay)
const throttledUpdateAvatar = throttle(updateAvatarConfig, 500)

// Initialize webcam
async function initWebcam(): Promise<boolean> {
  try {
    setStatus('Requesting camera access...', 'loading')
    
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    })
    
    webcam.srcObject = webcamStream
    
    // Wait for video to be ready
    await new Promise<void>((resolve) => {
      webcam.onloadedmetadata = () => resolve()
    })
    
    console.log('✅ Webcam initialized')
    return true
  } catch (error) {
    console.error('Failed to access webcam:', error)
    setStatus('Camera access denied. Please allow camera access.', 'error')
    return false
  }
}

// Initialize avatar system
async function initAvatar() {
  try {
    setStatus('Loading avatar system...', 'loading')
    
    const scaleValue = parseFloat(scaleSlider.value)
    const controlsEnabled = enableControlsCheckbox.checked
    const zoomEnabled = enableZoomCheckbox.checked
    
    avatar = new FacialAvatar({
      videoElement: webcam,
      canvasElement: canvas,
      modelPath: './examples/raccoon_head_small.glb',
      
      // Camera configuration
      cameraConfig: {
        fov: parseInt(fovSlider.value),
        enableControls: controlsEnabled,
        enableZoom: zoomEnabled
      },
      
      // Blendshape adjustments
      blendshapeMultipliers: {
        eyeBlinkLeft: parseFloat(eyeBlinkSlider.value),
        eyeBlinkRight: parseFloat(eyeBlinkSlider.value),
        jawOpen: parseFloat(jawOpenSlider.value),
        mouthSmileLeft: parseFloat(smileSlider.value),
        mouthSmileRight: parseFloat(smileSlider.value)
      },
      
      // Model options (read from UI)
      modelOptions: {
        scale: scaleValue
      },
      
      onReady: () => {
        console.log('✅ Avatar ready')
        // Force canvas size to 800x600
        canvas.width = 800
        canvas.height = 600
        canvas.style.width = '800px'
        canvas.style.height = '600px'
        if (avatar) {
          avatar.updateSize(800, 600)
          
          // Start tracking automatically
          avatar.start()
          isCurrentlyTracking = true
          setStatus('Tracking active - Move your face!', 'success')
          
          // Update button state
          toggleBtn.innerHTML = `${stopIcon}Stop tracking`
          toggleBtn.className = 'btn-secondary'
          toggleBtn.disabled = false
          
          // Update code viewer to reflect current config
          updateConfigCode()
        }
      },
      
      onError: (error) => {
        console.error('Avatar error:', error)
        setStatus(`Error: ${error.message}`, 'error')
      },
      
      onLandmarksDetected: () => {
        // Update FPS counter
        frameCount++
        const now = Date.now()
        const elapsed = now - lastFrameTime
        
        // Update FPS every 500ms
        if (elapsed >= 500) {
          const fps = Math.round((frameCount * 1000) / elapsed)
          fpsValue.textContent = fps.toString()
          frameCount = 0
          lastFrameTime = now
        }
      },
      
      onNoFaceDetected: () => {
        console.warn('No face detected')
      }
    })
    
    await avatar.initialize()
    
  } catch (error) {
    console.error('Failed to initialize avatar:', error)
    setStatus(`Initialization failed: ${(error as Error).message}`, 'error')
  }
}

// Toggle tracking on/off
function toggleTracking() {
  if (!avatar) return
  
  if (isCurrentlyTracking) {
    // Stop tracking
    avatar.stop()
    isCurrentlyTracking = false
    setStatus('Tracking paused', 'warning')
    
    // Reset FPS display
    fpsValue.textContent = '--'
    frameCount = 0
    lastFrameTime = Date.now()
    
    // Update button to "Start tracking"
    toggleBtn.innerHTML = `${startIcon}Start tracking`
    toggleBtn.className = 'btn-primary'
  } else {
    // Start tracking
    avatar.start()
    isCurrentlyTracking = true
    setStatus('Tracking active - Move your face!', 'success')
    
    // Update button to "Stop tracking"
    toggleBtn.innerHTML = `${stopIcon}Stop tracking`
    toggleBtn.className = 'btn-secondary'
  }
}

// Set canvas size explicitly BEFORE initialization
canvas.width = 800
canvas.height = 600

// Event listeners
toggleBtn.addEventListener('click', toggleTracking)

// Slider event listeners - update avatar in real-time with throttling
eyeBlinkSlider.addEventListener('input', () => {
  eyeBlinkValue.textContent = `${parseFloat(eyeBlinkSlider.value).toFixed(1)}x`
  throttledUpdateAvatar()
})

jawOpenSlider.addEventListener('input', () => {
  jawOpenValue.textContent = `${parseFloat(jawOpenSlider.value).toFixed(1)}x`
  throttledUpdateAvatar()
})

smileSlider.addEventListener('input', () => {
  smileValue.textContent = `${parseFloat(smileSlider.value).toFixed(1)}x`
  throttledUpdateAvatar()
})

fovSlider.addEventListener('input', () => {
  fovValue.textContent = `${parseInt(fovSlider.value)}°`
  throttledUpdateAvatar()
})

scaleSlider.addEventListener('input', () => {
  const newScale = parseFloat(scaleSlider.value)
  scaleValue.textContent = `${newScale.toFixed(1)}x`
  throttledUpdateAvatar()
})

// Checkbox event listeners
enableControlsCheckbox.addEventListener('change', () => {
  // Show reminder when enabling camera controls
  if (enableControlsCheckbox.checked) {
    showCameraControlsReminder()
  }
  throttledUpdateAvatar()
})

enableZoomCheckbox.addEventListener('change', () => {
  throttledUpdateAvatar()
})

// Copy button functionality
copyBtn.addEventListener('click', () => {
  // Get the text content (without HTML tags) for copying
  const codeElement = document.getElementById('config-code')!
  const codeText = codeElement.textContent
  
  navigator.clipboard.writeText(codeText!).then(() => {
    // Show toast notification
    toast.classList.add('show')
    setTimeout(() => {
      toast.classList.remove('show')
    }, 2000)
  }).catch(err => {
    console.error('Failed to copy:', err)
  })
})

// Handle window resize
window.addEventListener('resize', () => {
  if (avatar) {
    canvas.width = 800
    canvas.height = 600
    avatar.updateSize(800, 600)
  }
})

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (avatar) {
    avatar.destroy()
  }
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop())
  }
})

// Initialize everything
async function init() {
  const webcamOk = await initWebcam()
  if (webcamOk) {
    await initAvatar()
  }
}

// Start initialization
init()

