import { Circle, Tooltip } from 'react-leaflet';
import { relativeTime } from '../../lib/format.js';

export default function IncidentHotspot({ incident, onClick, maxHours = 48 }) {
  const ageHours = Math.max((Date.now() - new Date(incident.createdAt).getTime()) / 3_600_000, 0);
  if (ageHours > maxHours) return null;
  const freshness = Math.max(0.10, 1 - ageHours / maxHours);
  const opacity = 0.10 + freshness * 0.42;
  const radius = 85 + freshness * 75;
  return (
    <Circle
      center={[Number(incident.latitude), Number(incident.longitude)]}
      radius={radius}
      pathOptions={{ color: '#e32646', fillColor: '#ff234f', fillOpacity: opacity, opacity: Math.min(opacity + 0.2, 0.8), weight: 2 }}
      eventHandlers={{ click: () => onClick?.(incident) }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.96}>
        <strong>{incident.incidentType?.name || 'Hecho reportado'}</strong><br />
        {incident.code} · {relativeTime(incident.createdAt)}<br />
        <small>Clic para abrir Hechos</small>
      </Tooltip>
    </Circle>
  );
}
