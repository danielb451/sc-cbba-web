import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Filter, MapPin, Search, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { catalogApi, incidentApi } from '../api/endpoints.js';
import SectionHeader from '../components/SectionHeader.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { dateTime } from '../lib/format.js';

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [typeId, setTypeId] = useState('');
  const types = useQuery({ queryKey: ['incident-types'], queryFn: catalogApi.incidentTypes });
  const incidents = useQuery({
    queryKey: ['incidents', status, priority, typeId],
    queryFn: () => incidentApi.list({ status: status || undefined, priority: priority || undefined, incidentTypeId: typeId || undefined, limit: 500 }),
  });

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return incidents.data || [];
    return (incidents.data || []).filter((item) => `${item.code} ${item.description} ${item.guard?.firstName} ${item.guard?.lastName} ${item.incidentType?.name} ${item.approximateAddress || ''}`.toLowerCase().includes(value));
  }, [incidents.data, search]);

  return (
    <div>
      <SectionHeader title="Hechos" text="Todos los hechos reportados desde la app móvil, con evidencia, ubicación y gestión del supervisor." />
      <div className="filter-bar">
        <label className="search-input"><Search size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar código, guardia, descripción o dirección..." /></label>
        <label className="select-inline"><Filter size={16}/><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">Todos los estados</option><option>REPORTADO</option><option>EN_REVISION</option><option>ATENDIDO</option><option>CERRADO</option></select></label>
        <select className="select-control" value={priority} onChange={(e)=>setPriority(e.target.value)}><option value="">Todas las prioridades</option><option>BAJA</option><option>MEDIA</option><option>ALTA</option><option>CRITICA</option></select>
        <select className="select-control" value={typeId} onChange={(e)=>setTypeId(e.target.value)}><option value="">Todos los tipos</option>{types.data?.map((t)=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <span className="toolbar__count">{filtered.length} hechos</span>
      </div>

      <section className="incident-grid">
        {incidents.isLoading ? <LoadingState /> : filtered.length ? filtered.map((item) => (
          <article className="incident-card panel" key={item.id} onClick={() => navigate(`/hechos/${item.id}`)}>
            <div className="incident-card__top"><span className="incident-card__icon"><TriangleAlert size={22}/></span><div><strong>{item.code}</strong><h3>{item.incidentType?.name || 'Hecho'}</h3></div><StatusBadge value={item.status}/></div>
            <p>{item.description}</p>
            <div className="incident-card__meta"><span><UserAvatar src={item.guard?.user?.photoUrl} name={item.guard?.firstName} size={30}/> {item.guard?.firstName} {item.guard?.lastName} · {item.guard?.code}</span><span><MapPin size={15}/> {item.approximateAddress || item.service?.zone?.name || 'Ubicación GPS'}</span><span>{dateTime(item.createdAt)}</span></div>
            <footer><StatusBadge value={item.priority}/><button className="table-action"><Eye size={18}/></button></footer>
          </article>
        )) : <EmptyState title="Sin hechos" text="No hay hechos que coincidan con los filtros seleccionados." />}
      </section>
    </div>
  );
}
