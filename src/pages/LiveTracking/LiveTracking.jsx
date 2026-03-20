// ============================================
// Live Tracking Page - Production-Ready Viewer
// Uber/Rapido-style real-time tracking experience
// Emergency-focused enhancements
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Shield, Navigation, AlertTriangle, User, Clock, Route,
  CheckCircle, BatteryLow, MapPin, Crosshair, Phone,
  Share2, Copy, ChevronUp, ChevronDown, Eye, Radio, Wifi
} from 'lucide-react';
import { useTrackingSubscription } from '../../hooks/useTracking';
import { getGoogleMapsLink } from '../../services/locationService';
import './LiveTracking.css';

// Custom tracking marker with pulse animation
const createTrackingIcon = (heading = 0) => new L.DivIcon({
  html: `<div class="tracking-pulse-marker">
           <div class="tracking-pulse-ring"></div>
           <div class="tracking-pulse-ring tracking-pulse-ring-2"></div>
           <div class="tracking-person-dot" style="transform: rotate(${heading || 0}deg)">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
               <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
             </svg>
           </div>
         </div>`,
  className: 'tracking-marker-container',
  iconSize: [50, 50],
  iconAnchor: [25, 25],
});

// Component to dynamically re-center map
function AutoCenterMap({ location, follow }) {
  const map = useMap();
  useEffect(() => {
    if (location && follow) {
      map.flyTo([location.lat, location.lng], map.getZoom() < 14 ? 16 : map.getZoom(), {
        animate: true,
        duration: 1.2,
      });
    }
  }, [location, map, follow]);
  return null;
}

