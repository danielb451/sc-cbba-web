import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../../api/endpoints.js';
import JurisdictionLayer from './JurisdictionLayer.jsx';

export default function ConfiguredZonesLayer() {
  const zones = useQuery({
    queryKey: ['zones'],
    queryFn: catalogApi.zones,
    staleTime: 30_000,
  });

  const visibleZones = (zones.data || []).filter(
    (zone) => zone.active !== false && zone.geoJson,
  );

  return (
    <>
      {visibleZones.map((zone) => (
        <JurisdictionLayer
          key={`configured-zone-${zone.id}`}
          zone={zone}
          interactive={false}
        />
      ))}
    </>
  );
}