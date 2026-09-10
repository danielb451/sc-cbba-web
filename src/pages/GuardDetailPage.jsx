import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock3, FileWarning, MapPin, Route, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { guardApi } from '../api/endpoints.js';
import LoadingState from '../components/LoadingState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { dateTime, shortDate } from '../lib/format.js';

const tabs = ['Información', 'Servicios', 'Hechos', 'Patrullas', 'Recorridos'];

export default function GuardDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Información');
  const query = useQuery({ queryKey: ['guard', id], queryFn: () => guardApi.get(id) });
  if (query.isLoading) return <LoadingState label="Cargando perfil del guardia..." />;
  const g = query.data;
  if (!g) return <EmptyState title="Guardia no encontrado" />;
  const patrols = g.patrolMembers?.map((m) => m.patrol) || [];
  const lastLocation = g.locations?.[0];

  return (
    <div>
      <button className="back-button" onClick={() => navigate('/guardias')}><ArrowLeft size={17} /> Volver a Guardias</button>
      <section className="profile-hero panel">
        <UserAvatar src={g.user?.photoUrl} name={`${g.firstName} ${g.lastName}`} size={92} />
        <div className="profile-hero__copy"><h1>{g.firstName} {g.lastName}</h1><p>{g.code} · {g.rank || 'Sin rango'}</p><StatusBadge active={g.active} /></div>
        <div className="profile-hero__quick"><div><ShieldCheck /><span>Base actual</span><b>{patrols[0]?.name || patrols[0]?.code || 'Sin base'}</b></div><div><MapPin /><span>Zona</span><b>{g.assignedZone?.name || patrols[0]?.zone?.name || 'Sin zona'}</b></div><div><Clock3 /><span>Última ubicación</span><b>{lastLocation ? dateTime(lastLocation.recordedAt) : 'Sin datos'}</b></div></div>
      </section>
      <div className="tabs">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={tab === item ? 'active' : ''}>{item}</button>)}</div>

      {tab === 'Información' ? <section className="panel detail-grid"><div><span>CI</span><b>{g.ci}</b></div><div><span>Teléfono</span><b>{g.phone || '—'}</b></div><div><span>Correo</span><b>{g.email || g.user?.email || '—'}</b></div><div><span>Dirección</span><b>{g.address || '—'}</b></div><div><span>Cargo</span><b>{g.position || 'Guardia Municipal'}</b></div><div><span>Rango</span><b>{g.rank || '—'}</b></div><div><span>Fecha de nacimiento</span><b>{shortDate(g.birthDate)}</b></div><div><span>Fecha de ingreso</span><b>{shortDate(g.hireDate)}</b></div><div><span>Usuario móvil</span><b>{g.user?.username || '—'}</b></div><div><span>Estado de cuenta</span><b>{g.user?.active ? 'Activa' : 'Inactiva'}</b></div></section> : null}

      {tab === 'Servicios' ? <section className="panel list-panel"><header><h3>Últimos servicios</h3></header>{g.services?.length ? g.services.map((s) => <button className="list-row" key={s.id} onClick={() => navigate(`/servicios/${g.id}?service=${s.id}`)}><div><strong>{dateTime(s.startedAt)}</strong><span>{s.patrol?.name || s.patrol?.code || 'Sin base'} · {s.zone?.name || 'Sin zona'}</span></div><StatusBadge value={s.status} /></button>) : <EmptyState title="Sin servicios" />}</section> : null}

      {tab === 'Hechos' ? <section className="panel list-panel"><header><h3>Últimos hechos</h3></header>{g.incidents?.length ? g.incidents.map((incident) => <button className="list-row" key={incident.id} onClick={() => navigate(`/hechos/${incident.id}`)}><FileWarning size={20}/><div><strong>{incident.code} · {incident.incidentType?.name}</strong><span>{dateTime(incident.createdAt)}</span></div><StatusBadge value={incident.status} /></button>) : <EmptyState title="Sin hechos registrados" />}</section> : null}

      {tab === 'Patrullas' ? <section className="cards-grid">{patrols.length ? patrols.map((p) => <article className="panel small-card" key={p.id}><ShieldCheck size={25}/><h3>{p.code}</h3><strong>{p.name || 'Base operativa'}</strong><p>{p.zone?.name || 'Sin jurisdicción'}</p><StatusBadge value={p.status}/></article>) : <EmptyState title="Sin patrulla/base asignada" />}</section> : null}

      {tab === 'Recorridos' ? <section className="panel list-panel"><header><h3>Historial de recorridos</h3></header>{g.services?.length ? g.services.map((s) => <button className="list-row" key={s.id} onClick={() => navigate(`/servicios/${g.id}?service=${s.id}`)}><Route size={20}/><div><strong>{dateTime(s.startedAt)}</strong><span>{s.zone?.name || 'Sin zona'} · Ver trazado GPS</span></div><StatusBadge value={s.status}/></button>) : <EmptyState title="Sin recorridos" />}</section> : null}
    </div>
  );
}
