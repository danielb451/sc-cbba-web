import { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Polygon,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { COCHABAMBA_CENTER } from '../../lib/maps.js';

function paths(value, path = []) {
  if (!value) return [];
  if (value.type === 'Feature')
    return paths(value.geometry, [...path, 'geometry']);
  if (value.type === 'FeatureCollection')
    return value.features.flatMap((f, i) => paths(f, [...path, 'features', i]));
  if (value.type === 'LineString')
    return [{ path: [...path, 'coordinates'], points: value.coordinates }];
  if (value.type === 'Polygon')
    return value.coordinates.map((r, i) => ({
      path: [...path, 'coordinates', i],
      points: r.slice(0, -1),
    }));
  if (value.type === 'MultiPolygon')
    return value.coordinates.flatMap((p, i) =>
      p.map((r, j) => ({
        path: [...path, 'coordinates', i, j],
        points: r.slice(0, -1),
      })),
    );
  return [];
}
function Clicks({ onPoint }) {
  useMapEvents({ click: (e) => onPoint([e.latlng.lng, e.latlng.lat]) });
  return null;
}
function Fit({ points }) {
  const map = useMap();
  const ref = useRef();
  useEffect(() => {
    L.DomEvent.disableClickPropagation(ref.current);
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      className="geometry-fit"
      onClick={() =>
        points.length &&
        map.fitBounds(
          points.map((p) => [p[1], p[0]]),
          { padding: [35, 35], maxZoom: 17 },
        )
      }
    >
      Centrar dibujo
    </button>
  );
}
export default function GeometryEditor({ value, onChange, mode = 'Polygon' }) {
  const [ring, setRing] = useState(0),
    [history, setHistory] = useState([]),
    [selected, setSelected] = useState(null);
  const all = paths(value),
    active = all[ring] || all[0],
    points = active?.points || [];
  const commit = (next) => {
    setHistory((h) => [...h.slice(-49), value]);
    onChange(next);
  };
  const change = (next) => {
    const coords =
      mode === 'Polygon' ? (next.length ? [...next, next[0]] : []) : next;
    if (active) {
      const clone = structuredClone(value);
      let target = clone;
      active.path.slice(0, -1).forEach((k) => (target = target[k]));
      target[active.path.at(-1)] = coords;
      commit(clone);
    } else
      commit({
        type: mode,
        coordinates: mode === 'Polygon' ? [coords] : coords,
      });
  };
  const positions = points.map((p) => [p[1], p[0]]);
  return (
    <div className="geometry-editor">
      <p>
        Haz clic para añadir puntos en orden. Arrastra los puntos para moverlos.
        Selecciona un punto para eliminarlo.
        {mode === 'Polygon'
          ? ' El contorno se cierra automáticamente.'
          : ' Dibuja la ruta siguiendo las calles; los puntos se unen con líneas rectas.'}
      </p>
      {all.length > 1 && (
        <label>
          Contorno a editar{' '}
          <select
            value={ring}
            onChange={(e) => {
              setRing(Number(e.target.value));
              setSelected(null);
            }}
          >
            {all.map((_, i) => (
              <option key={i} value={i}>
                Contorno {i + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      <MapContainer
        center={positions[0] || COCHABAMBA_CENTER}
        zoom={14}
        style={{ height: 360, width: '100%' }}
        doubleClickZoom={false}
      >
        <TileLayer
          url={
            import.meta.env.VITE_MAP_TILE_URL ||
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          attribution="&copy; OpenStreetMap contributors"
        />
        <Clicks onPoint={(p) => change([...points, p])} />
        {all.map((part, i) =>
          i !== ring ? (
            <Polyline
              key={i}
              positions={part.points.map((p) => [p[1], p[0]])}
              pathOptions={{ color: '#94a3b8' }}
            />
          ) : null,
        )}
        {positions.length > 1 &&
          (mode === 'Polygon' && positions.length > 2 ? (
            <Polygon positions={positions} pathOptions={{ color: '#7c3aed' }} />
          ) : (
            <Polyline
              positions={positions}
              pathOptions={{ color: '#7c3aed' }}
            />
          ))}
        {positions.map((p, i) => (
          <Marker
            key={i}
            position={p}
            draggable
            icon={L.divIcon({
              className: 'geometry-point',
              html: String(i + 1),
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            })}
            eventHandlers={{
              click: () => setSelected(i),
              dragend: (e) => {
                const ll = e.target.getLatLng();
                change(points.map((p, j) => (j === i ? [ll.lng, ll.lat] : p)));
              },
            }}
          />
        ))}
        <Fit points={points} />
      </MapContainer>
      <div className="geometry-tools">
        <span>
          {points.length} puntos · mínimo {mode === 'Polygon' ? 3 : 2}
        </span>
        <button
          type="button"
          className="button button--secondary"
          disabled={!history.length}
          onClick={() => {
            onChange(history.at(-1));
            setHistory((h) => h.slice(0, -1));
            setSelected(null);
          }}
        >
          Deshacer
        </button>
        <button
          type="button"
          className="button button--secondary"
          disabled={selected == null || selected >= points.length}
          onClick={() => {
            change(points.filter((_, i) => i !== selected));
            setSelected(null);
          }}
        >
          Eliminar punto {selected == null ? '' : selected + 1}
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => {
            commit(null);
            setRing(0);
            setSelected(null);
          }}
        >
          Limpiar dibujo
        </button>
      </div>
    </div>
  );
}
