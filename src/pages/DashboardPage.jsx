import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { FileWarning, Shield, ShieldCheck, TriangleAlert } from 'lucide-react';
import { dashboardApi } from '../api/endpoints.js';
import PageHero from '../components/PageHero.jsx';
import StatCard from '../components/StatCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { timeOnly } from '../lib/format.js';

const PIE_COLORS = ['#6a42c2', '#2aaee7', '#f19b2c', '#d94287', '#3dbd82', '#9aa4b5'];

export default function DashboardPage() {
  const summary = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: dashboardApi.summary });
  const incidents = useQuery({ queryKey: ['dashboard', 'incidents', 7], queryFn: () => dashboardApi.incidents(7) });
  const activity = useQuery({ queryKey: ['dashboard', 'activity'], queryFn: () => dashboardApi.activity(12), refetchInterval: 30_000 });

  const lineData = useMemo(() => {
    const map = incidents.data?.byDay || {};
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      days.push({ date: new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' }).format(date), hechos: map[key] || 0 });
    }
    return days;
  }, [incidents.data]);

  const typeData = useMemo(
    () => Object.entries(incidents.data?.byType || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    [incidents.data],
  );

  const guardState = useMemo(() => {
    const s = summary.data;
    if (!s) return [];
    return [
      { name: 'En servicio', value: s.guardsInService || 0 },
      { name: 'Fuera de servicio', value: s.guardsOutOfService || 0 },
      { name: 'Inactivos', value: s.guardsInactive || 0 },
    ];
  }, [summary.data]);

  if (summary.isLoading && incidents.isLoading) return <LoadingState label="Cargando centro de operaciones..." />;
  const s = summary.data || {};
  const top = s.topIncidentType;

  return (
    <div className="dashboard-page">
      <PageHero />
      <section className="stat-grid">
        <StatCard icon={Shield} label="Guardias registrados" value={s.guardsRegistered ?? '—'} detail={`${s.guardsActive ?? 0} activos`} tone="purple" />
        <StatCard icon={ShieldCheck} label="Guardias en servicio" value={s.guardsInService ?? '—'} detail={`${s.guardsOutOfService ?? 0} fuera de servicio`} tone="cyan" />
        <StatCard icon={FileWarning} label="Hechos hoy" value={s.incidentsToday ?? '—'} detail={`${s.servicesFinishedToday ?? 0} servicios finalizados`} tone="pink" />
        <StatCard icon={TriangleAlert} label="Tipo de hecho más registrado" value={top?.name || 'Sin registros'} detail={top ? `${top.count} hechos registrados` : 'Todavía no hay datos'} tone="orange" />
      </section>

      <section className="chart-grid chart-grid--three">
        <article className="panel chart-panel">
          <header><h3>Hechos en los últimos 7 días</h3><span>Total: {incidents.data?.total || 0}</span></header>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e8eaf3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="hechos" stroke="#6941c6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chart-panel">
          <header><h3>Hechos por tipo</h3><span>{typeData.length} tipos</span></header>
          <div className="chart-box chart-box--pie">
            {typeData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" innerRadius="46%" outerRadius="72%" paddingAngle={2}>
                    {typeData.map((item, index) => <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Sin hechos" text="No existen hechos registrados en los últimos 7 días." />}
          </div>
        </article>

        <article className="panel chart-panel">
          <header><h3>Estado de guardias</h3><span>Total: {s.guardsRegistered || 0}</span></header>
          <div className="chart-box chart-box--pie">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={guardState} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="73%" paddingAngle={3}>
                  {guardState.map((item, index) => <Cell key={item.name} fill={['#35b779', '#3baee6', '#9aa4b5'][index]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="panel activity-panel">
        <header><h3>Actividad reciente</h3><span>Actualización automática</span></header>
        {activity.isLoading ? <LoadingState /> : activity.data?.length ? (
          <div className="table-wrap">
            <table className="data-table data-table--compact">
              <thead><tr><th>Hora</th><th>Tipo</th><th>Descripción</th><th>Usuario</th><th>Ubicación</th></tr></thead>
              <tbody>
                {activity.data.map((item) => (
                  <tr key={item.id}>
                    <td>{timeOnly(item.at)}</td>
                    <td><span className={`activity-dot activity-dot--${item.type.toLowerCase()}`} /> {item.title}</td>
                    <td>{item.description}</td>
                    <td>{item.guard} <small>({item.code})</small></td>
                    <td>{item.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Sin actividad" text="La actividad aparecerá cuando los guardias inicien servicios o registren hechos." />}
      </section>
    </div>
  );
}
