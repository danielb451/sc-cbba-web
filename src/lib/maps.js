export const COCHABAMBA_CENTER = [-17.3935, -66.1570];

export function haversineMeters(a, b) {
  const R = 6371000;
  const lat1 = (Number(a.latitude) * Math.PI) / 180;
  const lat2 = (Number(b.latitude) * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((Number(b.longitude) - Number(a.longitude)) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function clusterRoutePoints(points = [], thresholdMeters = 10) {
  const clusters = [];
  points.forEach((point, i) => {
    const normalized = { ...point, index: point.index || i + 1 };
    let cluster = clusters.find((item) => haversineMeters(item.center, normalized) <= thresholdMeters);
    if (!cluster) {
      cluster = { center: normalized, points: [] };
      clusters.push(cluster);
    }
    cluster.points.push(normalized);
    const n = cluster.points.length;
    cluster.center = {
      latitude: cluster.points.reduce((sum, p) => sum + Number(p.latitude), 0) / n,
      longitude: cluster.points.reduce((sum, p) => sum + Number(p.longitude), 0) / n,
    };
  });
  return clusters;
}

export function geoJsonCenter(geoJson) {
  try {
    const geometry = geoJson?.type === 'Feature' ? geoJson.geometry : geoJson;
    const coords = geometry?.type === 'Polygon' ? geometry.coordinates?.[0] : geometry?.type === 'MultiPolygon' ? geometry.coordinates?.[0]?.[0] : null;
    if (!coords?.length) return null;
    const sum = coords.reduce((acc, [lng, lat]) => [acc[0] + lat, acc[1] + lng], [0, 0]);
    return [sum[0] / coords.length, sum[1] / coords.length];
  } catch {
    return null;
  }
}
