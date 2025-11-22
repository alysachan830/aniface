import { Aniface } from './src'

let avatar: Aniface | null = null
let webcamStream: MediaStream | null = null
let lastFrameTime = Date.now()
let frameCount = 0

// Avatar type tracking
type AvatarType = 'raccoon' | 'rpm'
let currentAvatarType: AvatarType = 'raccoon'

const webcam = document.getElementById('webcam') as HTMLVideoElement
const canvas = document.getElementById('avatar') as HTMLCanvasElement
const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLDivElement
const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement
const toast = document.getElementById('toast') as HTMLDivElement
const controlReminder = document.getElementById('control-reminder') as HTMLDivElement
const reminderIcon = controlReminder.querySelector('.reminder-icon') as HTMLDivElement
const reminderText = controlReminder.querySelector('.reminder-text') as HTMLSpanElement
const codeTitleTry = document.getElementById('code-title-try') as HTMLHeadingElement
const codeTitleUpdated = document.getElementById('code-title-updated') as HTMLHeadingElement
const tabRaccoon = document.getElementById('tab-raccoon') as HTMLButtonElement
const tabRpm = document.getElementById('tab-rpm') as HTMLButtonElement
const modelNameEl = document.getElementById('model-name') as HTMLSpanElement

// Sliders
const eyeBlinkSlider = document.getElementById('eyeBlink-slider') as HTMLInputElement
const jawOpenSlider = document.getElementById('jawOpen-slider') as HTMLInputElement
const scaleSlider = document.getElementById('scale-slider') as HTMLInputElement

// RPM-only sliders
const ambientIntensitySlider = document.getElementById('ambientIntensity-slider') as HTMLInputElement
const directionalIntensitySlider = document.getElementById('directionalIntensity-slider') as HTMLInputElement

// Checkboxes
const enableControlsCheckbox = document.getElementById('enable-controls-checkbox') as HTMLInputElement
const enableZoomCheckbox = document.getElementById('enable-zoom-checkbox') as HTMLInputElement

// Value displays
const eyeBlinkValue = document.getElementById('eyeBlink-value') as HTMLSpanElement
const jawOpenValue = document.getElementById('jawOpen-value') as HTMLSpanElement
const scaleValue = document.getElementById('scale-value') as HTMLSpanElement

// RPM-only value displays
const ambientIntensityValue = document.getElementById('ambientIntensity-value') as HTMLSpanElement
const directionalIntensityValue = document.getElementById('directionalIntensity-value') as HTMLSpanElement

// Stats
const fpsValue = document.getElementById('fps-value') as HTMLSpanElement

// RPM-only elements
const rpmOnlyElements = document.querySelectorAll('.rpm-only') as NodeListOf<HTMLElement>

// Configuration defaults for Raccoon
const RACCOON_DEFAULTS = {
  eyeBlink: 1.2,
  jawOpen: 1.0,
  smile: 1.1,
  fov: 60,
  scale: 1.0,
  enableControls: false,
  enableZoom: false
}

// Configuration defaults for Ready Player Me
const RPM_DEFAULTS = {
  eyeBlink: 1.3,
  jawOpen: 1.0,
  smile: 1.0,
  browInnerUp: 1.2,
  browOuterUpLeft: 1.2,
  browOuterUpRight: 1.2,
  fov: 60,
  scale: 1.8,
  ambientIntensity: 1.2,
  directionalIntensity: 1.5,
  fullBodyAvatar: true,
  enableControls: false,
  enableZoom: false
}

// Track if avatar is currently tracking
let isCurrentlyTracking = false

// Track timeout for "Updated" status
let codeTitleTimeout: NodeJS.Timeout | null = null

// Track timeout for reminder fade-out
let reminderTimeout: NodeJS.Timeout | null = null

// SVG icons for button states
const stopIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="6" y="6" width="12" height="12"></rect>
</svg>`

const startIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="5 3 19 12 5 21 5 3"></polygon>
</svg>`

