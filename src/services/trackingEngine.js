// ============================================
// Tracking Engine - Production-Ready Location System
// Battery-efficient, high-accuracy GPS tracking
// Similar to Rapido/Uber with emergency enhancements
// ============================================

import { calculateDistance } from './locationService';

/**
 * Adaptive tracking modes based on context
 * Each mode optimizes for different scenarios
 */
export const TRACKING_MODES = {
  EMERGENCY: {
    name: 'Emergency',
    interval: 2000,        // 2s updates  
    distanceFilter: 3,     // 3m minimum movement
    accuracy: 'high',
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 0,        // Always fresh
    batteryOptimized: false,
  },
  ACTIVE: {
    name: 'Active',
    interval: 5000,        // 5s updates
    distanceFilter: 10,    // 10m minimum movement
    accuracy: 'high',
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 2000,
    batteryOptimized: false,
  },
  WALKING: {
    name: 'Walking',
    interval: 8000,        // 8s updates
    distanceFilter: 15,    // 15m minimum movement
    accuracy: 'medium',
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000,
    batteryOptimized: true,
  },
  STATIONARY: {
    name: 'Stationary',
    interval: 30000,       // 30s updates
    distanceFilter: 50,    // 50m minimum movement
    accuracy: 'low',
    enableHighAccuracy: false,
    timeout: 20000,
    maximumAge: 15000,
    batteryOptimized: true,
  },
};

/**
 * Smart adaptive tracking engine class
 * Automatically adjusts tracking parameters based on movement patterns
 */
export class TrackingEngine {
  constructor(options = {}) {
    this.mode = options.initialMode || TRACKING_MODES.EMERGENCY;
    this.onLocationUpdate = options.onLocationUpdate || (() => {});
    this.onModeChange = options.onModeChange || (() => {});
    this.onError = options.onError || (() => {});
    this.onBatteryWarning = options.onBatteryWarning || (() => {});

    // Internal state
    this._watchId = null;
    this._intervalId = null;
    this._heartbeatId = null;
    this._isRunning = false;
    this._lastPosition = null;
    this._lastBroadcastPosition = null;
    this._lastBroadcastTime = 0;
    this._positionBuffer = [];
    this._speedHistory = [];
    this._stationaryCount = 0;
    this._movingCount = 0;
    this._startTime = null;
    this._totalDistance = 0;
    this._updateCount = 0;
    this._batteryLevel = null;
    this._autoAdaptive = options.autoAdaptive !== false;
    this._emergencyMode = options.emergencyMode || false;
    this._maxBufferSize = 200;

    // Geofence support
    this._geofences = [];
    this._onGeofenceExit = options.onGeofenceExit || (() => {});

    // Initialize battery monitoring
    this._initBatteryMonitor();
  }

  /**
   * Start the tracking engine
   */
  start() {
    if (this._isRunning) return;
    if (!navigator.geolocation) {
      this.onError(new Error('Geolocation not supported'));
      return;
    }

    this._isRunning = true;
    this._startTime = Date.now();
    this._startWatching();
    
    console.log(`🛰️ TrackingEngine started [Mode: ${this.mode.name}]`);
  }

  /**
   * Stop the tracking engine
   */
  stop() {
    this._isRunning = false;
    this._stopWatching();
    this._startTime = null;
    console.log('🛑 TrackingEngine stopped');
  }

