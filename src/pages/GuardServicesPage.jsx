import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Battery, Clock3, MapPin, Route } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { guardApi, serviceApi } from '../api/endpoints.js';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import ServiceRouteMap from '../components/maps/ServiceRouteMap.jsx';
import { dateTime, distance, duration } from '../lib/format.js';

export default function GuardServicesPage() {
  const { guardId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const guard = useQuery({ queryKey: ['guard', guardId], queryFn: () => guardApi.get(guardId) });
  const services = useQuery({ queryKey: ['services', 'guard', guardId], queryFn: () => serviceApi.list({ guardId, limit: 500 }) });
  const serviceId = params.get('service');
  const route = useQuery({ queryKey: ['service-route', serviceId], queryFn: () => serviceApi.route(serviceId), enabled: Boolean(serviceId) });

  useEffect(() => {
    if (!serviceId && services.data?.length) setParams({ service: services.data[0].id }, { replace: true });
  }, [serviceId, services.data, setParams]);

  const selected = useMemo(() => services.data?.find((s) => s.id === serviceId), [services.data, serviceId]);
  if (guard.isLoading || services.isLoading) return <LoadingState label="Cargando historial de servicios..." />;
  if (!guard.data) return <EmptyState title="Guardia no encontrado" />;
  const g = guard.data;

  return (
    <div>
      <button className="back-button" onClick={() => navigate('/servicios')}><ArrowLeft size={17}/> Volver a Servicios</button>
      <section className="profile-hero profile-hero--services panel">
        <UserAvatar src={g.user?.photoUrl} name={`${g.firstName} ${g.lastName}`} size={76} />
        <div className="profile-hero__copy"><h1>{g.firstName} {g.lastName}</h1><p>{g.code} · {g.rank || 'Guardia Municipal'}</p><span>{services.data?.length || 0} servicios registrados</span></div>
      </section>

      <section className="services-history-layout">
        <aside className="panel service-timeline">
          <header><h3>Servicios</h3><span>{services.data?.length || 0}</span></header>
          {services.data?.length ? services.data.map((service, index) => (
            <button key={service.id} className={service.id === serviceId ? 'active' : ''} onClick={() => setParams({ service: service.id })}>
              <i>{index + 1}</i>
              <div><strong>{dateTime(service.startedAt)}</strong><span>{service.patrol?.name || service.patrol?.code || 'Sin base'} · {service.zone?.name || 'Sin zona'}</span><small>{duration(service.startedAt, service.endedAt || new Date())} · {distance(service.distanceMeters)}</small></div>
              <StatusBadge value={service.status} />
            </button>
          )) : <EmptyState title="Sin servicios" />}
        </aside>

        <div className="service-detail-column">
          {selected ? (
            <>
              <section className="panel service-summary">
                <header><div><h2>Servicio</h2><p>{dateTime(selected.startedAt)}</p></div><StatusBadge value={selected.status}/></header>
                <div className="service-summary__grid">
                  <div><Clock3/><span>Duración</span><b>{duration(selected.startedAt, selected.endedAt || new Date())}</b></div>
                  <div><Route/><span>Distancia</span><b>{distance(selected.distanceMeters)}</b></div>
                  <div><MapPin/><span>Zona</span><b>{selected.zone?.name || 'Sin zona'}</b></div>
                  <div><Battery/><span>Coordenadas</span><b>{selected._count?.locations ?? route.data?.coordinateCount ?? '—'}</b></div>
                </div>
              </section>
              <section className="panel route-history-panel">
                <header><div><h3>Recorrido GPS</h3><p>Inicio → coordenadas enviadas por la app → fin del servicio.</p></div><span>{route.data?.coordinateCount || 0} coordenadas</span></header>
                {route.isLoading ? <LoadingState label="Cargando recorrido..." /> : route.data ? <ServiceRouteMap route={route.data} height={500} /> : <EmptyState title="Sin recorrido GPS" />}
              </section>
            </>
          ) : <EmptyState title="Selecciona un servicio" />}
        </div>
      </section>
    </div>
  );
}
