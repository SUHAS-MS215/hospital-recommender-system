export interface LocationData {
  coordinates: string;
  locationString: string;
}

export interface LocationError {
  message: string;
  code?: number;
}

/**
 * Request geolocation permission and get current coordinates
 */
export async function requestLocation(): Promise<LocationData | LocationError> {
  if (!navigator.geolocation) {
    return {
      message: "Geolocation is not supported by your browser",
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coordinates = `${latitude}, ${longitude}`;
        
        // Attempt to get location string via reverse geocoding
        const locationString = await reverseGeocode(latitude, longitude);
        
        resolve({
          coordinates,
          locationString: locationString || `${latitude}, ${longitude}`,
        });
      },
      (error) => {
        let message = "Unable to retrieve your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            message = "Location request timed out.";
            break;
        }
        
        resolve({
          message,
          code: error.code,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Reverse geocode coordinates to location string using browser's geocoding or fallback
 */
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    // Use Nominatim (OpenStreetMap) for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'User-Agent': 'MedicalChatAgent/1.0'
        }
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Extract city and region from the address
    const address = data.address;
    const city = address.city || address.town || address.village || address.county;
    const state = address.state;
    
    if (city && state) {
      return `${city}, ${state}`;
    } else if (city) {
      return city;
    }
    
    return data.display_name;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return null;
  }
}

/**
 * Check if location data is valid
 */
export function isLocationData(data: LocationData | LocationError): data is LocationData {
  return 'coordinates' in data && 'locationString' in data;
}

