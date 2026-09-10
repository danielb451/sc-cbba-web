import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, FileSpreadsheet, Printer, Search } from 'lucide-react';
import { guardApi, reportApi } from '../api/endpoints.js';
import { apiError } from '../api/client.js';
import SectionHeader from '../components/SectionHeader.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { dateTime, distance, humanize } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

const reportTypes = [
  { key: 'guards', label: 'Guardias' },
  { key: 'services', label: 'Servicios' },
  { key: 'incidents', label: 'Hechos' },
  { key: 'routes', label: 'Recorridos' },
];

function csvEscape(value) {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(rows, name) {
  if (!rows?.length) return;
  const keys = Object.keys(rows[0]).filter((key) => typeof rows[0][key] !== 'object');
  const csv = [keys.join(','), ...rows.map((row) => keys.map((key) => csvEscape(row[key])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const toast = useToast();
  const [type, setType] = useState('guards');
  const [filters, setFilters] = useState({ from: '', to: '', guardId: '', priority: '', status: '' });
  const [result, setResult] = useState([]);
  const guards = useQuery({ queryKey: ['guards', 'report-filter'], queryFn: () => guardApi.list({ limit: 500 }) });
  const generate = useMutation({
    mutationFn: async () => {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      if (type === 'guards') return reportApi.guards(params);
      if (type === 'services') return reportApi.services(params);
      if (type === 'incidents') return reportApi.incidents(params);
      return reportApi.routes(params);
    },
    onSuccess: (data) => setResult(data || []),
    onError: (error) => toast.error(apiError(error)),
  });

  const chartData = useMemo(() => {
    if (type === 'guards') return result.slice(0, 12).map((r) => ({ name: r.code, valor: r.services || 0 }));
    if (type === 'routes') return result.slice(0, 12).map((r) => ({ name: r.guard?.code || r.serviceId?.slice(0, 5), valor: r.points || 0 }));
    if (type === 'services') return result.slice(0, 12).map((r) => ({ name: r.guard?.code || 'Guardia', valor: Math.round((r.distanceMeters || 0) / 1000 * 10) / 10 }));
    const grouped = {};
    result.forEach((r) => { const key = r.incidentType?.name || 'Otro'; grouped[key] = (grouped[key] || 0) + 1; });
    return Object.entries(grouped).map(([name, valor]) => ({ name, valor })).slice(0, 12);
  }, [result, type]);

  const set = (key) => (e) => setFilters((v) => ({ ...v, [key]: e.target.value }));

  return (
    <div>
      <SectionHeader title="Reportes" text="Consulta administrativa de guardias, servicios, hechos y recorridos. El backend entrega JSON y esta interfaz permite filtrar, imprimir y exportar CSV." />
      <div className="report-tabs">{reportTypes.map((item) => <button className={type === item.key ? 'active' : ''} key={item.key} onClick={() => { setType(item.key); setResult([]); }}>{item.label}</button>)}</div>
      <section className="panel report-filters">
        <div className="form-field"><label>Desde</label><input type="date" value={filters.from} onChange={set('from')} /></div>
        <div className="form-field"><label>Hasta</label><input type="date" value={filters.to} onChange={set('to')} /></div>
        <div className="form-field"><label>Guardia</label><select value={filters.guardId} onChange={set('guardId')}><option value="">Todos</option>{guards.data?.items?.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.firstName} {g.lastName}</option>)}</select></div>
        {type === 'incidents' ? <><div className="form-field"><label>Prioridad</label><select value={filters.priority} onChange={set('priority')}><option value="">Todas</option><option>BAJA</option><option>MEDIA</option><option>ALTA</option><option>CRITICA</option></select></div><div className="form-field"><label>Estado</label><select value={filters.status} onChange={set('status')}><option value="">Todos</option><option>REPORTADO</option><option>EN_REVISION</option><option>ATENDIDO</option><option>CERRADO</option></select></div></> : null}
        <button className="button button--primary" onClick={() => generate.mutate()} disabled={generate.isPending}><Search size={18} /> {generate.isPending ? 'Generando...' : 'Generar reporte'}</button>
      </section>

      {generate.isPending ? <LoadingState label="Generando reporte..." /> : result.length ? (
        <>
          <section className="report-summary-grid">
            <article className="panel report-chart"><header><h3>Resumen visual</h3><span>{result.length} registros</span></header><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="4 4" stroke="#e8eaf3"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Bar dataKey="valor" fill="#6540bd" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div></article>
            <article className="panel report-actions"><FileSpreadsheet size={34}/><h3>Resultados listos</h3><p>Exporta la consulta actual o utiliza la vista de impresión del navegador.</p><button className="button button--secondary" onClick={() => downloadCsv(result, `sc-cbba-${type}.csv`)}><Download size={18}/> Exportar CSV</button><button className="button button--ghost" onClick={() => window.print()}><Printer size={18}/> Imprimir</button></article>
          </section>
          <section className="panel table-panel"><div className="table-wrap"><table className="data-table"><thead>{type === 'guards' ? <tr><th>Guardia</th><th>Estado</th><th>Servicios</th><th>Minutos</th><th>Hechos</th></tr> : type === 'services' ? <tr><th>Guardia</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Base</th><th>Zona</th><th>Distancia</th></tr> : type === 'incidents' ? <tr><th>Código</th><th>Tipo</th><th>Guardia</th><th>Fecha</th><th>Prioridad</th><th>Estado</th></tr> : <tr><th>Servicio</th><th>Guardia</th><th>Inicio</th><th>Fin</th><th>Distancia</th><th>Puntos</th></tr>}</thead><tbody>{result.map((r, i) => type === 'guards' ? <tr key={r.guardId}><td><b>{r.code}</b> · {r.name}</td><td><StatusBadge active={r.active}/></td><td>{r.services}</td><td>{Math.round(r.totalMinutes)}</td><td>{r.incidents}</td></tr> : type === 'services' ? <tr key={r.id}><td>{r.guard?.code} · {r.guard?.firstName} {r.guard?.lastName}</td><td>{dateTime(r.startedAt)}</td><td>{dateTime(r.endedAt)}</td><td><StatusBadge value={r.status}/></td><td>{r.patrol?.name||r.patrol?.code||'—'}</td><td>{r.zone?.name||'—'}</td><td>{distance(r.distanceMeters)}</td></tr> : type === 'incidents' ? <tr key={r.id}><td><b>{r.code}</b></td><td>{r.incidentType?.name}</td><td>{r.guard?.code} · {r.guard?.firstName} {r.guard?.lastName}</td><td>{dateTime(r.createdAt)}</td><td><StatusBadge value={r.priority}/></td><td><StatusBadge value={r.status}/></td></tr> : <tr key={r.serviceId||i}><td>{r.serviceId?.slice(0,8)}...</td><td>{r.guard?.code} · {r.guard?.name}</td><td>{dateTime(r.startedAt)}</td><td>{dateTime(r.endedAt)}</td><td>{distance(r.distanceMeters)}</td><td>{r.points}</td></tr>)}</tbody></table></div></section>
        </>
      ) : <EmptyState title="Genera un reporte" text="Selecciona los filtros y pulsa “Generar reporte” para consultar información." />}
    </div>
  );
}
