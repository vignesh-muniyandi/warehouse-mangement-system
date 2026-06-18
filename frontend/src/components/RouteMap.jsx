import React, { useEffect, useRef } from 'react';

const loadGoogleMaps = (apiKey) => {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.body.appendChild(script);
  });
};

export default function RouteMap({ position, trackingPoints = [] }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const pathRef = useRef(null);
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !ref.current) {
      return;
    }

    let mounted = true;
    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (!mounted || !ref.current) return;
        mapRef.current = new maps.Map(ref.current, {
          center: { lat: position?.lat || 22.5726, lng: position?.lng || 88.3639 },
          zoom: 12,
          disableDefaultUI: true,
        });

        markerRef.current = new maps.Marker({ map: mapRef.current, position: position || { lat: 22.5726, lng: 88.3639 } });
        pathRef.current = new maps.Polyline({ map: mapRef.current, path: [], strokeColor: '#1976d2', strokeWeight: 4 });
      })
      .catch(() => {
        /* fallback if maps load fails */
      });

    return () => {
      mounted = false;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    const maps = window.google?.maps;
    if (!maps) return;

    const center = position || trackingPoints[trackingPoints.length - 1];
    if (center) {
      mapRef.current.setCenter(center);
      if (markerRef.current) {
        markerRef.current.setPosition(center);
      }
    }

    if (pathRef.current) {
      pathRef.current.setPath(trackingPoints.map((point) => ({ lat: Number(point.latitude), lng: Number(point.longitude) })));
    }
  }, [position, trackingPoints, apiKey]);

  return (
    <div style={{ height: 450, borderRadius: 12, overflow: 'hidden', background: '#eef' }}>
      {apiKey ? (
        <div ref={ref} style={{ height: '100%', width: '100%' }} />
      ) : (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>Google Maps Disabled</p>
            <p style={{ margin: 0 }}>Set REACT_APP_GOOGLE_MAPS_API_KEY to enable live route rendering.</p>
            {position && <p style={{ marginTop: 8 }}>Current position: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
