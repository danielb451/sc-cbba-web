import { useEffect, useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';

import { reportApi } from '../../api/endpoints.js';
import { COCHABAMBA_CENTER } from '../../lib/maps.js';

/*
 * Distancia máxima para considerar varios hechos
 * como ocurridos en el mismo sector.
 *
 * 30 metros funciona bien para representar un mismo
 * lugar sin mezclar hechos demasiado alejados.
 */
const HOTSPOT_RADIUS_METERS = 30;

function monthRange(month) {
  const [year, monthNumber] = month
    .split('-')
    .map(Number);

  const start = new Date(
    year,
    monthNumber - 1,
    1,
    0,
    0,
    0,
    0,
  );

  const end = new Date(
    year,
    monthNumber,
    0,
    23,
    59,
    59,
    999,
  );

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function distanceMeters(
  lat1,
  lng1,
  lat2,
  lng2,
) {
  const earthRadius = 6371000;

  const toRadians = (value) =>
    (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );

  return earthRadius * c;
}

function buildHotspots(incidents) {
  const validIncidents = incidents
    .map((incident) => ({
      ...incident,
      __lat: Number(incident.latitude),
      __lng: Number(incident.longitude),
    }))
    .filter(
      (incident) =>
        Number.isFinite(incident.__lat) &&
        Number.isFinite(incident.__lng),
    );

  const clusters = [];

  for (const incident of validIncidents) {
    let nearestCluster = null;
    let nearestDistance = Infinity;

    for (const cluster of clusters) {
      const distance = distanceMeters(
        incident.__lat,
        incident.__lng,
        cluster.latitude,
        cluster.longitude,
      );

      if (
        distance <= HOTSPOT_RADIUS_METERS &&
        distance < nearestDistance
      ) {
        nearestCluster = cluster;
        nearestDistance = distance;
      }
    }

    if (!nearestCluster) {
      clusters.push({
        latitude: incident.__lat,
        longitude: incident.__lng,
        sumLatitude: incident.__lat,
        sumLongitude: incident.__lng,
        incidents: [incident],
      });

      continue;
    }

    nearestCluster.incidents.push(incident);

    nearestCluster.sumLatitude +=
      incident.__lat;

    nearestCluster.sumLongitude +=
      incident.__lng;

    nearestCluster.latitude =
      nearestCluster.sumLatitude /
      nearestCluster.incidents.length;

    nearestCluster.longitude =
      nearestCluster.sumLongitude /
      nearestCluster.incidents.length;
  }

  return clusters
    .map((cluster) => ({
      ...cluster,
      count: cluster.incidents.length,
    }))
    .sort((a, b) => b.count - a.count);
}

function hotspotStyle(count, maxCount) {
  const intensity =
    maxCount <= 1
      ? 0
      : (count - 1) /
        (maxCount - 1);

  /*
   * 1 hecho:
   * rojo claro y pequeño.
   *
   * Muchos hechos:
   * rojo oscuro, opaco y más grande.
   */
  const lightness =
    62 - intensity * 32;

  const color =
    `hsl(0, 84%, ${lightness}%)`;

  return {
    radius:
      8 +
      intensity * 15 +
      Math.min(count - 1, 5),

    color,
    fillColor: color,

    fillOpacity:
      0.42 +
      intensity * 0.46,

    opacity:
      0.75 +
      intensity * 0.25,

    weight:
      1.5 +
      intensity * 1.5,
  };
}

function FitHotspots({ hotspots }) {
  const map = useMap();

  useEffect(() => {
    if (!hotspots.length) return;

    const positions = hotspots.map(
      (hotspot) => [
        hotspot.latitude,
        hotspot.longitude,
      ],
    );

    if (positions.length === 1) {
      map.setView(
        positions[0],
        16,
      );

      return;
    }

    map.fitBounds(
      positions,
      {
        padding: [45, 45],
        maxZoom: 16,
      },
    );
  }, [map, hotspots]);

  return null;
}

function HotspotTooltip({ hotspot }) {
  const types = {};

  hotspot.incidents.forEach(
    (incident) => {
      const name =
        incident.incidentType?.name ||
        'Otro';

      types[name] =
        (types[name] || 0) + 1;
    },
  );

  return (
    <div
      style={{
        minWidth: 150,
      }}
    >
      <strong>
        {hotspot.count}{' '}
        {hotspot.count === 1
          ? 'hecho registrado'
          : 'hechos registrados'}
      </strong>

      <div
        style={{
          marginTop: 6,
        }}
      >
        {Object.entries(types)
          .slice(0, 5)
          .map(([name, count]) => (
            <div key={name}>
              {name}: <b>{count}</b>
            </div>
          ))}
      </div>
    </div>
  );
}

export default function MonthlyIncidentZonesMap({
  month,
}) {
  const range = useMemo(
    () => monthRange(month),
    [month],
  );

  const incidents = useQuery({
    queryKey: [
      'reports',
      'incident-hotspots',
      month,
    ],

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

  const hotspots = useMemo(
    () => buildHotspots(rows),
    [rows],
  );

  const maxCount = Math.max(
    1,
    ...hotspots.map(
      (hotspot) => hotspot.count,
    ),
  );

  if (incidents.isLoading) {
    return (
      <section className="panel">
        <div
          style={{
            padding: 24,
          }}
        >
          Cargando mapa de hechos...
        </div>
      </section>
    );
  }

  if (incidents.isError) {
    return (
      <section className="panel">
        <div
          style={{
            padding: 24,
          }}
        >
          No se pudo cargar el mapa de
          hechos.
        </div>
      </section>
    );
  }

  return (
    <section
      className="panel"
      style={{
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            'space-between',
          gap: 20,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
            }}
          >
            Concentración de hechos
          </h3>

          <p
            style={{
              margin: '5px 0 0',
              color: '#64748b',
            }}
          >
            Ubicaciones donde los
            guardias registraron hechos
            durante el mes.
          </p>
        </div>

        <div
          style={{
            textAlign: 'right',
          }}
        >
          <strong
            style={{
              display: 'block',
              fontSize: 20,
            }}
          >
            {rows.length}
          </strong>

          <span
            style={{
              fontSize: 12,
              color: '#64748b',
            }}
          >
            hechos registrados
          </span>
        </div>
      </header>

      <div
        style={{
          height: 590,
          position: 'relative',
        }}
      >
        <MapContainer
          center={COCHABAMBA_CENTER}
          zoom={13}
          className="leaflet-map"
        >
          <TileLayer
            url={
              import.meta.env
                .VITE_MAP_TILE_URL ||
              'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
            attribution={
              import.meta.env
                .VITE_MAP_ATTRIBUTION ||
              '&copy; OpenStreetMap contributors'
            }
          />

          <FitHotspots
            hotspots={hotspots}
          />

          {hotspots.map(
            (hotspot, index) => {
              const style =
                hotspotStyle(
                  hotspot.count,
                  maxCount,
                );

              return (
                <CircleMarker
                  key={`${hotspot.latitude}-${hotspot.longitude}-${index}`}
                  center={[
                    hotspot.latitude,
                    hotspot.longitude,
                  ]}
                  radius={style.radius}
                  pathOptions={{
                    color:
                      style.color,
                    fillColor:
                      style.fillColor,
                    fillOpacity:
                      style.fillOpacity,
                    opacity:
                      style.opacity,
                    weight:
                      style.weight,
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -5]}
                  >
                    <HotspotTooltip
                      hotspot={
                        hotspot
                      }
                    />
                  </Tooltip>
                </CircleMarker>
              );
            },
          )}
        </MapContainer>

        {/* LEYENDA */}

        <div
          style={{
            position: 'absolute',
            zIndex: 500,
            left: 16,
            bottom: 16,
            padding: '12px 14px',
            borderRadius: 14,
            background:
              'rgba(255,255,255,.95)',
            boxShadow:
              '0 8px 24px rgba(0,0,0,.12)',
          }}
        >
          <strong
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 12,
            }}
          >
            Concentración
          </strong>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background:
                  'hsl(0, 84%, 62%)',
              }}
            />

            <span
              style={{
                fontSize: 11,
              }}
            >
              Menor
            </span>

            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background:
                  'hsl(0, 84%, 46%)',
              }}
            />

            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background:
                  'hsl(0, 84%, 30%)',
              }}
            />

            <span
              style={{
                fontSize: 11,
              }}
            >
              Mayor
            </span>
          </div>
        </div>

        {/* RESUMEN */}

        {hotspots.length > 0 ? (
          <div
            style={{
              position: 'absolute',
              zIndex: 500,
              right: 16,
              bottom: 16,
              width: 205,
              padding: 14,
              borderRadius: 14,
              background:
                'rgba(255,255,255,.95)',
              boxShadow:
                '0 8px 24px rgba(0,0,0,.12)',
            }}
          >
            <strong
              style={{
                fontSize: 12,
              }}
            >
              Punto con mayor
              concentración
            </strong>

            <div
              style={{
                marginTop: 7,
                fontSize: 13,
              }}
            >
              <b>
                {hotspots[0].count}
              </b>{' '}
              {hotspots[0].count === 1
                ? 'hecho'
                : 'hechos'}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}