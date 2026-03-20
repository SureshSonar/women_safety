// ============================================
// Live Tracking Service - Production-Ready
// Supabase Realtime Broadcast + localStorage fallback
// Handles real-time location broadcasting & receiving
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { TrackingEngine, TRACKING_MODES, LocationInterpolator, TrailRecorder } from './trackingEngine';

// ─── Session State ──────────────────────────────────────

let activeEngine = null;
let activeChannel = null;
let activeSessionId = null;
let trailRecorder = null;

/**
 * Generates a unique secure tracking session ID
 */
export const createTrackingSession = () => {
  return uuidv4();
};

/**
 * Generate a shareable tracking link
 */
export const getTrackingLink = (sessionId) => {
  let baseUrl = window.location.origin;
  if (baseUrl.includes('localhost') || baseUrl.includes('capacitor://') || baseUrl.startsWith('file://')) {
    baseUrl = 'https://women-safety-indol.vercel.app';
  }
  return `${baseUrl}/track/${sessionId}`;
};

// ─── Broadcasting (Sender Side) ─────────────────────────

/**
 * Starts broadcasting the user's location continuously
 * Uses Supabase Realtime Broadcast with localStorage fallback
 * 
 * @param {string} sessionId - Unique session identifier 
 * @param {Object} options - Configuration options
 * @returns {Object} Control object with stop(), getStats(), getTrail()
 */
export const startBroadcasting = (sessionId, options = {}) => {
  if (activeEngine) {
    stopBroadcasting(activeSessionId);
  }

  activeSessionId = sessionId;
  trailRecorder = new TrailRecorder(500);

  // Set up Supabase Realtime Channel (Broadcast mode)
  const channelName = `tracking:${sessionId}`;
  let supabaseReady = false;

  if (isSupabaseConfigured) {
    try {
      activeChannel = supabase.channel(channelName, {
        config: {
          broadcast: {
            self: false, // Don't echo back to sender
          },
        },
      });

      activeChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          supabaseReady = true;
          console.log(`📡 Supabase Realtime channel subscribed: ${channelName}`);
        }
      });
    } catch (err) {
      console.warn('Supabase Realtime unavailable, using localStorage fallback:', err);
    }
  }

  // Broadcast function — sends via both channels for reliability
  const broadcastLocation = (location) => {
    const payload = {
      lat: location.latitude,
      lng: location.longitude,
      accuracy: location.accuracy,
      speed: location.speed || 0,
      heading: location.heading || 0,
      altitude: location.altitude || null,
      timestamp: Date.now(),
      sessionId: sessionId,
    };

    // 1. Supabase Realtime Broadcast (primary)
    if (supabaseReady && activeChannel) {
      activeChannel.send({
        type: 'broadcast',
        event: 'location_update',
        payload: payload,
      }).catch(err => {
        console.warn('Broadcast send error:', err);
      });
    }

    // 2. localStorage fallback (cross-tab support)
    try {
      localStorage.setItem(`tracking_${sessionId}`, JSON.stringify(payload));
    } catch (e) { /* quota exceeded */ }

    // 3. Record trail
    trailRecorder?.addPoint(location);
  };

  // Create the adaptive tracking engine
  const engineMode = options.emergencyMode ? TRACKING_MODES.EMERGENCY : TRACKING_MODES.ACTIVE;
  
  activeEngine = new TrackingEngine({
    initialMode: engineMode,
    autoAdaptive: !options.emergencyMode,
    emergencyMode: options.emergencyMode || false,
    onLocationUpdate: (location) => {
      broadcastLocation(location);
    },
    onModeChange: (newMode, oldMode) => {
      console.log(`🔄 Tracking mode: ${oldMode.name} → ${newMode.name}`);
      
      // Broadcast mode change
      if (supabaseReady && activeChannel) {
        activeChannel.send({
          type: 'broadcast',
          event: 'mode_change',
          payload: { mode: newMode.name, timestamp: Date.now() },
        }).catch(() => {});
      }
    },
    onError: (err) => {
      console.error('TrackingEngine GPS error:', err);
    },
    onBatteryWarning: (level) => {
      console.warn(`🔋 Battery low (${Math.round(level * 100)}%), switching to power-save mode`);
      
      if (supabaseReady && activeChannel) {
        activeChannel.send({
          type: 'broadcast',
          event: 'battery_warning',
          payload: { level, timestamp: Date.now() },
        }).catch(() => {});
      }
    },
    onGeofenceExit: (event) => {
      if (supabaseReady && activeChannel) {
        activeChannel.send({
          type: 'broadcast',
          event: 'geofence_exit',
          payload: { ...event, timestamp: Date.now() },
        }).catch(() => {});
      }
    },
  });

  activeEngine.start();

  console.log(`📡 Started broadcasting session: ${sessionId} [Mode: ${engineMode.name}]`);

  // Return control object
  return {
    stop: () => stopBroadcasting(sessionId),
    getStats: () => activeEngine?.getStats() || {},
    getTrail: () => trailRecorder?.getTrail() || [],
    setEmergencyMode: () => activeEngine?.enableEmergencyMode(),
    setNormalMode: () => activeEngine?.disableEmergencyMode(),
    forceUpdate: () => activeEngine?.forceUpdate(),
  };
};

/**
 * Stops broadcasting
 */
