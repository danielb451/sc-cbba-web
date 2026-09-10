import { MapContainer, TileLayer } from 'react-leaflet';
import RouteLayer from './RouteLayer.jsx';
import JurisdictionLayer from './JurisdictionLayer.jsx';
import { FitBounds } from './MapHelpers.jsx';
import { COCHABAMBA_CENTER } from '../../lib/maps.js';

export default function ServiceRouteMap({ route, height = 440 }) {
  const points = [
    route?.startPoint ? [Number(route.startPoint.latitude), Number(route.startPoint.longitude)] : null,
    ...(route?.points || []).map((p) => [Number(p.latitude), Number(p.longitude)]),
    route?.endPoint ? [Number(route.endPoint.latitude), Number(route.endPoint.longitude)] : null,
  ].filter(Boolean);
  return (
    <div style={{ height }} className="route-map-wrap">
      <MapContainer center={points[0] || COCHABAMBA_CENTER} zoom={14} className="leaflet-map">
        <TileLayer
          url={import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          attribution={import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors'}
        />
        {route?.service?.zone ? <JurisdictionLayer zone={route.service.zone} selected /> : null}
        <RouteLayer route={route} />
        {points.length ? <FitBounds points={points} /> : null}
      </MapContainer>
    </div>
  );
}
