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
 * Supports single & combined amenity queries (e.g. all_medical)
 */
export async function searchNearbyPlaces(lat, lng, type = 'police', radius = 5000) {
  const typeMap = {
    police: ['["amenity"="police"]'],
    hospital: ['["amenity"="hospital"]'],
    fire_station: ['["amenity"="fire_station"]'],
    pharmacy: ['["amenity"="pharmacy"]'],
    clinic: ['["amenity"="clinic"]'],
    doctors: ['["amenity"="doctors"]'],
    dentist: ['["amenity"="dentist"]'],
    // Combined query: all medical facilities in one request
    all_medical: [
      '["amenity"="hospital"]',
      '["amenity"="clinic"]',
      '["amenity"="pharmacy"]',
      '["amenity"="doctors"]',
      '["amenity"="dentist"]',
    ],
  };

  const queries = typeMap[type] || typeMap.police;

  const subtypeLabels = {
    hospital: 'Hospital',
    clinic: 'Clinic',
    pharmacy: 'Pharmacy',
    doctors: 'Doctor',
    dentist: 'Dentist',
    police: 'Police Station',
    fire_station: 'Fire Station',
  };

  try {
    // Build Overpass union query supporting multiple amenity types
    const unionParts = queries
      .map(q => `node${q}(around:${radius},${lat},${lng});\nway${q}(around:${radius},${lat},${lng});`)
      .join('\n');

    const overpassQuery = `
      [out:json][timeout:15];
      (
        ${unionParts}
      );
      out center body 50;
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

    return data.elements
      .filter(el => {
        const elLat = el.lat || el.center?.lat;
        const elLng = el.lon || el.center?.lon;
        return elLat && elLng;
      })
      .map((el) => {
        const amenity = el.tags?.amenity || type;
        return {
          id: el.id,
          name: el.tags?.name || subtypeLabels[amenity] || amenity.replace(/_/g, ' '),
          type: amenity,
          subtype: subtypeLabels[amenity] || amenity.replace(/_/g, ' '),
          latitude: el.lat || el.center?.lat,
          longitude: el.lon || el.center?.lon,
          address:
            el.tags?.['addr:full'] ||
            [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', ') ||
            '',
          phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
          website: el.tags?.website || el.tags?.['contact:website'] || '',
          openingHours: el.tags?.opening_hours || '',
          emergency: el.tags?.emergency === 'yes',
          distance: calculateDistance(lat, lng, el.lat || el.center?.lat, el.lon || el.center?.lon),
        };
      })
      .sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error searching nearby places:', error);
    return [];
  }
}
