// ============================================
// Nearby Help Page - Police, Hospitals, Medical & more
// Enhanced with all medical facilities + women-safety resources
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Building2, Flame, Pill, MapPin,
  Phone, ExternalLink, RefreshCw, Navigation, Heart, HeartHandshake,
  Stethoscope, Cross, Clock, Globe, AlertCircle, ChevronDown, Search
} from 'lucide-react';
import { getCurrentPosition, searchNearbyPlaces, getGoogleMapsLink } from '../../services/locationService';
import './NearbyHelp.css';

const PLACE_TYPES = [
  { id: 'all_medical', label: 'All Medical', icon: Cross, color: '#ff375f' },
  { id: 'police',      label: 'Police',      icon: Shield, color: '#64d2ff' },
  { id: 'hospital',    label: 'Hospital',     icon: Building2, color: '#30d158' },
  { id: 'pharmacy',    label: 'Pharmacy',     icon: Pill, color: '#bf5af2' },
  { id: 'clinic',      label: 'Clinic',       icon: Stethoscope, color: '#ff9f0a' },
  { id: 'doctors',     label: 'Doctors',      icon: Heart, color: '#ff6482' },
  { id: 'fire_station', label: 'Fire Station', icon: Flame, color: '#ff9f0a' },
];

const SUBTYPE_ICONS = {
  hospital: Building2,
  clinic: Stethoscope,
  pharmacy: Pill,
  doctors: Heart,
  dentist: Cross,
  police: Shield,
  fire_station: Flame,
};

const SUBTYPE_COLORS = {
  hospital: '#30d158',
  clinic: '#ff9f0a',
  pharmacy: '#bf5af2',
  doctors: '#ff6482',
  dentist: '#64d2ff',
  police: '#64d2ff',
  fire_station: '#ff9f0a',
};

const RADIUS_OPTIONS = [
  { value: 2000, label: '2 km' },
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
  { value: 20000, label: '20 km' },
];

export default function NearbyHelp({ showToast }) {
  const [activeType, setActiveType] = useState('all_medical');
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState(null);
  const [searchRadius, setSearchRadius] = useState(5000);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);
  const [resultCount, setResultCount] = useState(0);

  const fetchNearbyPlaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pos = await getCurrentPosition();
      setUserLocation(pos);

      const results = await searchNearbyPlaces(
        pos.latitude,
        pos.longitude,
        activeType,
        searchRadius
      );

      setPlaces(results);
      setResultCount(results.length);

      if (results.length === 0) {
        showToast(`No ${activeType === 'all_medical' ? 'medical facilities' : activeType.replace('_', ' ')} found nearby`, 'info');
      }
    } catch (err) {
      setError(err.message);
      showToast('Could not fetch nearby places', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeType, searchRadius, showToast]);

  useEffect(() => {
    fetchNearbyPlaces();
  }, [fetchNearbyPlaces]);

  const formatDistance = (km) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const activeTypeInfo = PLACE_TYPES.find(t => t.id === activeType);
  const radiusLabel = RADIUS_OPTIONS.find(r => r.value === searchRadius)?.label || '5 km';

  // For "all_medical", each card shows its own subtype icon/color
  const getCardIcon = (place) => {
    if (activeType === 'all_medical') {
      return SUBTYPE_ICONS[place.type] || Cross;
    }
    return activeTypeInfo?.icon || MapPin;
  };

  const getCardColor = (place) => {
    if (activeType === 'all_medical') {
      return SUBTYPE_COLORS[place.type] || '#ff375f';
    }
    return activeTypeInfo?.color || '#fff';
  };

  return (
    <div className="nearby" id="nearby-page">
      {/* Header */}
      <div className="nearby__header">
        <div>
          <h1 className="nearby__title">Nearby Help</h1>
          <p className="nearby__subtitle">
            {isLoading
              ? 'Searching...'
              : resultCount > 0
                ? `${resultCount} places found`
                : 'Find help near you'}
          </p>
        </div>
        <div className="nearby__header-actions">
          {/* Radius Picker */}
          <div className="nearby__radius-wrap">
            <button
              className="nearby__radius-btn"
              onClick={() => setShowRadiusPicker(!showRadiusPicker)}
            >
              <Search size={14} />
              {radiusLabel}
              <ChevronDown size={12} />
            </button>
            {showRadiusPicker && (
              <div className="nearby__radius-dropdown">
                {RADIUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`nearby__radius-option ${searchRadius === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      setSearchRadius(opt.value);
                      setShowRadiusPicker(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="nearby__refresh-btn"
            onClick={fetchNearbyPlaces}
            disabled={isLoading}
            id="refresh-nearby"
          >
            <RefreshCw size={18} className={isLoading ? 'nearby__spin' : ''} />
          </button>
        </div>
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
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="nearby__results">
        {isLoading ? (
          <div className="nearby__loading">
            <div className="nearby__loading-pulse">
              <RefreshCw size={28} className="nearby__spin" />
            </div>
            <p>Searching for nearby places...</p>
            <span className="nearby__loading-sub">
              Within {radiusLabel} radius
            </span>
          </div>
        ) : error ? (
          <div className="nearby__error">
            <AlertCircle size={32} />
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
            <p>No places found within {radiusLabel}</p>
            <span>Try increasing the search radius</span>
            <button
              className="nearby__retry-btn"
              onClick={() => {
                const nextRadius = RADIUS_OPTIONS.find(r => r.value > searchRadius);
                if (nextRadius) {
                  setSearchRadius(nextRadius.value);
                } else {
                  fetchNearbyPlaces();
                }
              }}
            >
              {RADIUS_OPTIONS.find(r => r.value > searchRadius)
                ? `Search within ${RADIUS_OPTIONS.find(r => r.value > searchRadius).label}`
                : 'Retry'}
            </button>
          </div>
        ) : (
          <div className="nearby__list">
            {places.map((place, index) => {
              const CardIcon = getCardIcon(place);
              const cardColor = getCardColor(place);
              return (
                <div
                  key={place.id}
                  className="nearby__card animate-slide-up"
                  style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                >
                  <div className="nearby__card-top">
                    <div
                      className="nearby__card-icon"
                      style={{ background: `${cardColor}15`, color: cardColor }}
                    >
                      <CardIcon size={20} />
                    </div>
                    <div className="nearby__card-info">
                      <h3 className="nearby__card-name">{place.name}</h3>
                      {/* Show subtype badge for "All Medical" view */}
                      {activeType === 'all_medical' && (
                        <span
                          className="nearby__card-badge"
                          style={{ color: cardColor, borderColor: `${cardColor}40` }}
                        >
                          {place.subtype}
                        </span>
                      )}
                      {place.address && (
                        <p className="nearby__card-address">{place.address}</p>
                      )}
                      {place.openingHours && (
                        <p className="nearby__card-hours">
                          <Clock size={11} />
                          {place.openingHours}
                        </p>
                      )}
                    </div>
                    <div className="nearby__card-distance" style={{ color: cardColor }}>
                      <Navigation size={12} />
                      <span>{formatDistance(place.distance)}</span>
                    </div>
                  </div>

                  <div className="nearby__card-actions">
                    {place.phone && (
                      <a href={`tel:${place.phone}`} className="nearby__card-action">
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
                      <Navigation size={14} />
                      Directions
                    </a>
                    {place.website && (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nearby__card-action"
                      >
                        <Globe size={14} />
                        Website
                      </a>
                    )}
                  </div>

                  {place.emergency && (
                    <div className="nearby__card-emergency-badge">
                      <AlertCircle size={11} />
                      24/7 Emergency
                    </div>
                  )}
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
