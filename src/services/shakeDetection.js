// ============================================
// Shake Detection Service
// Accelerometer-based shake trigger for SOS
// ============================================

const SHAKE_THRESHOLD = 15;
const SHAKE_TIMEOUT = 1000;
const SHAKE_COUNT_THRESHOLD = 3;

let lastX = 0, lastY = 0, lastZ = 0;
let lastShakeTime = 0;
let shakeCount = 0;
let shakeCallback = null;
let isListening = false;

/**
 * Handle device motion events
 */
function handleMotion(event) {
  const { accelerationIncludingGravity } = event;

  if (!accelerationIncludingGravity) return;

  const { x, y, z } = accelerationIncludingGravity;
  
  const deltaX = Math.abs(x - lastX);
  const deltaY = Math.abs(y - lastY);
  const deltaZ = Math.abs(z - lastZ);

  const totalDelta = deltaX + deltaY + deltaZ;

  if (totalDelta > SHAKE_THRESHOLD) {
    const now = Date.now();

    if (now - lastShakeTime > 300) {
      shakeCount++;

      if (shakeCount >= SHAKE_COUNT_THRESHOLD) {
        shakeCount = 0;

        if (shakeCallback) {
          shakeCallback();
        }
      }

      lastShakeTime = now;
    }
  }

  // Reset shake count after timeout
  if (Date.now() - lastShakeTime > SHAKE_TIMEOUT) {
    shakeCount = 0;
  }

  lastX = x;
  lastY = y;
  lastZ = z;
}

/**
 * Start listening for shake events
 * @param {Function} callback - Function to call when shake is detected
 */
export function startShakeDetection(callback) {
  if (isListening) return;

  shakeCallback = callback;

  // Check if DeviceMotionEvent is supported
  if (typeof DeviceMotionEvent === 'undefined') {
    console.warn('DeviceMotionEvent not supported on this device');
    return false;
  }

  // iOS 13+ requires permission
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then((permission) => {
        if (permission === 'granted') {
          window.addEventListener('devicemotion', handleMotion, true);
          isListening = true;
        }
      })
      .catch(console.error);
  } else {
    window.addEventListener('devicemotion', handleMotion, true);
    isListening = true;
  }

  return true;
}

/**
 * Stop listening for shake events
 */
export function stopShakeDetection() {
  if (!isListening) return;

  window.removeEventListener('devicemotion', handleMotion, true);
  isListening = false;
  shakeCallback = null;
  shakeCount = 0;
}

/**
 * Check if shake detection is currently active
 */
export function isShakeDetectionActive() {
  return isListening;
}

/**
 * Check if device supports motion events
 */
export function isDeviceMotionSupported() {
  return typeof DeviceMotionEvent !== 'undefined';
}
