import L from 'leaflet';
import { Marker, Polyline, Popup } from 'react-leaflet';
import { clusterRoutePoints } from '../../lib/maps.js';
import { dateTime } from '../../lib/format.js';

function routeIcon(label, grouped = false) {
  return L.divIcon({
    className: 'route-point-wrapper',
    html: `<span class="route-point ${grouped ? 'route-point--grouped' : ''}">${label}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function endpointIcon(label, type) {
  return L.divIcon({
    className: 'route-point-wrapper',
    html: `<span class="route-endpoint route-endpoint--${type}">${label}</span>`,
    iconSize: [44, 30],
    iconAnchor: [22, 15],
  });
}

export default function RouteLayer({ route, livePoints = [] }) {
  if (!route) return null;
  const rawPoints = [...(route.points || [])];
  for (const livePoint of livePoints) {
    if (livePoint && !rawPoints.some((p) => p.id && p.id === livePoint.id)) {
      rawPoints.push({ ...livePoint, index: livePoint.index || rawPoints.length + 1, recordedAt: livePoint.timestamp || livePoint.recordedAt });
    }
  }

  const path = [
    route.startPoint ? [Number(route.startPoint.latitude), Number(route.startPoint.longitude)] : null,
    ...rawPoints.map((p) => [Number(p.latitude), Number(p.longitude)]),
    route.endPoint ? [Number(route.endPoint.latitude), Number(route.endPoint.longitude)] : null,
  ].filter(Boolean);
  const clusters = clusterRoutePoints(rawPoints, 10);

  return (
    <>
      {path.length > 1 ? <Polyline positions={path} pathOptions={{ color: '#3158d6', weight: 4, opacity: 0.92 }} /> : null}
      {route.startPoint ? (
        <Marker position={[Number(route.startPoint.latitude), Number(route.startPoint.longitude)]} icon={endpointIcon('Inicio', 'start')}>
          <Popup>Inicio del servicio<br />{dateTime(route.startPoint.recordedAt)}</Popup>
        </Marker>
      ) : null}
      {clusters.map((cluster, idx) => {
        const first = cluster.points[0];
        const grouped = cluster.points.length > 1;
        const label = grouped ? `+${cluster.points.length - 1}` : first.index;
        return (
          <Marker
            key={`${first.id || first.index}-${idx}`}
            position={[cluster.center.latitude, cluster.center.longitude]}
            icon={routeIcon(label, grouped)}
          >
            <Popup>
              <strong>{grouped ? `${cluster.points.length} coordenadas agrupadas` : `Coordenada #${first.index}`}</strong><br />
              {grouped ? `Desde #${cluster.points[0].index} hasta #${cluster.points.at(-1).index}` : dateTime(first.recordedAt)}
            </Popup>
          </Marker>
        );
      })}
      {route.endPoint ? (
        <Marker position={[Number(route.endPoint.latitude), Number(route.endPoint.longitude)]} icon={endpointIcon('Fin', 'end')}>
          <Popup>Fin del servicio<br />{dateTime(route.endPoint.recordedAt)}</Popup>
        </Marker>
      ) : null}
    </>
  );
}
