import { useEffect, useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet.heat';

import { reportApi } from '../../api/endpoints.js';
import { COCHABAMBA_CENTER } from '../../lib/maps.js';

function monthRange(month) {
  const [year, monthNumber] = month.split('-').map(Number);

  const start = new Date(year, monthNumber - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, monthNumber, 0, 23, 59, 59, 999);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function FitIncidents({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude]));

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 16,
      });
    }
  }, [map, points]);

  return null;
}

function HeatOverlay({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !points.length) {
      return undefined;
    }

    let heatLayer = null;

    const drawHeat = () => {
      if (heatLayer) {
        map.removeLayer(heatLayer);
      }

      const zoom = map.getZoom();

      /*
       * Mientras más zoom,
       * mayor radio visual.
       *
       * Esto evita que el heatmap
       * se vea diminuto al acercarse.
       */
      const radius = Math.min(
        70,
        Math.max(
          32,
          32 + (zoom - 13) * 8,
        ),
      );

      const blur = Math.min(
        55,
        Math.max(
          24,
          24 + (zoom - 13) * 6,
        ),
      );

      const heatPoints = points.map(
        (point) => [
          point.latitude,
          point.longitude,
          point.weight,
        ],
      );

      heatLayer = L.heatLayer(
        heatPoints,
        {
          radius,
          blur,

          maxZoom: 19,

          minOpacity: 0.34,

          gradient: {
            0.10: '#ffd6d6',
            0.25: '#ff9b9b',
            0.40: '#ff6666',
            0.55: '#ff3333',
            0.70: '#ef1b1b',
            0.85: '#c8102e',
            1.00: '#7f0015',
          },
        },
      );

      heatLayer.addTo(map);
    };

    drawHeat();

    map.on('zoomend', drawHeat);

    return () => {
      map.off('zoomend', drawHeat);

      if (heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, points]);

  return null;
}

export default function MonthlyIncidentZonesMap({ month }) {
  const range = useMemo(() => monthRange(month), [month]);

  const incidents = useQuery({
    queryKey: ['reports', 'incident-heatmap', month],
    queryFn: () =>
      reportApi.incidents({
        from: range.from,
        to: range.to,
      }),
  });

  const rows = useMemo(() => {
    if (Array.isArray(incidents.data)) {
      return incidents.data;
    }

    return incidents.data?.items || [];
  }, [incidents.data]);

  const points = useMemo(() => {
    const valid = rows
      .map((incident) => ({
        ...incident,
        latitude: Number(incident.latitude),
        longitude: Number(incident.longitude),
      }))
      .filter(
        (incident) =>
          Number.isFinite(incident.latitude) &&
          Number.isFinite(incident.longitude),
      );

    const frequency = new Map();

    valid.forEach((incident) => {
      const key = `${incident.latitude.toFixed(5)},${incident.longitude.toFixed(5)}`;
      frequency.set(key, (frequency.get(key) || 0) + 1);
    });

    return valid.map((incident) => {
      const key = `${incident.latitude.toFixed(5)},${incident.longitude.toFixed(5)}`;
      const count = frequency.get(key) || 1;

      return {
        ...incident,
        weight: Math.min(1, 0.22 + count * 0.18),
        repeatedCount: count,
      };
    });
  }, [rows]);

  if (incidents.isLoading) {
    return (
      <section className="panel">
        <div style={{ padding: 24 }}>Cargando mapa de calor...</div>
      </section>
    );
  }

  if (incidents.isError) {
    return (
      <section className="panel">
        <div style={{ padding: 24 }}>No se pudo cargar el mapa de calor.</div>
      </section>
    );
  }

  return (
    <section
      className="panel"
      style={{ overflow: 'hidden' }}
    >
      <header
        style={{
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Mapa de calor de hechos</h3>
          <p style={{ margin: '5px 0 0', color: '#64748b' }}>
            Zonas con mayor concentración de reportes del mes.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <strong style={{ display: 'block', fontSize: 20 }}>
            {rows.length}
          </strong>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            reportes
          </span>
        </div>
      </header>

      <div style={{ height: 590, position: 'relative' }}>
        <MapContainer
          center={COCHABAMBA_CENTER}
          zoom={13}
          className="leaflet-map"
        >
          <TileLayer
            url={
              import.meta.env.VITE_MAP_TILE_URL ||
              'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
            attribution={
              import.meta.env.VITE_MAP_ATTRIBUTION ||
              '&copy; OpenStreetMap contributors'
            }
          />

          <FitIncidents points={points} />
          <HeatOverlay points={points} />

          {points.map((incident) => (
            <CircleMarker
              key={incident.id}
              center={[incident.latitude, incident.longitude]}
              radius={4}
              pathOptions={{
                color: '#991b1b',
                fillColor: '#dc2626',
                fillOpacity: 0.55,
                opacity: 0.7,
                weight: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -3]}>
                <div style={{ minWidth: 170 }}>
                  <strong>{incident.code || 'Hecho'}</strong>
                  <br />
                  {incident.incidentType?.name || 'Sin tipo'}
                  <br />
                  Prioridad: <b>{incident.priority || '—'}</b>
                  <br />
                  Estado: <b>{incident.status || '—'}</b>
                  {incident.repeatedCount > 1 ? (
                    <>
                      <br />
                      <span>
                        Punto repetido: <b>{incident.repeatedCount}</b>
                      </span>
                    </>
                  ) : null}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        <div
          style={{
            position: 'absolute',
            zIndex: 500,
            left: 16,
            bottom: 16,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(255,255,255,.95)',
            boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          }}
        >
          <strong
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 12,
            }}
          >
            Intensidad
          </strong>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#ffb3b3',
              }}
            />
            <span style={{ fontSize: 11 }}>Baja</span>

            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#ff4d4d',
              }}
            />
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#991b1b',
              }}
            />
            <span style={{ fontSize: 11 }}>Alta</span>
          </div>
        </div>
      </div>
    </section>
  );
}