import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Route, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { serviceApi } from '../api/endpoints.js';
import SectionHeader from '../components/SectionHeader.jsx';
import SearchInput from '../components/SearchInput.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { dateTime } from '../lib/format.js';

export default function ServicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['services', 'guards', search], queryFn: () => serviceApi.guardIndex({ search }) });
  const items = query.data || [];
  return (
    <div>
      <SectionHeader title="Servicios" text="Un guardia aparece una sola vez. Ingresa a su perfil operativo para consultar todos sus servicios y recorridos GPS." />
      <div className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder="Buscar guardia por nombre, código o CI..." /><span className="toolbar__count">{items.length} guardias</span></div>
      <section className="service-guard-grid">
        {query.isLoading ? <LoadingState /> : items.length ? items.map((guard) => {
          const last = guard.services?.[0];
          const patrol = guard.patrolMembers?.find((m) => m.patrol?.status === 'ACTIVA')?.patrol;
          return (
            <button className="service-guard-card panel" key={guard.id} onClick={() => navigate(`/servicios/${guard.id}`)}>
              <UserAvatar src={guard.user?.photoUrl} name={`${guard.firstName} ${guard.lastName}`} size={58} />
              <div className="service-guard-card__main"><strong>{guard.firstName} {guard.lastName}</strong><span>{guard.code} · {guard.rank || 'Sin rango'}</span><small>{patrol?.name || patrol?.code || guard.assignedZone?.name || 'Sin asignación operativa'}</small></div>
              <div className="service-guard-card__stats"><span><ShieldCheck size={16}/> {guard._count?.services || 0} servicios</span><span><Route size={16}/> {guard._count?.incidents || 0} hechos</span>{last ? <small>Último: {dateTime(last.startedAt)}</small> : <small>Sin servicios</small>}</div>
              <StatusBadge active={guard.active} />
              <ChevronRight size={20} />
            </button>
          );
        }) : <EmptyState title="Sin guardias" text="No hay guardias para mostrar con el filtro actual." />}
      </section>
    </div>
  );
}
