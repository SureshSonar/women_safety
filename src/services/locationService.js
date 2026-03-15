// ============================================
// Location Service
// GPS tracking, geocoding, and map utilities
// ============================================

/**
 * Get user's current position as a promise
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        ...options,
      }
    );
  });
}

/**
 * Start watching position continuously
 * Returns a watchId that can be used to stop watching
 */
export function watchPosition(onUpdate, onError) {
  if (!navigator.geolocation) {
    onError?.(new Error('Geolocation not supported'));
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      onError?.(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000,
    }
  );
}

/**
 * Stop watching position
 */
export function clearWatch(watchId) {
  if (watchId !== null && watchId !== undefined) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Generate a Google Maps link from coordinates
 */
export function getGoogleMapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Generate an OpenStreetMap link
 */
export function getOSMLink(lat, lng) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`;
}

/**
 * Calculate distance between two points in km using Haversine formula
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Format coordinates for display
 */
export function formatCoords(lat, lng) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Search for nearby places using Overpass API (OpenStreetMap)
 */
export async function searchNearbyPlaces(lat, lng, type = 'police', radius = 5000) {
  const typeMap = {
    police: '["amenity"="police"]',
    hospital: '["amenity"="hospital"]',
    fire_station: '["amenity"="fire_station"]',
    pharmacy: '["amenity"="pharmacy"]',
  };

  const query = typeMap[type] || typeMap.police;

  try {
    const overpassQuery = `
      [out:json][timeout:10];
      (
        node${query}(around:${radius},${lat},${lng});
        way${query}(around:${radius},${lat},${lng});
      );
      out center body 5;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch nearby places');

    const data = await response.json();

    return data.elements.map((el) => ({
      id: el.id,
      name: el.tags?.name || `${type.replace('_', ' ')} station`,
      type: type,
      latitude: el.lat || el.center?.lat,
      longitude: el.lon || el.center?.lon,
      address: el.tags?.['addr:full'] || el.tags?.['addr:street'] || '',
      phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
      distance: calculateDistance(lat, lng, el.lat || el.center?.lat, el.lon || el.center?.lon),
    })).sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error searching nearby places:', error);
    return [];
  }
}
