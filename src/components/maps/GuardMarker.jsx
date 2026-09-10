import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { relativeTime } from '../../lib/format.js';

function markerIcon(status, selected) {
  const cls = status === 'ACTUAL' ? 'online' : status === 'DESACTUALIZADA' ? 'stale' : status === 'SIN_COMUNICACION' ? 'offline' : 'nodata';
  return L.divIcon({
    className: 'guard-marker-wrapper',
    html: `<span class="guard-marker guard-marker--${cls} ${selected ? 'guard-marker--selected' : ''}"><span>●</span></span>`,
    iconSize: [38, 44],
    iconAnchor: [19, 38],
  });
}

export default function GuardMarker({ item, selected, onSelect }) {
  if (!item?.lastLocation) return null;
  const position = [Number(item.lastLocation.latitude), Number(item.lastLocation.longitude)];
  return (
    <Marker position={position} icon={markerIcon(item.connectionStatus, selected)} eventHandlers={{ click: () => onSelect?.(item) }}>
      <Popup>
        <strong>{item.guard.firstName} {item.guard.lastName}</strong><br />
        {item.guard.code} · {item.guard.rank || 'Guardia'}<br />
        {item.zone?.name || 'Sin zona'}<br />
        {relativeTime(item.lastLocation.recordedAt)}
      </Popup>
    </Marker>
  );
}
