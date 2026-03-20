// ============================================
// useTracking - Custom React Hook
// Provides tracking state management for components
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createTrackingSession,
  startBroadcasting,
  stopBroadcasting,
  subscribeToTracking,
  getTrackingLink,
  isSessionActive,
  getActiveSessionId,
} from '../services/liveTrackingService';

/**
 * Hook for BROADCASTING location (sender side)
 * Used by the person being tracked
 */
export function useTrackingBroadcast() {
  const [sessionId, setSessionId] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState(null);
  const [trail, setTrail] = useState([]);
  const [lastLocation, setLastLocation] = useState(null);
  const [mode, setMode] = useState('Emergency');
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const controlRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const timerRef = useRef(null);

  const startTracking = useCallback((options = {}) => {
    const id = createTrackingSession();
    setSessionId(id);

    const control = startBroadcasting(id, {
      emergencyMode: options.emergencyMode !== false,
      ...options,
    });
    
    controlRef.current = control;
    setIsActive(true);

    // Poll stats
    statsIntervalRef.current = setInterval(() => {
      if (controlRef.current) {
        const s = controlRef.current.getStats();
        setStats(s);
        setTrail(controlRef.current.getTrail());
        setMode(s.mode || 'Emergency');
        if (s.lastPosition) {
          setLastLocation(s.lastPosition);
        }
      }
    }, 2000);

    // Elapsed time counter
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return { sessionId: id, trackingLink: getTrackingLink(id) };
  }, []);

  const stopTracking = useCallback(() => {
    if (sessionId) {
      stopBroadcasting(sessionId);
    }
    controlRef.current = null;
    setIsActive(false);
    setSessionId(null);

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedTime(0);
  }, [sessionId]);

  const forceUpdate = useCallback(async () => {
    if (controlRef.current) {
      return controlRef.current.forceUpdate();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId && isActive) {
        stopBroadcasting(sessionId);
      }
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    sessionId,
    isActive,
    stats,
    trail,
    lastLocation,
    mode,
    elapsedTime,
    trackingLink: sessionId ? getTrackingLink(sessionId) : null,
    startTracking,
    stopTracking,
    forceUpdate,
  };
}

/**
 * Hook for SUBSCRIBING to a tracking session (receiver side)
 * Used by the person viewing the tracked location
 */
export function useTrackingSubscription(sessionId) {
  const [location, setLocation] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [history, setHistory] = useState([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [batteryWarning, setBatteryWarning] = useState(null);
  const [trackingMode, setTrackingMode] = useState(null);
  const [geofenceAlert, setGeofenceAlert] = useState(null);

  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToTracking(sessionId, {
      onLocationUpdate: (data) => {
        setLocation(data);
        setIsLive(true);
        setLastUpdateTime(Date.now());
        lastUpdateRef.current = Date.now();

        setHistory(prev => {
          const next = [...prev, {
            lat: data.lat,
            lng: data.lng,
            timestamp: data.timestamp,
          }];
          return next.slice(-200); // Keep last 200 points
        });
      },
      onModeChange: (data) => {
        setTrackingMode(data.mode);
      },
      onBatteryWarning: (data) => {
        setBatteryWarning(data.level);
      },
      onGeofenceExit: (data) => {
        setGeofenceAlert(data);
      },
      onSessionEnd: () => {
        setSessionEnded(true);
        setIsLive(false);
      },
      onConnectionChange: ({ connected, source }) => {
        setConnectionSource(source);
        if (!connected) setIsLive(false);
      },
    });

    // Liveness checker — mark offline if no update for 60s
    const livenessCheck = setInterval(() => {
      const timeSinceUpdate = Date.now() - lastUpdateRef.current;
      if (timeSinceUpdate > 60000) {
        setIsLive(false);
      }
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(livenessCheck);
    };
  }, [sessionId]);

  const timeSinceUpdate = lastUpdateTime
    ? Math.floor((Date.now() - lastUpdateTime) / 1000)
    : null;

  return {
    location,
    isLive,
    connectionSource,
    lastUpdateTime,
    timeSinceUpdate,
    history,
    sessionEnded,
    batteryWarning,
    trackingMode,
    geofenceAlert,
  };
}
