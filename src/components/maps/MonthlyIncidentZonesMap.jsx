import { useMemo } from 'react';
import {
  GeoJSON,
  MapContainer,
  TileLayer,
  Tooltip,
} from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';

import {
  catalogApi,
  reportApi,
} from '../../api/endpoints.js';

import { COCHABAMBA_CENTER } from '../../lib/maps.js';

function normalizeGeoJson(value) {
  if (!value) return null;

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return null;
}

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

function pointInRing(point, ring) {
  const [x, y] = point;

  let inside = false;

  for (
    let i = 0, j = ring.length - 1;
    i < ring.length;
    j = i++
  ) {
    const xi = Number(ring[i][0]);
    const yi = Number(ring[i][1]);

    const xj = Number(ring[j][0]);
    const yj = Number(ring[j][1]);

    const intersects =
      yi > y !== yj > y &&
      x <
        ((xj - xi) * (y - yi)) /
          (yj - yi || Number.EPSILON) +
          xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygon(point, polygon) {
  if (!polygon?.length) return false;

  if (!pointInRing(point, polygon[0])) {
    return false;
  }

  // Huecos internos del polígono.
  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(point, polygon[i])) {
      return false;
    }
  }

  return true;
}

function geometryContainsPoint(
  geometry,
  longitude,
  latitude,
) {
  if (!geometry) return false;

  if (geometry.type === 'Feature') {
    return geometryContainsPoint(
      geometry.geometry,
      longitude,
      latitude,
    );
  }

  if (geometry.type === 'FeatureCollection') {
    return (geometry.features || []).some((feature) =>
      geometryContainsPoint(
        feature,
        longitude,
        latitude,
      ),
    );
  }

  if (geometry.type === 'Polygon') {
    return pointInPolygon(
      [longitude, latitude],
      geometry.coordinates,
    );
  }

  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates || []).some(
      (polygon) =>
        pointInPolygon(
          [longitude, latitude],
          polygon,
        ),
    );
  }

  return false;
}

function getIntensity(count, max) {
  if (!count || !max) return 0;

  return count / max;
}

export default function MonthlyIncidentZonesMap({
  month,
}) {
  const range = useMemo(
    () => monthRange(month),
    [month],
  );

  const zones = useQuery({
    queryKey: ['zones'],
    queryFn: catalogApi.zones,
  });

  const incidents = useQuery({
    queryKey: [
      'reports',
      'incident-zone-map',
      month,
    ],
    queryFn: () =>
      reportApi.incidents({
        from: range.from,
        to: range.to,
      }),
  });

  const zoneStats = useMemo(() => {
    const currentZones = (zones.data || [])
      .filter(
        (zone) =>
          zone.active !== false &&
          zone.geoJson,
      )
      .map((zone) => ({
        ...zone,
        geometry: normalizeGeoJson(
          zone.geoJson,
        ),
        incidentCount: 0,
      }));

    for (const incident of incidents.data || []) {
      const latitude = Number(
        incident.latitude,
      );

      const longitude = Number(
        incident.longitude,
      );

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        continue;
      }

      const zone = currentZones.find(
        (item) =>
          geometryContainsPoint(
            item.geometry,
            longitude,
            latitude,
          ),
      );

      if (zone) {
        zone.incidentCount += 1;
      }
    }

    return currentZones.sort(
      (a, b) =>
        b.incidentCount -
        a.incidentCount,
    );
  }, [zones.data, incidents.data]);

  const maxCount = Math.max(
    0,
    ...zoneStats.map(
      (zone) => zone.incidentCount,
    ),
  );

  const totalIncidents =
    incidents.data?.length || 0;

  if (zones.isLoading || incidents.isLoading) {
    return (
      <section className="panel">
        <div style={{ padding: 24 }}>
          Cargando mapa de hechos...
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
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
            }}
          >
            Hechos por zona
          </h3>

          <p
            style={{
              margin: '5px 0 0',
              opacity: 0.7,
            }}
          >
            Intensidad según cantidad de hechos
            registrados durante el mes.
          </p>
        </div>

        <strong>
          {totalIncidents} hechos
        </strong>
      </header>

      <div
        style={{
          height: 580,
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

          {zoneStats.map((zone) => {
            const intensity = getIntensity(
              zone.incidentCount,
              maxCount,
            );

            const hasIncidents =
              zone.incidentCount > 0;

            return (
              <GeoJSON
                key={`report-zone-${zone.id}-${month}`}
                data={zone.geometry}
                style={{
                  color: hasIncidents
                    ? '#9f1239'
                    : '#64748b',
                  weight: hasIncidents
                    ? 2.5
                    : 1.5,
                  opacity: hasIncidents
                    ? 0.9
                    : 0.45,

                  fillColor: hasIncidents
                    ? '#e11d48'
                    : '#94a3b8',

                  fillOpacity:
                    hasIncidents
                      ? 0.15 +
                        intensity * 0.55
                      : 0.04,
                }}
              >
                <Tooltip sticky>
                  <div>
                    <strong>
                      {zone.name}
                    </strong>

                    <br />

                    {zone.incidentCount}{' '}
                    {zone.incidentCount === 1
                      ? 'hecho'
                      : 'hechos'}
                  </div>
                </Tooltip>
              </GeoJSON>
            );
          })}
        </MapContainer>

        <div
          style={{
            position: 'absolute',
            zIndex: 500,
            left: 16,
            bottom: 16,
            width: 230,
            padding: 14,
            borderRadius: 14,
            background:
              'rgba(255,255,255,.94)',
            boxShadow:
              '0 8px 24px rgba(0,0,0,.12)',
          }}
        >
          <strong>
            Zonas con más hechos
          </strong>

          <div
            style={{
              marginTop: 9,
              display: 'grid',
              gap: 6,
            }}
          >
            {zoneStats
              .filter(
                (zone) =>
                  zone.incidentCount > 0,
              )
              .slice(0, 5)
              .map((zone, index) => (
                <div
                  key={zone.id}
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 10,
                  }}
                >
                  <span>
                    {index + 1}. {zone.name}
                  </span>

                  <b>
                    {zone.incidentCount}
                  </b>
                </div>
              ))}

            {!zoneStats.some(
              (zone) =>
                zone.incidentCount > 0,
            ) && (
              <span>
                Sin hechos dentro de zonas
                durante este mes.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}