// SVG icons for reminders
const dragIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:1;"><path d="M12 2v20m3-3l-3 3l-3-3M19 9l3 3l-3 3M2 12h20M5 9l-3 3l3 3M9 5l3-3l3 3"/></svg>`

const zoomIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:1;"><path d="m15 15l6 6M15 9l6-6m0 13v5h-5m5-13V3h-5M3 16v5h5m-5 0l6-6M3 8V3h5m1 6L3 3"/></svg>`

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

// Show control reminder with custom icon and text, fade out after 4 seconds
function showControlReminder(iconHtml: string, text: string) {
  // Clear any existing timeout
  if (reminderTimeout) {
    clearTimeout(reminderTimeout)
  }
  
  // Update content
  reminderIcon.innerHTML = iconHtml
  reminderText.textContent = text
  
  // Show the reminder
  controlReminder.classList.add('show')
  controlReminder.classList.remove('fade-out')
  
  // Fade out after 4 seconds
  reminderTimeout = setTimeout(() => {
    controlReminder.classList.add('fade-out')
    controlReminder.classList.remove('show')
    reminderTimeout = null
  }, 4000)
}

// Update code viewer with current config values and highlight changes
function updateConfigCode() {
  const currentEyeBlink = parseFloat(eyeBlinkSlider.value)
  const currentJawOpen = parseFloat(jawOpenSlider.value)
  const currentScale = parseFloat(scaleSlider.value)
  const currentEnableControls = enableControlsCheckbox.checked
  const currentEnableZoom = enableZoomCheckbox.checked

  // Get the appropriate defaults based on avatar type
  const defaults = currentAvatarType === 'raccoon' ? RACCOON_DEFAULTS : RPM_DEFAULTS

  // Highlight if different from defaults
  const highlight = (value: number, defaultValue: number) => {
    return value !== defaultValue ? `<span class="code-highlight">${value}</span>` : value
  }

  let code = ''

  if (currentAvatarType === 'raccoon') {
    // Raccoon config (simplified)
    // Build optional cameraConfig properties
    let cameraConfigProps = `    fov: ${RACCOON_DEFAULTS.fov}`
    if (currentEnableControls) {
      cameraConfigProps += `,\n    enableControls: <span class="code-highlight">true</span>`
    }
    if (currentEnableZoom) {
      cameraConfigProps += `,\n    enableZoom: <span class="code-highlight">true</span>`
    }

    code = `const avatar = new Aniface({
  // videoElement: Your HTML video element,
  // canvasElement: Your canvas HTML canvas element,
  // modelPath: Your 3D model GLTF file path,
  cameraConfig: {
${cameraConfigProps}
  },
  blendshapeMultipliers: {
    eyeBlinkLeft: ${highlight(currentEyeBlink, defaults.eyeBlink)},
    eyeBlinkRight: ${highlight(currentEyeBlink, defaults.eyeBlink)},
    jawOpen: ${highlight(currentJawOpen, defaults.jawOpen)},
    mouthSmileLeft: ${RACCOON_DEFAULTS.smile},
    mouthSmileRight: ${RACCOON_DEFAULTS.smile}
  },
  modelOptions: {
    scale: ${highlight(currentScale, defaults.scale)}
  }
})`
  } else {
    // RPM config (full with all RPM-specific settings)
    const currentAmbientIntensity = parseFloat(ambientIntensitySlider.value)
    const currentDirectionalIntensity = parseFloat(directionalIntensitySlider.value)

    // Build optional cameraConfig properties
    let cameraConfigProps = `    fov: ${RPM_DEFAULTS.fov}`
    if (currentEnableControls) {
      cameraConfigProps += `,\n    enableControls: <span class="code-highlight">true</span>`
    }
    if (currentEnableZoom) {
      cameraConfigProps += `,\n    enableZoom: <span class="code-highlight">true</span>`
    }

    code = `const avatar = new Aniface({
  // videoElement: Your HTML video element,
  // canvasElement: Your canvas HTML canvas element,
  modelPath: 'https://models.readyplayer.me/[YOUR_ID].glb?morphTargets=ARKit&useHands=false',
  cameraConfig: {
${cameraConfigProps}
  },
  blendshapeMultipliers: {
    eyeBlinkLeft: ${highlight(currentEyeBlink, RPM_DEFAULTS.eyeBlink)},
    eyeBlinkRight: ${highlight(currentEyeBlink, RPM_DEFAULTS.eyeBlink)},
    browInnerUp: ${RPM_DEFAULTS.browInnerUp},
    browOuterUpLeft: ${RPM_DEFAULTS.browOuterUpLeft},
    browOuterUpRight: ${RPM_DEFAULTS.browOuterUpRight},
    jawOpen: ${highlight(currentJawOpen, RPM_DEFAULTS.jawOpen)},
    mouthSmileLeft: ${RPM_DEFAULTS.smile},
    mouthSmileRight: ${RPM_DEFAULTS.smile}
  },
  lightingConfig: {
    ambientIntensity: ${highlight(currentAmbientIntensity, RPM_DEFAULTS.ambientIntensity)},
    directionalIntensity: ${highlight(currentDirectionalIntensity, RPM_DEFAULTS.directionalIntensity)},
    directionalPosition: [2, 3, 3]
  },
  modelOptions: {
    scale: ${highlight(currentScale, RPM_DEFAULTS.scale)},
    center: true,
    autoRotate: false,
    rotation: 0,
    fullBodyAvatar: true
  }
})`
  }

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
    
    // Determine model path based on avatar type
    const modelPath = currentAvatarType === 'raccoon' 
      ? './raccoon_head_small.glb'
      : 'https://models.readyplayer.me/691d84f37b7a88e1f63abd3b.glb?morphTargets=ARKit&useHands=false'
    
    // Build blendshape multipliers based on avatar type
    const defaults = currentAvatarType === 'raccoon' ? RACCOON_DEFAULTS : RPM_DEFAULTS
    const blendshapeMultipliers: any = {
      eyeBlinkLeft: parseFloat(eyeBlinkSlider.value),
      eyeBlinkRight: parseFloat(eyeBlinkSlider.value),
      jawOpen: parseFloat(jawOpenSlider.value),
      mouthSmileLeft: defaults.smile,
      mouthSmileRight: defaults.smile
    }
    
    // Add RPM-specific blendshape multipliers (hardcoded values)
    if (currentAvatarType === 'rpm') {
      blendshapeMultipliers.browInnerUp = RPM_DEFAULTS.browInnerUp
      blendshapeMultipliers.browOuterUpLeft = RPM_DEFAULTS.browOuterUpLeft
      blendshapeMultipliers.browOuterUpRight = RPM_DEFAULTS.browOuterUpRight
    }
    
    // Build model options based on avatar type
    const modelOptions: any = {
      scale: scaleValue
    }
    
    // Add RPM-specific model options
    if (currentAvatarType === 'rpm') {
      modelOptions.center = true
      modelOptions.autoRotate = false
      modelOptions.rotation = 0
      modelOptions.fullBodyAvatar = RPM_DEFAULTS.fullBodyAvatar
    }
    
    // Build config object
    const config: any = {
      videoElement: webcam,
      canvasElement: canvas,
      modelPath: modelPath,
      
      // Camera configuration
      cameraConfig: {
        fov: defaults.fov,
        enableControls: controlsEnabled,
        enableZoom: zoomEnabled
      },
      
      // Blendshape adjustments
      blendshapeMultipliers: blendshapeMultipliers,
      
      // Model options
      modelOptions: modelOptions,
      
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
      
      onError: (error: Error) => {
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
    }
    
    // Add RPM-specific lighting config
    if (currentAvatarType === 'rpm') {
      config.lightingConfig = {
        ambientIntensity: parseFloat(ambientIntensitySlider.value),
        directionalIntensity: parseFloat(directionalIntensitySlider.value),
        directionalPosition: [2, 3, 3]
      }
    }
    
    avatar = new Aniface(config)
    
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

// Switch between Raccoon and RPM avatars
function switchAvatar(avatarType: AvatarType) {
  // Don't switch if already selected
  if (currentAvatarType === avatarType) return
  
  // Update avatar type
  currentAvatarType = avatarType
  
  // Update tab active states
  if (avatarType === 'raccoon') {
    tabRaccoon.classList.add('active')
    tabRpm.classList.remove('active')
  } else {
    tabRaccoon.classList.remove('active')
    tabRpm.classList.add('active')
  }
  
  // Get the appropriate defaults
  const defaults = currentAvatarType === 'raccoon' ? RACCOON_DEFAULTS : RPM_DEFAULTS
  
  // Show/hide RPM-only controls
  rpmOnlyElements.forEach(element => {
    element.style.display = currentAvatarType === 'rpm' ? 'block' : 'none'
  })
  
  // Update all sliders and displays to defaults
  eyeBlinkSlider.value = defaults.eyeBlink.toString()
  eyeBlinkValue.textContent = `${defaults.eyeBlink.toFixed(1)}x`
  
  jawOpenSlider.value = defaults.jawOpen.toString()
  jawOpenValue.textContent = `${defaults.jawOpen.toFixed(1)}x`
  
  scaleSlider.value = defaults.scale.toString()
  scaleValue.textContent = `${defaults.scale.toFixed(1)}x`
  
  enableControlsCheckbox.checked = defaults.enableControls
  enableZoomCheckbox.checked = defaults.enableZoom
  
  // Update RPM-only sliders if switching to RPM
  if (currentAvatarType === 'rpm') {
    ambientIntensitySlider.value = RPM_DEFAULTS.ambientIntensity.toString()
    ambientIntensityValue.textContent = `${RPM_DEFAULTS.ambientIntensity.toFixed(1)}x`
    
    directionalIntensitySlider.value = RPM_DEFAULTS.directionalIntensity.toString()
    directionalIntensityValue.textContent = `${RPM_DEFAULTS.directionalIntensity.toFixed(1)}x`
  }
  
  // Update model name in stats
  modelNameEl.textContent = currentAvatarType === 'raccoon' ? 'Raccoon' : 'Ready Player Me'
  
  // Reinitialize avatar with new configuration
  updateAvatarConfig()
}

// Set canvas size explicitly BEFORE initialization
canvas.width = 800
canvas.height = 600

// Event listeners
toggleBtn.addEventListener('click', toggleTracking)
tabRaccoon.addEventListener('click', () => switchAvatar('raccoon'))
tabRpm.addEventListener('click', () => switchAvatar('rpm'))

// Slider event listeners - update avatar in real-time with throttling
eyeBlinkSlider.addEventListener('input', () => {
  eyeBlinkValue.textContent = `${parseFloat(eyeBlinkSlider.value).toFixed(1)}x`
  throttledUpdateAvatar()
})

jawOpenSlider.addEventListener('input', () => {
  jawOpenValue.textContent = `${parseFloat(jawOpenSlider.value).toFixed(1)}x`
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
    showControlReminder(dragIcon, 'Drag to move the camera!')
  }
  throttledUpdateAvatar()
})

enableZoomCheckbox.addEventListener('change', () => {
  // Show reminder when enabling zoom
  if (enableZoomCheckbox.checked) {
    showControlReminder(zoomIcon, 'Zoom in and out!')
  }
  throttledUpdateAvatar()
})

// RPM-only slider event listeners
ambientIntensitySlider.addEventListener('input', () => {
  ambientIntensityValue.textContent = `${parseFloat(ambientIntensitySlider.value).toFixed(1)}x`
  throttledUpdateAvatar()
})

directionalIntensitySlider.addEventListener('input', () => {
  directionalIntensityValue.textContent = `${parseFloat(directionalIntensitySlider.value).toFixed(1)}x`
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

