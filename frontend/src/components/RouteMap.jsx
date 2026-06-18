import React, { useEffect, useRef } from 'react';

export default function RouteMap({ position }) {
  const ref = useRef();
  useEffect(() => {
    // Placeholder: Could integrate Google Maps JS API here.
    if (!ref.current) return;
    ref.current.innerText = position ? `Lat: ${position.lat}, Lng: ${position.lng}` : 'Map placeholder';
  }, [position]);
  return <div ref={ref} style={{ height: 400, background: '#eef' }} />;
}