  /**
   * Force an immediate location update
   */
  async forceUpdate() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = this._processPosition(position);
          resolve(loc);
        },
        (err) => {
          this.onError(err);
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Set tracking mode manually
   */
  setMode(mode) {
    const prevMode = this.mode;
    this.mode = mode;
    
    if (this._isRunning) {
      this._stopWatching();
      this._startWatching();
    }

    if (prevMode.name !== mode.name) {
      this.onModeChange(mode, prevMode);
    }
  }

  /**
   * Enable emergency mode (highest accuracy, fastest updates)
   */
  enableEmergencyMode() {
    this._emergencyMode = true;
    this._autoAdaptive = false;
    this.setMode(TRACKING_MODES.EMERGENCY);
  }

  /**
   * Disable emergency mode, return to adaptive
   */
  disableEmergencyMode() {
    this._emergencyMode = false;
    this._autoAdaptive = true;
  }

  /**
   * Add a geofence (for safe zone alerts)
   */
  addGeofence(id, center, radiusMeters) {
    this._geofences.push({ id, center, radius: radiusMeters, inside: true });
  }

  /**
   * Remove a geofence
   */
  removeGeofence(id) {
    this._geofences = this._geofences.filter(g => g.id !== id);
  }

  /**
   * Get aggregate tracking stats
   */
  getStats() {
    const duration = this._startTime ? Date.now() - this._startTime : 0;
    const avgSpeed = this._speedHistory.length > 0
      ? this._speedHistory.reduce((a, b) => a + b, 0) / this._speedHistory.length
      : 0;

    return {
      isRunning: this._isRunning,
      mode: this.mode.name,
      duration,
      totalDistance: this._totalDistance,
      updateCount: this._updateCount,
      averageSpeed: avgSpeed,
      lastPosition: this._lastPosition,
      bufferSize: this._positionBuffer.length,
      batteryLevel: this._batteryLevel,
    };
  }

  /**
   * Get the full position trail/history
   */
  getTrail() {
    return [...this._positionBuffer];
  }

  // ─── Private Methods ────────────────────────────────────

  _startWatching() {
    // Use watchPosition for continuous tracking
    this._watchId = navigator.geolocation.watchPosition(
      (position) => this._handlePositionUpdate(position),
      (error) => this._handleError(error),
      {
        enableHighAccuracy: this.mode.enableHighAccuracy,
        timeout: this.mode.timeout,
        maximumAge: this.mode.maximumAge,
      }
    );

    // Supplementary interval for guaranteed updates
    this._intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => this._handlePositionUpdate(position),
        () => {}, // Silently fail on interval fallbacks
        {
          enableHighAccuracy: this.mode.enableHighAccuracy,
          timeout: this.mode.timeout,
          maximumAge: this.mode.maximumAge,
        }
      );
    }, this.mode.interval);

    // Heartbeat: re-broadcast last known position periodically
    // This ensures newly-joined viewers always get a location,
    // even if the sender is stationary and the distance filter
    // is blocking GPS updates.
    const heartbeatInterval = this._emergencyMode ? 10000 : 20000;
    this._heartbeatId = setInterval(() => {
      if (this._lastBroadcastPosition) {
        const timeSinceBroadcast = Date.now() - this._lastBroadcastTime;
        // Re-broadcast if no update was sent recently
        if (timeSinceBroadcast >= heartbeatInterval - 1000) {
          this._updateCount++;
          this.onLocationUpdate({
            ...this._lastBroadcastPosition,
            timestamp: Date.now(),
          });
          this._lastBroadcastTime = Date.now();
        }
      }
    }, heartbeatInterval);
  }

  _stopWatching() {
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    if (this._heartbeatId) {
      clearInterval(this._heartbeatId);
      this._heartbeatId = null;
    }
  }

  _handlePositionUpdate(position) {
    const loc = this._processPosition(position);
    if (!loc) return; // Filtered out by distance filter

    this._updateCount++;
    this._lastBroadcastPosition = loc;
    this._lastBroadcastTime = Date.now();
    this.onLocationUpdate(loc);

    // Check geofences
    this._checkGeofences(loc);

    // Auto-adapt mode based on movement
    if (this._autoAdaptive && !this._emergencyMode) {
      this._adaptMode(loc);
    }
  }

  _processPosition(position) {
    const coords = position.coords;
    const loc = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
      timestamp: position.timestamp || Date.now(),
    };

    // Distance filter — skip if barely moved
    // BUT: always send the first position AND periodically allow
    // updates through even when stationary (for newly-joined viewers)
    if (this._lastPosition) {
      const dist = calculateDistance(
        this._lastPosition.latitude,
        this._lastPosition.longitude,
        loc.latitude,
        loc.longitude
      ) * 1000; // Convert km to meters

      const timeSinceLastBroadcast = Date.now() - this._lastBroadcastTime;
      // In emergency mode, force through every 10s even if stationary
      // In other modes, force through every 30s
      const forceInterval = this._emergencyMode ? 10000 : 30000;
      const shouldForce = timeSinceLastBroadcast >= forceInterval;

      if (dist < this.mode.distanceFilter && !shouldForce) {
        return null; // Skip update — hasn't moved enough and not due for heartbeat
      }

      this._totalDistance += dist / 1000; // km
    }

    // Record speed
    if (loc.speed !== null && loc.speed !== undefined && loc.speed >= 0) {
      this._speedHistory.push(loc.speed);
      if (this._speedHistory.length > 30) this._speedHistory.shift();
    }

    // Buffer position
    this._positionBuffer.push({
      ...loc,
      recordedAt: Date.now(),
    });
    if (this._positionBuffer.length > this._maxBufferSize) {
      this._positionBuffer.shift();
    }

    this._lastPosition = loc;
    return loc;
  }

  _adaptMode(loc) {
    const speed = loc.speed || 0;
    const speedKmh = speed * 3.6;

    // Determine movement state
    if (speedKmh < 1) {
      this._stationaryCount++;
      this._movingCount = 0;
    } else {
      this._movingCount++;
      this._stationaryCount = 0;
    }

    // Adapt mode based on sustained patterns
    if (this._stationaryCount > 5 && this.mode !== TRACKING_MODES.STATIONARY) {
      this.setMode(TRACKING_MODES.STATIONARY);
    } else if (this._movingCount > 3 && speedKmh < 8 && this.mode !== TRACKING_MODES.WALKING) {
      this.setMode(TRACKING_MODES.WALKING);
    } else if (this._movingCount > 3 && speedKmh >= 8 && this.mode !== TRACKING_MODES.ACTIVE) {
      this.setMode(TRACKING_MODES.ACTIVE);
    }

    // Battery-based downgrade
    if (this._batteryLevel !== null && this._batteryLevel < 0.15 && !this._emergencyMode) {
      if (this.mode !== TRACKING_MODES.STATIONARY) {
        this.setMode(TRACKING_MODES.STATIONARY);
        this.onBatteryWarning(this._batteryLevel);
      }
    }
  }

  _checkGeofences(loc) {
    for (const fence of this._geofences) {
      const dist = calculateDistance(
        fence.center.latitude,
        fence.center.longitude,
        loc.latitude,
        loc.longitude
      ) * 1000; // meters

      const isInside = dist <= fence.radius;

      // Detect exit
      if (fence.inside && !isInside) {
        fence.inside = false;
        this._onGeofenceExit({
          fenceId: fence.id,
          center: fence.center,
          radius: fence.radius,
          location: loc,
          distance: dist,
        });
      } else if (!fence.inside && isInside) {
        fence.inside = true;
      }
    }
  }

  _handleError(error) {
    // Auto-retry with lower accuracy on timeout
    if (error.code === error.TIMEOUT && this.mode.enableHighAccuracy) {
      navigator.geolocation.getCurrentPosition(
        (position) => this._handlePositionUpdate(position),
        (err) => this.onError(err),
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 10000,
        }
      );
      return;
    }
    this.onError(error);
  }

  async _initBatteryMonitor() {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        this._batteryLevel = battery.level;
        battery.addEventListener('levelchange', () => {
          this._batteryLevel = battery.level;
        });
      }
    } catch (e) {
      // Battery API not available
    }
  }
}

