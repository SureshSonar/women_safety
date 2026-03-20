// ============================================
// Nearby Help Page - Police, Hospitals, etc.
// Enhanced with women-safety resources
// ============================================

import { useState, useEffect } from 'react';
import {
  Shield, Building2, Flame, Pill, MapPin,
  Phone, ExternalLink, RefreshCw, Navigation, Heart, HeartHandshake
} from 'lucide-react';
import { getCurrentPosition, searchNearbyPlaces, getGoogleMapsLink } from '../../services/locationService';
import './NearbyHelp.css';

const PLACE_TYPES = [
  { id: 'police', label: 'Police', icon: Shield, color: '#64d2ff' },
  { id: 'hospital', label: 'Hospital', icon: Building2, color: '#30d158' },
  { id: 'fire_station', label: 'Fire Station', icon: Flame, color: '#ff9f0a' },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill, color: '#bf5af2' },
];

export default function NearbyHelp({ showToast }) {
  const [activeType, setActiveType] = useState('police');
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNearbyPlaces();
  }, [activeType]);

  const fetchNearbyPlaces = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pos = await getCurrentPosition();
      setUserLocation(pos);

      const results = await searchNearbyPlaces(
        pos.latitude,
        pos.longitude,
        activeType,
        5000
      );

      setPlaces(results);

      if (results.length === 0) {
        showToast(`No ${activeType.replace('_', ' ')} stations found nearby`, 'info');
      }
    } catch (err) {
      setError(err.message);
      showToast('Could not fetch nearby places', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDistance = (km) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const activeTypeInfo = PLACE_TYPES.find(t => t.id === activeType);

  return (
    <div className="nearby" id="nearby-page">
      {/* Header */}
      <div className="nearby__header">
        <h1 className="nearby__title">Nearby Help</h1>
        <button
          className="nearby__refresh-btn"
          onClick={fetchNearbyPlaces}
          disabled={isLoading}
          id="refresh-nearby"
        >
          <RefreshCw size={18} className={isLoading ? 'nearby__spin' : ''} />
        </button>
      </div>

      {/* Place Type Tabs */}
      <div className="nearby__tabs">
        {PLACE_TYPES.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            className={`nearby__tab ${activeType === id ? 'nearby__tab--active' : ''}`}
            onClick={() => setActiveType(id)}
            style={{ '--tab-color': color }}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="nearby__results">
        {isLoading ? (
          <div className="nearby__loading">
            <RefreshCw size={28} className="nearby__spin" />
            <p>Searching for nearby {activeType.replace('_', ' ')} stations...</p>
          </div>
        ) : error ? (
          <div className="nearby__error">
            <MapPin size={28} />
            <p>{error}</p>
            <button className="nearby__retry-btn" onClick={fetchNearbyPlaces}>
              Try Again
            </button>
          </div>
        ) : places.length === 0 ? (
          <div className="nearby__empty">
            <div className="nearby__empty-icon" style={{ color: activeTypeInfo?.color }}>
              {activeTypeInfo && <activeTypeInfo.icon size={32} />}
            </div>
            <p>No {activeType.replace('_', ' ')} stations found within 5km</p>
            <span>Try expanding your search or moving to a different area</span>
          </div>
        ) : (
          <div className="nearby__list">
            {places.map((place, index) => {
              const TypeIcon = activeTypeInfo.icon;
              return (
                <div
                  key={place.id}
                  className="nearby__card glass animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="nearby__card-top">
                    <div
                      className="nearby__card-icon"
                      style={{ background: `${activeTypeInfo.color}15`, color: activeTypeInfo.color }}
                    >
                      <TypeIcon size={20} />
                    </div>
                    <div className="nearby__card-info">
                      <h3 className="nearby__card-name">{place.name}</h3>
                      {place.address && (
                        <p className="nearby__card-address">{place.address}</p>
                      )}
                    </div>
                    <div className="nearby__card-distance" style={{ color: activeTypeInfo.color }}>
                      <Navigation size={12} />
                      <span>{formatDistance(place.distance)}</span>
                    </div>
                  </div>

                  <div className="nearby__card-actions">
                    {place.phone && (
                      <a
                        href={`tel:${place.phone}`}
                        className="nearby__card-action"
                      >
                        <Phone size={14} />
                        Call
                      </a>
                    )}
                    <a
                      href={getGoogleMapsLink(place.latitude, place.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nearby__card-action"
                    >
                      <ExternalLink size={14} />
                      Directions
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Women Safety Resources */}
      <div className="nearby__women-resources">
        <h3 className="nearby__section-title">
          <HeartHandshake size={16} style={{ color: '#e040fb' }} />
          Women Safety Helplines
        </h3>
        <div className="nearby__women-cards">
          <a href="tel:1091" className="nearby__women-card" id="women-helpline-1091">
            <div className="nearby__women-card-icon">
              <Heart size={18} />
            </div>
            <div className="nearby__women-card-info">
              <span className="nearby__women-card-title">Women Helpline</span>
              <span className="nearby__women-card-desc">24/7 Free & Confidential</span>
            </div>
            <div className="nearby__women-card-number">
              <Phone size={12} />
              <span>1091</span>
            </div>
          </a>
          <a href="tel:181" className="nearby__women-card" id="women-helpline-181">
            <div className="nearby__women-card-icon nearby__women-card-icon--purple">
              <Shield size={18} />
            </div>
            <div className="nearby__women-card-info">
              <span className="nearby__women-card-title">Domestic Violence</span>
              <span className="nearby__women-card-desc">Women in Distress Helpline</span>
            </div>
            <div className="nearby__women-card-number">
              <Phone size={12} />
              <span>181</span>
            </div>
          </a>
          <a href="tel:7827-170-170" className="nearby__women-card" id="women-helpline-ncw">
            <div className="nearby__women-card-icon nearby__women-card-icon--pink">
              <HeartHandshake size={18} />
            </div>
            <div className="nearby__women-card-info">
              <span className="nearby__women-card-title">NCW Helpline</span>
              <span className="nearby__women-card-desc">National Commission for Women</span>
            </div>
            <div className="nearby__women-card-number">
              <Phone size={12} />
              <span>7827170170</span>
            </div>
          </a>
        </div>
      </div>

      {/* Emergency Numbers */}
      <div className="nearby__emergency">
        <h3 className="nearby__section-title">General Emergency Numbers</h3>
        <div className="nearby__number-grid">
          <a href="tel:112" className="nearby__number-card glass">
            <span className="nearby__number-value">112</span>
            <span className="nearby__number-label">Emergency</span>
          </a>
          <a href="tel:100" className="nearby__number-card glass">
            <span className="nearby__number-value">100</span>
            <span className="nearby__number-label">Police</span>
          </a>
          <a href="tel:108" className="nearby__number-card glass">
            <span className="nearby__number-value">108</span>
            <span className="nearby__number-label">Ambulance</span>
          </a>
          <a href="tel:101" className="nearby__number-card glass">
            <span className="nearby__number-value">101</span>
            <span className="nearby__number-label">Fire</span>
          </a>
        </div>
      </div>
    </div>
  );
}
