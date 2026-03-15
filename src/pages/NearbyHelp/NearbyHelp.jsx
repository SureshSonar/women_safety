// ============================================
// Nearby Help Page - Police, Hospitals, etc.
// ============================================

import { useState, useEffect } from 'react';
import {
  Shield, Building2, Flame, Pill, MapPin,
  Phone, ExternalLink, RefreshCw, Navigation
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

      {/* Emergency Numbers */}
      <div className="nearby__emergency">
        <h3 className="nearby__section-title">Emergency Numbers</h3>
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
          <a href="tel:1091" className="nearby__number-card glass">
            <span className="nearby__number-value">1091</span>
            <span className="nearby__number-label">Women Helpline</span>
          </a>
        </div>
      </div>
    </div>
  );
}