// Elapsed time formatter
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Format coordinates
function formatCoords(lat, lng) {
  if (lat == null || lng == null) return 'Unknown';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default function LiveTracking() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [followMode, setFollowMode] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Use the tracking subscription hook
  const {
    location: targetLocation,
    isLive,
    connectionSource,
    lastUpdateTime,
    history,
    sessionEnded,
    batteryWarning,
    trackingMode,
  } = useTrackingSubscription(sessionId);

  // Time updater for "ago" display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Trail polyline points
  const trailPoints = useMemo(() => {
    return history.map(p => [p.lat, p.lng]);
  }, [history]);

  // Time calculations
  const timeAgo = lastUpdateTime ? Math.floor((currentTime - lastUpdateTime) / 1000) : null;
  const sessionDuration = history.length > 0
    ? Math.floor((history[history.length - 1].timestamp - history[0].timestamp) / 1000)
    : 0;

  // Speed display
  const speedKmh = targetLocation?.speed
    ? (targetLocation.speed * 3.6).toFixed(1)
    : '0.0';

  // Helper to fallback to real URL instead of localhost on Android
  const getBaseUrl = () => {
    let baseUrl = window.location.origin;
    if (baseUrl.includes('localhost') || baseUrl.includes('capacitor://') || baseUrl.startsWith('file://')) {
      return 'https://women-safety-indol.vercel.app';
    }
    return baseUrl;
  };

  // Copy tracking link
  const copyLink = () => {
    const link = `${getBaseUrl()}/track/${sessionId}`;
    navigator.clipboard.writeText(link).then(() => {
      // Visual feedback handled by CSS
    }).catch(() => {});
  };

  // Share via native
  const shareLink = () => {
    const link = `${getBaseUrl()}/track/${sessionId}`;
    if (navigator.share) {
      navigator.share({
        title: '🚨 SafeHer Emergency Tracking',
        text: 'Track my live location for safety:',
        url: link,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  // Marker icon with rotation
  const markerIcon = useMemo(() => {
    return createTrackingIcon(targetLocation?.heading);
  }, [targetLocation?.heading]);

  const defaultCenter = [20.5937, 78.9629]; // India center

  return (
    <div className="live-tracking-page" id="live-tracking-page">
      {/* ── Header ── */}
      <div className="tracking-header">
        <div className="tracking-brand" onClick={() => navigate('/')}>
          <Shield size={22} className="tracking-brand-icon" />
          <div className="tracking-brand-info">
            <span className="tracking-brand-text">SafeHer</span>
            <span className="tracking-brand-sub">Emergency Tracking</span>
          </div>
        </div>

        <div className="tracking-header-right">
          {connectionSource && (
            <div className={`tracking-connection ${connectionSource === 'supabase' ? 'realtime' : 'fallback'}`}>
              {connectionSource === 'supabase' ? <Radio size={12} /> : <Wifi size={12} />}
              <span>{connectionSource === 'supabase' ? 'Realtime' : 'Local'}</span>
            </div>
          )}
          <div className={`tracking-status ${isLive ? 'live' : sessionEnded ? 'ended' : 'offline'}`}>
            <div className="status-dot"></div>
            <span>{isLive ? 'LIVE' : sessionEnded ? 'ENDED' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>

      {/* ── Session Ended Banner ── */}
      {sessionEnded && (
        <div className="tracking-ended-banner animate-slide-down">
          <AlertTriangle size={18} />
          <span>This tracking session has ended.</span>
          <button onClick={() => navigate('/')} className="tracking-ended-btn">Go Home</button>
        </div>
      )}

      {/* ── Battery Warning ── */}
      {batteryWarning !== null && batteryWarning < 0.2 && (
        <div className="tracking-battery-warning animate-slide-down">
          <BatteryLow size={18} />
          <span>User's battery is low ({Math.round(batteryWarning * 100)}%). Updates may slow down.</span>
        </div>
      )}

      {/* ── Map Area ── */}
      <div className="tracking-map-container">
        {targetLocation ? (
          <MapContainer
            center={[targetLocation.lat, targetLocation.lng]}
            zoom={16}
            scrollWheelZoom={true}
            className="tracking-map"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Trail polyline */}
            {trailPoints.length > 1 && (
              <Polyline
                positions={trailPoints}
                pathOptions={{
                  color: '#ff2d55',
                  weight: 3,
                  opacity: 0.6,
                  dashArray: '8, 6',
                  lineCap: 'round',
                }}
              />
            )}

            {/* Accuracy circle */}
            <Circle
              center={[targetLocation.lat, targetLocation.lng]}
              radius={targetLocation.accuracy || 30}
              pathOptions={{
                fillColor: '#ff2d55',
                fillOpacity: 0.08,
                color: '#ff2d55',
                weight: 1,
                opacity: 0.3,
              }}
            />

            {/* Person marker */}
            <Marker
              position={[targetLocation.lat, targetLocation.lng]}
              icon={markerIcon}
            >
              <Popup className="tracking-popup">
                <div className="popup-content">
                  <User size={14} />
                  <div className="popup-info">
                    <strong>Protected User</strong>
                    <span>{formatCoords(targetLocation.lat, targetLocation.lng)}</span>
                  </div>
                </div>
              </Popup>
            </Marker>

            <AutoCenterMap location={targetLocation} follow={followMode} />
          </MapContainer>
        ) : (
          <div className="tracking-loading">
            <div className="radar-spinner">
              <div className="radar-sweep"></div>
            </div>
            <p className="tracking-loading-text">Locating user...</p>
            <span className="tracking-loading-sub">Waiting for GPS signal from device</span>
            <span className="tracking-loading-id">Session: {sessionId?.substring(0, 8)}...</span>
          </div>
        )}

        {/* Map Controls */}
        <div className="tracking-map-controls">
          <button
            className={`tracking-control-btn ${followMode ? 'active' : ''}`}
            onClick={() => setFollowMode(!followMode)}
            title="Follow mode"
          >
            <Crosshair size={18} />
          </button>

          <button
            className="tracking-control-btn"
            onClick={shareLink}
            title="Share tracking link"
          >
            <Share2 size={18} />
          </button>

          <button
            className="tracking-control-btn"
            onClick={copyLink}
            title="Copy tracking link"
          >
            <Copy size={18} />
          </button>
        </div>

        {/* Live indicator overlay */}
        {isLive && (
          <div className="tracking-live-badge">
            <div className="tracking-live-dot"></div>
            <span>LIVE</span>
            {trackingMode && <span className="tracking-mode-badge">{trackingMode}</span>}
          </div>
        )}
      </div>

      {/* ── Bottom Info Sheet ── */}
      <div className={`tracking-bottom-sheet ${targetLocation ? 'active' : ''} ${sheetExpanded ? 'expanded' : 'collapsed'}`}>
        <button
          className="sheet-handle-btn"
          onClick={() => setSheetExpanded(!sheetExpanded)}
          aria-label="Toggle info panel"
        >
          <div className="sheet-handle"></div>
          {sheetExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        {/* Header */}
        <div className="sheet-header">
          <div className="sheet-title-row">
            <h2 className="sheet-title">Emergency Tracking</h2>
            <span className="sheet-id">
              <Eye size={12} />
              {sessionId?.substring(0, 8)}
            </span>
          </div>
          {sessionDuration > 0 && (
            <span className="sheet-duration">
              <Clock size={12} />
              {formatDuration(sessionDuration)} active
            </span>
          )}
        </div>

        {/* Data Grid */}
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon-wrap info-icon-blue">
              <Clock size={18} />
            </div>
            <div className="info-data">
              <span className="info-label">Last Update</span>
              <span className="info-value">
                {timeAgo !== null
                  ? (timeAgo < 3 ? 'Just now' : `${timeAgo}s ago`)
                  : 'Pending...'}
              </span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon-wrap info-icon-green">
              <Route size={18} />
            </div>
            <div className="info-data">
              <span className="info-label">Speed</span>
              <span className="info-value">
                {parseFloat(speedKmh) > 0.5 ? `${speedKmh} km/h` : 'Stationary'}
              </span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon-wrap info-icon-purple">
              <Crosshair size={18} />
            </div>
            <div className="info-data">
              <span className="info-label">Accuracy</span>
              <span className="info-value">
                {targetLocation?.accuracy ? `±${Math.round(targetLocation.accuracy)}m` : '—'}
              </span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon-wrap info-icon-orange">
              <MapPin size={18} />
            </div>
            <div className="info-data">
              <span className="info-label">Points</span>
              <span className="info-value">{history.length} tracked</span>
            </div>
          </div>
        </div>

        {/* Status Alert */}
        <div className="status-alert">
          {isLive ? (
            <div className="alert-box info-box">
              <CheckCircle size={20} />
              <div className="alert-text">
                <strong>Signal Active</strong>
                <span>Receiving continuous GPS telemetry in real-time.</span>
              </div>
            </div>
          ) : sessionEnded ? (
            <div className="alert-box danger-box">
              <AlertTriangle size={20} />
              <div className="alert-text">
                <strong>Session Ended</strong>
                <span>The user has stopped sharing their location.</span>
              </div>
            </div>
          ) : (
            <div className="alert-box warning-box">
              <AlertTriangle size={20} />
              <div className="alert-text">
                <strong>Signal Lost</strong>
                <span>The user may have lost connection or stopped sharing.</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="tracking-actions">
          <button
            className="tracking-action-btn tracking-action-directions"
            onClick={() => {
              if (targetLocation) {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${targetLocation.lat},${targetLocation.lng}`);
              }
            }}
            disabled={!targetLocation}
          >
            <Navigation size={18} />
            <span>Get Directions</span>
          </button>

          <button
            className="tracking-action-btn tracking-action-call"
            onClick={() => window.open('tel:112')}
          >
            <Phone size={18} />
            <span>Call 112</span>
          </button>
        </div>

        {/* Coordinates Footer */}
        {targetLocation && (
          <div className="tracking-coords-footer">
            <MapPin size={12} />
            <span>{targetLocation.lat?.toFixed(6)}, {targetLocation.lng?.toFixed(6)}</span>
            <a
              href={getGoogleMapsLink(targetLocation.lat, targetLocation.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="tracking-coords-link"
            >
              Open in Maps →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
