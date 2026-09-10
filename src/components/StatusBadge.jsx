import { humanize } from '../lib/format.js';

const tone = {
  ACTIVO: 'success',
  ACTIVA: 'success',
  ACTUAL: 'success',
  EN_SERVICIO: 'success',
  ATENDIDO: 'info',
  FINALIZADO: 'info',
  EN_REVISION: 'warning',
  DESACTUALIZADA: 'warning',
  REPORTADO: 'danger',
  CRITICA: 'danger',
  ALTA: 'danger',
  SIN_COMUNICACION: 'danger',
  INACTIVO: 'neutral',
  INACTIVA: 'neutral',
  SIN_DATOS: 'neutral',
  CANCELADO: 'neutral',
  CERRADO: 'neutral',
  MEDIA: 'warning',
  BAJA: 'info',
};

export default function StatusBadge({ value, active, children }) {
  const normalized = active !== undefined ? (active ? 'ACTIVO' : 'INACTIVO') : String(value || 'SIN_DATOS').toUpperCase();
  return <span className={`badge badge--${tone[normalized] || 'neutral'}`}>{children || humanize(normalized)}</span>;
}
