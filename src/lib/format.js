export function dateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function shortDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(new Date(value));
}

export function timeOnly(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function relativeTime(value) {
  if (!value) return 'Sin datos';
  const diff = Date.now() - new Date(value).getTime();
  const seconds = Math.max(Math.floor(diff / 1000), 0);
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export function duration(start, end = new Date()) {
  if (!start) return '—';
  const ms = Math.max(new Date(end || Date.now()) - new Date(start), 0);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function distance(meters) {
  if (meters === null || meters === undefined) return '—';
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

export function percent(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function humanize(value = '') {
  return String(value)
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

export function assetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const origin = api.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}