export const stopBroadcasting = (sessionId) => {
  // Stop engine
  if (activeEngine) {
    activeEngine.stop();
    activeEngine = null;
  }

  // Close Supabase channel
  if (activeChannel) {
    // Send session end notification
    activeChannel.send({
      type: 'broadcast',
      event: 'session_end',
      payload: { sessionId, timestamp: Date.now() },
    }).catch(() => {});

    // Delay unsubscribe to let the end message go through
    setTimeout(() => {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }, 500);
  }

  // Clear localStorage
  try {
    localStorage.removeItem(`tracking_${sessionId}`);
  } catch (e) { /* ignore */ }

  activeSessionId = null;
  trailRecorder = null;
  console.log(`🛑 Stopped broadcasting session: ${sessionId}`);
};

// ─── Subscribing (Receiver Side) ────────────────────────

/**
 * Subscribes to a live tracking session (used by the tracking viewer page)
 * Uses Supabase Realtime Broadcast + localStorage polling fallback
 * 
 * @param {string} sessionId 
 * @param {Object} callbacks - { onLocationUpdate, onModeChange, onBatteryWarning, onGeofenceExit, onSessionEnd, onConnectionChange }
 * @returns {Function} Unsubscribe function
 */
export const subscribeToTracking = (sessionId, callbacks = {}) => {
  const {
    onLocationUpdate = () => {},
    onModeChange = () => {},
    onBatteryWarning = () => {},
    onGeofenceExit = () => {},
    onSessionEnd = () => {},
    onConnectionChange = () => {},
  } = typeof callbacks === 'function' ? { onLocationUpdate: callbacks } : callbacks;

  const interpolator = new LocationInterpolator();
  let supabaseConnected = false;
  let fallbackInterval = null;
  let lastReceivedTimestamp = 0;

  // ── Supabase Realtime Subscription ──
  const channelName = `tracking:${sessionId}`;
  let channel = null;

  if (isSupabaseConfigured) {
    try {
      channel = supabase.channel(channelName);

      channel
        .on('broadcast', { event: 'location_update' }, ({ payload }) => {
          if (payload && payload.timestamp > lastReceivedTimestamp) {
            lastReceivedTimestamp = payload.timestamp;
            
            // Use interpolator for smooth map movement
            interpolator.updateTarget(
              {
                latitude: payload.lat,
                longitude: payload.lng,
                speed: payload.speed,
                heading: payload.heading,
                accuracy: payload.accuracy,
                altitude: payload.altitude,
                timestamp: payload.timestamp,
              },
              (interpolated) => {
                onLocationUpdate({
                  ...interpolated,
                  lat: interpolated.latitude,
                  lng: interpolated.longitude,
                  raw: payload,
                });
              }
            );
          }
        })
        .on('broadcast', { event: 'mode_change' }, ({ payload }) => {
          onModeChange(payload);
        })
        .on('broadcast', { event: 'battery_warning' }, ({ payload }) => {
          onBatteryWarning(payload);
        })
        .on('broadcast', { event: 'geofence_exit' }, ({ payload }) => {
          onGeofenceExit(payload);
        })
        .on('broadcast', { event: 'session_end' }, ({ payload }) => {
          onSessionEnd(payload);
        })
        .subscribe((status) => {
          supabaseConnected = status === 'SUBSCRIBED';
          onConnectionChange({ connected: supabaseConnected, source: 'supabase' });
          
          if (!supabaseConnected) {
            // Fall back to localStorage polling
            startFallbackPolling();
          } else {
            stopFallbackPolling();
          }
        });
    } catch (err) {
      console.warn('Supabase subscription failed, using fallback:', err);
      startFallbackPolling();
    }
  }

  // ── localStorage Fallback Polling ──
  let storageHandler = null;

  function startFallbackPolling() {
    if (fallbackInterval) return;

    // Listen for storage events (works cross-tab)
    storageHandler = (e) => {
      if (e.key === `tracking_${sessionId}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.timestamp > lastReceivedTimestamp) {
            lastReceivedTimestamp = data.timestamp;
            onLocationUpdate(data);
          }
        } catch (err) { /* parse error */ }
      }
    };

    window.addEventListener('storage', storageHandler);

    // Poll localStorage for same-tab updates
    fallbackInterval = setInterval(() => {
      try {
        const raw = localStorage.getItem(`tracking_${sessionId}`);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.timestamp > lastReceivedTimestamp) {
            lastReceivedTimestamp = data.timestamp;
            onLocationUpdate(data);
          }
        }
      } catch (err) { /* ignore */ }
    }, 2000);

    onConnectionChange({ connected: true, source: 'localStorage' });
  }

  function stopFallbackPolling() {
    if (fallbackInterval) {
      clearInterval(fallbackInterval);
      fallbackInterval = null;
    }
    if (storageHandler) {
      window.removeEventListener('storage', storageHandler);
      storageHandler = null;
    }
  }

  // Initial fetch from localStorage
  try {
    const initialData = localStorage.getItem(`tracking_${sessionId}`);
    if (initialData) {
      const data = JSON.parse(initialData);
      lastReceivedTimestamp = data.timestamp;
      onLocationUpdate(data);
    }
  } catch (e) { /* ignore */ }

  // Start fallback immediately as a safety net
  startFallbackPolling();

  // ── Return Unsubscribe Function ──
  return () => {
    interpolator.stop();
    stopFallbackPolling();
    
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
};

/**
 * Check if a tracking session is currently active
 */
export const isSessionActive = () => {
  return activeEngine !== null && activeEngine._isRunning;
};

/**
 * Get current session ID
 */
export const getActiveSessionId = () => {
  return activeSessionId;
};
