import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export function FitBounds({ points = [], padding = [30, 30] }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p) => Number.isFinite(Number(p?.[0])) && Number.isFinite(Number(p?.[1])));
    if (valid.length === 1) map.setView(valid[0], Math.max(map.getZoom(), 15));
    else if (valid.length > 1) map.fitBounds(valid, { padding, maxZoom: 17 });
  }, [map, JSON.stringify(points)]);
  return null;
}

export function FlyTo({ position, zoom = 16 }) {
  const map = useMap();
  useEffect(() => {
    if (position?.length === 2) map.flyTo(position, zoom, { duration: 0.8 });
  }, [map, position?.[0], position?.[1], zoom]);
  return null;
}
