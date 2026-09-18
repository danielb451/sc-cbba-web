import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Battery,
  Clock3,
  Crosshair,
  MapPin,
  Radio,
  Route,
  Search,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import {
  incidentApi,
  locationApi,
  serviceApi,
  catalogApi,
} from '../api/endpoints.js';
import { connectSocket } from '../api/socket.js';
import PageHero from '../components/PageHero.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import ActivityAnimation from '../components/maps/ActivityAnimation.jsx';
import GuardMarker from '../components/maps/GuardMarker.jsx';
import IncidentHotspot from '../components/maps/IncidentHotspot.jsx';
import JurisdictionLayer from '../components/maps/JurisdictionLayer.jsx';
import RouteLayer from '../components/maps/RouteLayer.jsx';
import { FlyTo } from '../components/maps/MapHelpers.jsx';
import { COCHABAMBA_CENTER } from '../lib/maps.js';
import { duration, relativeTime, timeOnly } from '../lib/format.js';

import ComplianceStatus from '../components/ComplianceStatus.jsx';
export default function LiveMapPage() {
  const runtime = useQuery({
    queryKey: ['runtime-settings'],
    queryFn: catalogApi.runtime,
    refetchInterval: 15000,
  });
  const hotspotHours = Number(runtime.data?.INCIDENT_HOTSPOT_HOURS || 48);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [livePoints, setLivePoints] = useState([]);

  const current = useQuery({
    queryKey: ['locations', 'current'],
    queryFn: locationApi.current,
    refetchInterval: Math.min(
      15000,
      Number(runtime.data?.['gps.interval_seconds'] || 30) * 1000,
    ),
  });

  const zones = useQuery({
    queryKey: ['zones'],
    queryFn: catalogApi.zones,
    staleTime: 30_000,
  });

  const visibleZones = useMemo(
    () =>
      (zones.data || []).filter(
        (zone) => zone.active !== false && Boolean(zone.geoJson),
      ),
    [zones.data],
  );

  const incidentFrom = hotspotHours;
  const incidents = useQuery({
    queryKey: ['incidents', 'map-live', incidentFrom],
    queryFn: () =>
      incidentApi.list({
        from: new Date(Date.now() - hotspotHours * 3600000).toISOString(),
        limit: 300,
      }),
    refetchInterval: 60_000,
  });

  const selected = useMemo(
    () =>
      (current.data || []).find((item) => item.serviceId === selectedId) ||
      null,
    [current.data, selectedId],
  );

  const route = useQuery({
    queryKey: ['service-route-live', selected?.serviceId],
    queryFn: () => serviceApi.route(selected.serviceId),
    enabled: Boolean(selected?.serviceId),
    refetchInterval: 45_000,
  });

  useEffect(() => {
    if (!selectedId && current.data?.length)
      setSelectedId(current.data[0].serviceId);
  }, [current.data, selectedId]);

  useEffect(() => {
    setLivePoints([]);
  }, [selected?.serviceId]);

  useEffect(() => {
    const socket = connectSocket();

    const onLocation = (payload) => {
      queryClient.setQueryData(['locations', 'current'], (old = []) => {
        const next = [...old];
        const index = next.findIndex(
          (item) => item.serviceId === payload.serviceId,
        );
        if (index === -1) {
          queryClient.invalidateQueries({ queryKey: ['locations', 'current'] });
          return old;
        }
        if (
          new Date(payload.timestamp) <
          new Date(next[index].lastLocation?.recordedAt || 0)
        )
          return old;
        next[index] = {
          ...next[index],
          lastLocation: {
            id: payload.id,
            index: payload.index,
            latitude: payload.latitude,
            longitude: payload.longitude,
            accuracy: payload.accuracy,
            speed: payload.speed,
            heading: payload.heading,
            altitude: payload.altitude,
            battery: payload.battery,
            recordedAt: payload.timestamp,
          },
          coordinateCount: payload.coordinateCount,
          ageSeconds: payload.ageSeconds,
          connectionStatus: payload.connectionStatus,
          assignedRoute: payload.assignedRoute,
          compliance: payload.compliance,
          zone: payload.zone,
        };
        return next;
      });
      if (payload.serviceId === selectedId) {
        setLivePoints((items) =>
          items.some((point) => point.id === payload.id)
            ? items
            : [...items, payload],
        );
      }
    };

    const onIncident = (payload) => {
      queryClient.setQueryData(
        ['incidents', 'map-live', incidentFrom],
        (old = []) =>
          [payload, ...old.filter((item) => item.id !== payload.id)].filter(
            (item) =>
              new Date(item.createdAt).getTime() >=
              Date.now() - hotspotHours * 3600000,
          ),
      );
    };

    const refreshCurrent = () =>
      queryClient.invalidateQueries({ queryKey: ['locations', 'current'] });
    socket.on('guard:location:update', onLocation);
    socket.on('guard:service:start', refreshCurrent);
    socket.on('guard:service:finish', refreshCurrent);
    socket.on('incident:new', onIncident);
    socket.on('incident:status:update', onIncident);
    return () => {
      socket.off('guard:location:update', onLocation);
      socket.off('guard:service:start', refreshCurrent);
      socket.off('guard:service:finish', refreshCurrent);
      socket.off('incident:new', onIncident);
      socket.off('incident:status:update', onIncident);
    };
  }, [queryClient, selectedId, incidentFrom]);

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return current.data || [];
    return (current.data || []).filter((item) =>
      `${item.guard.code} ${item.guard.firstName} ${item.guard.lastName} ${item.zone?.name || ''} ${item.patrol?.name || ''}`
        .toLowerCase()
        .includes(value),
    );
  }, [current.data, search]);

  const selectedPosition = selected?.lastLocation
    ? [
        Number(selected.lastLocation.latitude),
        Number(selected.lastLocation.longitude),
      ]
    : null;

  return (
    <div className="live-map-page">
      <PageHero
        title="Mapa en vivo"
        subtitle="Monitoreo de guardias, recorridos y hechos en Cochabamba"
        compact
        live
      />

      {current.isError && (
        <p role="alert">
          No se pudieron actualizar las ubicaciones. Revisa la conexión con el
          servidor.
        </p>
      )}
      {zones.isError && (
        <p role="alert">
          No se pudieron cargar las zonas configuradas. Revisa la conexión con
          el servidor.
        </p>
      )}
      <section className="live-map-toolbar">
        <div className="map-filter-chip map-filter-chip--active">
          <Radio size={17} /> Operación en tiempo real
        </div>
        <div className="map-filter-chip">
          <ShieldCheck size={17} /> {current.data?.length || 0} guardias en
          servicio
        </div>
        <div className="map-filter-chip map-filter-chip--danger">
          <Crosshair size={17} /> {incidents.data?.length || 0} hechos recientes
        </div>
        <label className="map-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar guardia, zona o base..."
          />
        </label>
      </section>

      <section className="live-map-layout">
        <div className="live-map-canvas panel">
          {current.isLoading ? (
            <LoadingState label="Cargando ubicaciones en vivo..." />
          ) : (
            <MapContainer
              center={COCHABAMBA_CENTER}
              zoom={13}
              className="leaflet-map"
              zoomControl
            >
              <TileLayer
                url={
                  import.meta.env.VITE_MAP_TILE_URL ||
                  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                }
                attribution={
                  import.meta.env.VITE_MAP_ATTRIBUTION ||
                  '&copy; OpenStreetMap contributors'
                }
              />
              {visibleZones.map((zone) => (
                <JurisdictionLayer
                  key={`zone-${zone.id}`}
                  zone={zone}
                  selected={zone.id === (selected?.zoneId || selected?.zone?.id)}
                />
              ))}
              {(incidents.data || []).map((incident) => (
                <IncidentHotspot
                  key={incident.id}
                  incident={incident}
                  maxHours={hotspotHours}
                  onClick={() => navigate(`/hechos/${incident.id}`)}
                />
              ))}
              {filtered.map((item) => (
                <GuardMarker
                  key={item.serviceId}
                  item={item}
                  selected={item.serviceId === selectedId}
                  onSelect={() => setSelectedId(item.serviceId)}
                />
              ))}
              {selected?.assignedRoute?.geoJson?.coordinates && (
                <Polyline
                  positions={selected.assignedRoute.geoJson.coordinates.map(
                    ([lng, lat]) => [lat, lng],
                  )}
                  pathOptions={{
                    color: '#9333ea',
                    weight: 6,
                    dashArray: '10 8',
                  }}
                />
              )}
              {route.data ? (
                <RouteLayer route={route.data} livePoints={livePoints} />
              ) : null}
              {selectedPosition ? (
                <FlyTo position={selectedPosition} zoom={16} />
              ) : null}
            </MapContainer>
          )}
          <div className="map-live-status">
            <Wifi size={16} /> SISTEMA EN LÍNEA <span /> Ruta actualizada por
            Socket.IO
          </div>
        </div>

        <aside className="live-map-side">
          <article className="panel selected-guard-card">
            <header>
              <h3>Guardia seleccionado</h3>
              {selected ? (
                <StatusBadge value={selected.connectionStatus} />
              ) : null}
            </header>
            {selected ? (
              <>
                <div className="selected-guard-card__identity">
                  <UserAvatar
                    src={selected.guard.photoUrl}
                    name={`${selected.guard.firstName} ${selected.guard.lastName}`}
                    size={66}
                  />
                  <div>
                    <h4>
                      {selected.guard.firstName} {selected.guard.lastName}
                    </h4>
                    <span>{selected.guard.code}</span>
                    <small>
                      {selected.guard.rank ||
                        selected.guard.position ||
                        'Guardia Municipal'}
                    </small>
                  </div>
                </div>
                <ActivityAnimation guard={selected} />
                <p>
                  <b>Ruta asignada:</b>{' '}
                  {selected.assignedRoute?.name || 'Sin asignación'}
                </p>
                <ComplianceStatus compliance={selected.compliance} />
                <div className="selected-guard-card__rows">
                  <div>
                    <Clock3 />
                    <span>Inicio de servicio</span>
                    <b>
                      {timeOnly(selected.startedAt)} ·{' '}
                      {duration(selected.startedAt)}
                    </b>
                  </div>
                  <div>
                    <ShieldCheck />
                    <span>Patrulla / Base</span>
                    <b>
                      {selected.patrol?.name ||
                        selected.patrol?.code ||
                        'Sin base'}
                    </b>
                  </div>
                  <div>
                    <MapPin />
                    <span>Zona</span>
                    <b>{selected.zone?.name || 'Sin zona'}</b>
                  </div>
                  <div>
                    <Wifi />
                    <span>Última actualización</span>
                    <b>{relativeTime(selected.lastLocation?.recordedAt)}</b>
                  </div>
                  <div>
                    <Route />
                    <span>Coordenadas enviadas</span>
                    <b>{selected.coordinateCount || 0} puntos</b>
                  </div>
                  <div>
                    <Battery />
                    <span>Batería</span>
                    <b>
                      {selected.lastLocation?.battery != null
                        ? `${Math.round(selected.lastLocation.battery)}%`
                        : 'Sin dato'}
                    </b>
                  </div>
                </div>
                <button
                  className="button button--primary button--full"
                  onClick={() =>
                    navigate(
                      `/servicios/${selected.guard.id}?service=${selected.serviceId}`,
                    )
                  }
                >
                  Ver servicio / historial
                </button>
              </>
            ) : (
              <EmptyState
                title="Selecciona un guardia"
                text="Haz clic en un marcador para ver su actividad y recorrido en vivo."
              />
            )}
          </article>

          <article className="panel live-guard-list">
            <header>
              <h3>Guardias en servicio</h3>
              <span>{filtered.length}</span>
            </header>
            <div className="live-guard-list__items">
              {filtered.map((item) => (
                <button
                  key={item.serviceId}
                  className={item.serviceId === selectedId ? 'active' : ''}
                  onClick={() => setSelectedId(item.serviceId)}
                >
                  <UserAvatar
                    src={item.guard.photoUrl}
                    name={item.guard.firstName}
                    size={36}
                  />
                  <div>
                    <strong>
                      {item.guard.firstName} {item.guard.lastName}
                    </strong>
                    <small>
                      {item.guard.code} · {item.zone?.name || 'Sin zona'}
                    </small>
                  </div>
                  <i
                    className={`connection-dot connection-dot--${item.connectionStatus.toLowerCase()}`}
                  />
                </button>
              ))}
            </div>
          </article>

          <article className="panel map-legend">
            <header>
              <h3>Leyenda</h3>
            </header>
            <div>
              <span className="legend-route" /> Recorrido GPS del guardia
            </div>
            <div>
              <span style={{ width: 28, borderTop: '4px dashed #9333ea' }} />{' '}
              Ruta asignada por el administrador
            </div>
            <div>
              <span className="legend-point">1</span> Coordenada individual
            </div>
            <div>
              <span className="legend-point legend-point--group">+4</span>{' '}
              Coordenadas agrupadas
            </div>
            <div>
              <span className="legend-hotspot" /> Hecho reciente
            </div>
            <div>
              <span className="legend-hotspot legend-hotspot--old" /> Hecho con
              menor intensidad por antigüedad
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
