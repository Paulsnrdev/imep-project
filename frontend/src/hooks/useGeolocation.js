import { useState, useCallback } from 'react';

const useGeolocation = () => {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation is not supported by your browser.' });
      return Promise.reject(new Error('Geolocation not supported'));
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCoords(result);
          setLoading(false);
          resolve(result);
        },
        (err) => {
          const messages = {
            1: 'Location permission denied. Please allow location access.',
            2: 'Location unavailable. Check your GPS signal.',
            3: 'Location request timed out. Please try again.',
          };
          const errorObj = { code: err.code, message: messages[err.code] ?? 'Unknown location error' };
          setError(errorObj);
          setLoading(false);
          reject(errorObj);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  return { coords, error, loading, getPosition };
};

export default useGeolocation;
