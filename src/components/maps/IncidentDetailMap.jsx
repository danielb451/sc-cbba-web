import { Circle, MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import JurisdictionLayer from './JurisdictionLayer.jsx';
import { COCHABAMBA_CENTER } from '../../lib/maps.js';

const icon = L.divIcon({
  className: 'incident-pin-wrapper',
  html: '<span class="incident-pin">!</span>',
  iconSize: [38, 44],
  iconAnchor: [19, 40],
});

export default function IncidentDetailMap({ incident, height = 360 }) {
  const position = incident ? [Number(incident.latitude), Number(incident.longitude)] : COCHABAMBA_CENTER;
  return (
    <div style={{ height }} className="route-map-wrap">
      <MapContainer center={position} zoom={16} className="leaflet-map">
        <TileLayer url={import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} attribution={import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors'} />
        {incident?.service?.zone ? <JurisdictionLayer zone={incident.service.zone} selected /> : null}
        {incident ? <><Circle center={position} radius={115} pathOptions={{ color: '#e32646', fillColor: '#ff234f', fillOpacity: 0.16, weight: 2 }} /><Marker position={position} icon={icon}><Tooltip permanent direction="top" offset={[0,-28]}>{incident.code}</Tooltip></Marker></> : null}
      </MapContainer>
    </div>
  );
}