/**
 * Smooth location interpolation for map animations
 * Creates smooth marker movement between GPS updates
 */
export class LocationInterpolator {
  constructor() {
    this._from = null;
    this._to = null;
    this._progress = 0;
    this._animationId = null;
    this._duration = 1000; // 1 second interpolation
  }

  /**
   * Update target location and animate to it
   */
  updateTarget(newLocation, onFrame) {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
    }

    this._from = this._to || newLocation;
    this._to = newLocation;
    this._progress = 0;

    const startTime = performance.now();

    const animate = (currentTime) => {
      this._progress = Math.min((currentTime - startTime) / this._duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - this._progress, 3);

      const interpolated = {
        latitude: this._from.latitude + (this._to.latitude - this._from.latitude) * eased,
        longitude: this._from.longitude + (this._to.longitude - this._from.longitude) * eased,
        heading: this._lerpAngle(this._from.heading || 0, this._to.heading || 0, eased),
        speed: this._to.speed,
        accuracy: this._to.accuracy,
        timestamp: this._to.timestamp,
      };

      onFrame(interpolated);

      if (this._progress < 1) {
        this._animationId = requestAnimationFrame(animate);
      }
    };

    this._animationId = requestAnimationFrame(animate);
  }

  stop() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }

  _lerpAngle(a, b, t) {
    let delta = ((b - a + 540) % 360) - 180;
    return a + delta * t;
  }
}

/**
 * Location trail recorder with path simplification
 */
export class TrailRecorder {
  constructor(maxPoints = 500) {
    this._trail = [];
    this._maxPoints = maxPoints;
  }

  addPoint(location) {
    this._trail.push({
      lat: location.latitude,
      lng: location.longitude,
      timestamp: location.timestamp || Date.now(),
      speed: location.speed,
      accuracy: location.accuracy,
    });

    // Trim to max
    if (this._trail.length > this._maxPoints) {
      // Use Douglas-Peucker simplification
      this._simplify();
    }
  }

  getTrail() {
    return [...this._trail];
  }

  getTrailAsLatLngs() {
    return this._trail.map(p => [p.lat, p.lng]);
  }

  clear() {
    this._trail = [];
  }

  /**
   * Simple path simplification — keep every Nth point when over limit
   */
  _simplify() {
    if (this._trail.length <= this._maxPoints) return;
    
    const keepEvery = Math.ceil(this._trail.length / (this._maxPoints * 0.8));
    const simplified = [];
    
    for (let i = 0; i < this._trail.length; i++) {
      if (i === 0 || i === this._trail.length - 1 || i % keepEvery === 0) {
        simplified.push(this._trail[i]);
      }
    }
    
    this._trail = simplified;
  }
}
