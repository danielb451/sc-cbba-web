const labels = {
  EN_RUTA: 'En la ruta asignada',
  FUERA_DE_RUTA: 'Alerta: fuera de la ruta',
  EN_ZONA: 'Dentro de su zona',
  FUERA_DE_ZONA: 'Alerta: fuera de su zona',
  SIN_RUTA: 'Sin ruta asignada',
  SIN_ZONA: 'Sin zona delimitada',
  SIN_DATOS: 'Sin GPS reciente para verificar',
  GPS_IMPRECISO: 'GPS impreciso: no se puede confirmar',
};
export default function ComplianceStatus({ compliance, onlyZone = false }) {
  return (
    <div className="compliance-status" aria-live="polite">
      {(onlyZone ? ['zoneStatus'] : ['routeStatus', 'zoneStatus']).map((k) => {
        const status = compliance?.[k] || 'SIN_DATOS';
        return (
          <div
            key={k}
            className={
              status.startsWith('FUERA')
                ? 'compliance-alert'
                : status.startsWith('EN_')
                  ? 'compliance-ok'
                  : 'compliance-unknown'
            }
          >
            <b>{k === 'routeStatus' ? 'Ruta: ' : 'Zona: '}</b>
            {labels[status] || status}
            {k === 'routeStatus' && compliance?.distanceMeters != null
              ? ` · ${compliance.distanceMeters} m del trazado`
              : ''}
          </div>
        );
      })}
    </div>
  );
}
