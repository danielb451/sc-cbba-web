import { GeoJSON, Tooltip } from 'react-leaflet';

const ZONE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#22c55e',
  '#06b6d4',
  '#6366f1',
];

export function getZoneColor(zone) {
  if (!zone?.id) {
    return '#64748b';
  }

  let hash = 0;

  for (let i = 0; i < zone.id.length; i += 1) {
    hash = zone.id.charCodeAt(i) + ((hash << 5) - hash);
  }

  return ZONE_COLORS[Math.abs(hash) % ZONE_COLORS.length];
}

function normalizeGeoJson(geoJson) {
  if (!geoJson) {
    return null;
  }

  if (typeof geoJson === 'object') {
    return geoJson;
  }

  if (typeof geoJson === 'string') {
    try {
      return JSON.parse(geoJson);
    } catch (error) {
      console.error('GeoJSON inválido:', error);
      return null;
    }
  }

  return null;
}

export default function JurisdictionLayer({
  zone,
  selected = false,
  onClick,
  interactive = true,
}) {
  const geoJson = normalizeGeoJson(zone?.geoJson);

  if (!geoJson) {
    return null;
  }

  const color = getZoneColor(zone);

  const normalStyle = {
    color,
    weight: selected ? 4 : 2,
    opacity: selected ? 1 : 0.8,
    fillColor: color,
    fillOpacity: selected ? 0.22 : 0.1,
    dashArray: selected ? undefined : '6 4',
  };

  const eventHandlers = interactive
    ? {
        click: () => {
          onClick?.(zone);
        },

        mouseover: (event) => {
          event.target.setStyle({
            weight: selected ? 4 : 3,
            fillOpacity: selected ? 0.28 : 0.18,
          });
        },

        mouseout: (event) => {
          event.target.setStyle(normalStyle);
        },
      }
    : {};

  return (
    <GeoJSON
      key={`${zone.id}-${selected}-${interactive}`}
      data={geoJson}
      style={normalStyle}
      interactive={interactive}
      eventHandlers={eventHandlers}
    >
      {interactive ? (
        <Tooltip sticky>
          <div>
            <strong>{zone.name || 'Zona operativa'}</strong>

            {zone.description ? (
              <>
                <br />
                <span>{zone.description}</span>
              </>
            ) : null}
          </div>
        </Tooltip>
      ) : null}
    </GeoJSON>
  );
}