// ============================================
// Location Page - Live GPS Tracking & Map
// ============================================

import { useState, useEffect, useRef } from 'react';
import {
  MapPin, Navigation, Copy, ExternalLink, RefreshCw,
  Crosshair, Share2, Clock
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { watchPosition, clearWatch, getGoogleMapsLink, formatCoords } from '../../services/locationService';
import './Location.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom user location marker
const userIcon = new L.DivIcon({
  html: `<div style="
    width: 20px; height: 20px;
    background: #ff2d55;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 12px rgba(255,45,85,0.6);
  "></div>`,
  className: 'user-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Map follow component
function MapFollow({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo([position.latitude, position.longitude], 16, { duration: 1 });
    }
  }, [position, map]);
  return null;
}

export default function Location({ showToast }) {
  const [position, setPosition] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [followMode, setFollowMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const watchIdRef = useRef(null);

  // Start/stop tracking
  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const startTracking = () => {
    const id = watchPosition(
      (pos) => {
        setPosition(pos);
        setLastUpdate(new Date());
        setTrackingHistory(prev => {
          const newHist = [...prev, { ...pos, time: new Date() }];
          return newHist.slice(-100); // Keep last 100 points
        });
      },
      (err) => {
        showToast(`Location error: ${err.message}`, 'error');
      }
    );
    watchIdRef.current = id;
    setIsTracking(true);
    showToast('📍 Live location tracking started', 'success');
  };

  const stopTracking = () => {
    clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setIsTracking(false);
    showToast('Location tracking stopped', 'info');
  };

  // Cleanup on unmount
  useEffect(() => {
    // Auto-start tracking
    startTracking();
    return () => {
      if (watchIdRef.current) {
        clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const copyLocation = () => {
    if (!position) return;
    const text = `${getGoogleMapsLink(position.latitude, position.longitude)}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Location link copied!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const shareLocation = () => {
    if (!position) return;
    const link = getGoogleMapsLink(position.latitude, position.longitude);
    if (navigator.share) {
      navigator.share({
        title: '📍 My Location - SafeHer',
        text: `I'm sharing my location with you: ${link}`,
        url: link,
      }).catch(() => {});
    } else {
      copyLocation();
    }
  };

  const defaultCenter = [20.5937, 78.9629]; // India center

  return (
    <div className="location" id="location-page">
      {/* Header */}
      <div className="location__header">
        <h1 className="location__title">Live Location</h1>
        <button
          className={`location__tracking-btn ${isTracking ? 'location__tracking-btn--active' : ''}`}
          onClick={toggleTracking}
          id="tracking-toggle"
        >
          <div className={`location__tracking-dot ${isTracking ? 'location__tracking-dot--active' : ''}`} />
          {isTracking ? 'Tracking' : 'Start Tracking'}
        </button>
      </div>

      {/* Map */}
      <div className="location__map-container">
        <MapContainer
          center={position ? [position.latitude, position.longitude] : defaultCenter}
          zoom={position ? 16 : 5}
          className="location__map"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {position && (
            <>
              <Marker
                position={[position.latitude, position.longitude]}
                icon={userIcon}
              >
                <Popup>
                  <div style={{ color: '#333', fontWeight: 600 }}>
                    📍 Your Location<br />
                    <small>{formatCoords(position.latitude, position.longitude)}</small>
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={[position.latitude, position.longitude]}
                radius={position.accuracy || 50}
                pathOptions={{
                  color: '#ff2d55',
                  fillColor: '#ff2d55',
                  fillOpacity: 0.1,
                  weight: 1,
                }}
              />
              {followMode && <MapFollow position={position} />}
            </>
          )}
        </MapContainer>

        {/* Map Controls */}
        <div className="location__map-controls">
          <button
            className={`location__control-btn ${followMode ? 'location__control-btn--active' : ''}`}
            onClick={() => setFollowMode(!followMode)}
            title="Follow mode"
          >
            <Crosshair size={18} />
          </button>
        </div>

        {!position && (
          <div className="location__map-overlay">
            <RefreshCw size={24} className="location__loading-icon" />
            <p>Acquiring location...</p>
          </div>
        )}
      </div>

      {/* Location Info */}
      <div className="location__info">
        {position ? (
          <>
            <div className="location__coords-card glass">
              <div className="location__coords-header">
                <div className="location__coords-indicator">
                  <Navigation size={16} style={{ transform: position.heading ? `rotate(${position.heading}deg)` : 'none' }} />
                </div>
                <div className="location__coords-text">
                  <span className="location__coords-value">
                    {formatCoords(position.latitude, position.longitude)}
                  </span>
                  <span className="location__coords-accuracy">
                    Accuracy: ±{Math.round(position.accuracy || 0)}m
                    {position.speed ? ` • Speed: ${(position.speed * 3.6).toFixed(1)} km/h` : ''}
                  </span>
                </div>
              </div>

              {lastUpdate && (
                <div className="location__last-update">
                  <Clock size={12} />
                  <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="location__actions">
              <button className="location__action-btn glass" onClick={copyLocation}>
                <Copy size={18} />
                <span>Copy Link</span>
              </button>
              <button className="location__action-btn glass" onClick={shareLocation}>
                <Share2 size={18} />
                <span>Share</span>
              </button>
              <a
                href={getGoogleMapsLink(position.latitude, position.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="location__action-btn glass"
              >
                <ExternalLink size={18} />
                <span>Open Map</span>
              </a>
            </div>
          </>
        ) : (
          <div className="location__no-location glass">
            <MapPin size={24} />
            <p>Waiting for GPS signal...</p>
            <p className="location__hint">Make sure location services are enabled</p>
          </div>
        )}
      </div>
    </div>
  );
}
