import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from 'react-leaflet';
import L from 'leaflet';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';

import {
  catalogApi,
  guardApi,
  patrolApi,
} from '../api/endpoints.js';

import { apiError } from '../api/client.js';

import SectionHeader from '../components/SectionHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import PatrolForm from '../components/PatrolForm.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import UserAvatar from '../components/UserAvatar.jsx';

import JurisdictionLayer, {
  getZoneColor,
} from '../components/maps/JurisdictionLayer.jsx';

import { FlyTo } from '../components/maps/MapHelpers.jsx';

import {
  COCHABAMBA_CENTER,
  geoJsonCenter,
} from '../lib/maps.js';

import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';


const baseIcon = L.divIcon({
  className: 'base-marker-wrapper',
  html: '<span class="base-marker">⌂</span>',
  iconSize: [42, 46],
  iconAnchor: [21, 42],
});


export default function PatrolsPage() {
  const toast = useToast();
  const { can } = useAuth();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);


  /* ==========================================================
     CONSULTAS
     ========================================================== */

  const patrols = useQuery({
    queryKey: ['patrols'],
    queryFn: patrolApi.list,
  });

  const guards = useQuery({
    queryKey: ['guards', 'patrol-assignment'],
    queryFn: () =>
      guardApi.list({
        limit: 500,
      }),
  });

  const zones = useQuery({
    queryKey: ['zones'],
    queryFn: catalogApi.zones,
  });


  /* ==========================================================
     SELECCIÓN INICIAL
     ========================================================== */

  useEffect(() => {
    if (!selectedId && patrols.data?.length) {
      setSelectedId(patrols.data[0].id);
    }
  }, [patrols.data, selectedId]);


  const selected = useMemo(() => {
    return (
      patrols.data?.find(
        (patrol) => patrol.id === selectedId
      ) || null
    );
  }, [patrols.data, selectedId]);


  /*
   * Algunos endpoints pueden devolver:
   *
   * zoneId
   *
   * mientras otros pueden devolver:
   *
   * zone: { id, name }
   *
   * Esto soporta ambos.
   */
  const selectedZoneId =
    selected?.zoneId ||
    selected?.zone?.id ||
    null;


  /* ==========================================================
     GUARDAR PATRULLA / BASE
     ========================================================== */

  const save = useMutation({
    mutationFn: ({ initial, payload }) =>
      initial
        ? patrolApi.update(initial.id, payload)
        : patrolApi.create(payload),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['patrols'],
      });

      qc.invalidateQueries({
        queryKey: ['guards'],
      });

      setModal(null);

      toast.success(
        'Patrulla/base guardada y asignaciones sincronizadas'
      );
    },

    onError: (error) => {
      toast.error(apiError(error));
    },
  });


  /* ==========================================================
     CENTRO DEL MAPA
     ========================================================== */

  const center =
    selected?.latitude != null &&
    selected?.longitude != null
      ? [
          Number(selected.latitude),
          Number(selected.longitude),
        ]
      : geoJsonCenter(selected?.zone?.geoJson) ||
        COCHABAMBA_CENTER;


  /* ==========================================================
     ZONAS VISIBLES
     ========================================================== */

  const visibleZones = useMemo(() => {
    return (zones.data || []).filter(
      (zone) =>
        zone.active !== false &&
        Boolean(zone.geoJson)
    );
  }, [zones.data]);


  /* ==========================================================
     SELECCIONAR ZONA DESDE EL MAPA
     ========================================================== */

  function handleZoneClick(clickedZone) {
    const patrol = patrols.data?.find(
      (item) =>
        item.zoneId === clickedZone.id ||
        item.zone?.id === clickedZone.id
    );

    if (patrol) {
      setSelectedId(patrol.id);
    }
  }


  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div>

      <SectionHeader
        title="Patrullas / Bases operativas"
        text="Cada patrulla funciona como una base de operación: ubicación, responsable, guardias asignados y jurisdicción geográfica."
        actions={
          can('patrols.manage') ? (
            <button
              className="button button--primary"
              onClick={() =>
                setModal({
                  type: 'create',
                })
              }
            >
              <Plus size={18} />
              Nueva base
            </button>
          ) : null
        }
      />


      <section className="patrol-layout">

        {/* =====================================================
            LISTA DE BASES
            ===================================================== */}

        <div className="patrol-list">

          {patrols.isLoading ? (
            <LoadingState />
          ) : patrols.data?.length ? (

            patrols.data.map((patrol) => (
              <article
                key={patrol.id}
                className={`patrol-card panel ${
                  patrol.id === selectedId
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setSelectedId(patrol.id)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' ||
                    event.key === ' '
                  ) {
                    setSelectedId(patrol.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >

                <div className="patrol-card__icon">
                  <ShieldCheck size={24} />
                </div>

                <div className="patrol-card__copy">

                  <div>
                    <b>{patrol.code}</b>

                    <StatusBadge
                      value={patrol.status}
                    />
                  </div>

                  <h3>
                    {patrol.name || 'Base operativa'}
                  </h3>

                  <span>
                    <MapPin size={15} />

                    {patrol.zone?.name ||
                      'Sin jurisdicción'}
                  </span>

                  <span>
                    <Users size={15} />

                    {patrol.members?.length || 0}{' '}
                    guardias
                  </span>

                  <small>
                    {patrol.address ||
                      'Dirección no configurada'}
                  </small>

                </div>


                {can('patrols.manage') ? (
                  <button
                    type="button"
                    className="table-action"
                    onClick={(event) => {
                      event.stopPropagation();

                      setModal({
                        type: 'edit',
                        patrol,
                      });
                    }}
                  >
                    <Pencil size={17} />
                  </button>
                ) : null}

              </article>
            ))

          ) : (
            <EmptyState title="Sin bases operativas" />
          )}

        </div>


        {/* =====================================================
            COLUMNA DERECHA
            ===================================================== */}

        <div className="patrol-map-column">


          {/* ===================================================
              MAPA
              =================================================== */}

          <section className="panel patrol-map-panel">

            <header>
              <div>
                <h3>Mapa de jurisdicciones</h3>

                <p>
                  Las áreas coloreadas representan
                  las zonas operativas asignadas
                  a cada base.
                </p>
              </div>

              {selected ? (
                <StatusBadge
                  value={selected.status}
                />
              ) : null}
            </header>


            <div className="patrol-map-wrap">

              <MapContainer
                center={center}
                zoom={13}
                className="leaflet-map"
              >

                {/* MAPA BASE */}

                <TileLayer
                  url={
                    import.meta.env
                      .VITE_MAP_TILE_URL ||
                    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                  }
                  attribution={
                    import.meta.env
                      .VITE_MAP_ATTRIBUTION ||
                    '&copy; OpenStreetMap contributors'
                  }
                />


                {/* =============================================
                    JURISDICCIONES
                    ============================================= */}

                {visibleZones.map((zone) => (
                  <JurisdictionLayer
                    key={zone.id}
                    zone={zone}
                    selected={
                      zone.id === selectedZoneId
                    }
                    onClick={handleZoneClick}
                  />
                ))}


                {/* =============================================
                    MARCADORES DE BASES
                    ============================================= */}

                {(patrols.data || [])
                  .filter(
                    (patrol) =>
                      patrol.latitude != null &&
                      patrol.longitude != null
                  )
                  .map((patrol) => (
                    <Marker
                      key={patrol.id}
                      position={[
                        Number(patrol.latitude),
                        Number(patrol.longitude),
                      ]}
                      icon={baseIcon}
                      eventHandlers={{
                        click: () =>
                          setSelectedId(patrol.id),
                      }}
                    >
                      <Popup>
                        <b>
                          {patrol.code} ·{' '}
                          {patrol.name || 'Base'}
                        </b>

                        <br />

                        {patrol.address ||
                          patrol.zone?.name ||
                          'Sin dirección'}
                      </Popup>
                    </Marker>
                  ))}


                {/* =============================================
                    ACERCAR A BASE SELECCIONADA
                    ============================================= */}

                {selected ? (
                  <FlyTo
                    position={center}
                    zoom={14}
                  />
                ) : null}

              </MapContainer>


              {/* ===============================================
                  LEYENDA
                  DEBE ESTAR DENTRO DEL WRAPPER
                  =============================================== */}

              {visibleZones.length > 0 ? (
                <div className="patrol-zone-legend">

                  <strong>Jurisdicciones</strong>

                  {visibleZones.map((zone) => (
                    <button
                      type="button"
                      key={zone.id}
                      className={`patrol-zone-legend__item ${
                        zone.id === selectedZoneId
                          ? 'active'
                          : ''
                      }`}
                      onClick={() =>
                        handleZoneClick(zone)
                      }
                    >

                      <span
                        className="zone-legend-dot"
                        style={{
                          backgroundColor:
                            getZoneColor(zone),
                        }}
                      />

                      <span>
                        {zone.name}
                      </span>

                    </button>
                  ))}

                </div>
              ) : null}

            </div>

          </section>


          {/* ===================================================
              DETALLE DE BASE
              =================================================== */}

          {selected ? (
            <section className="panel patrol-detail">

              <header>
                <div>
                  <h2>
                    {selected.name ||
                      selected.code}
                  </h2>

                  <p>
                    {selected.code}
                    {' · '}
                    {selected.zone?.name ||
                      'Sin zona'}
                  </p>
                </div>

                <StatusBadge
                  value={selected.status}
                />
              </header>


              <div className="detail-grid detail-grid--patrol">

                <div>
                  <span>Dirección</span>

                  <b>
                    {selected.address || '—'}
                  </b>
                </div>

                <div>
                  <span>Horario</span>

                  <b>
                    {selected.startTime || '—'}
                    {' — '}
                    {selected.endTime || '—'}
                  </b>
                </div>

                <div>
                  <span>Responsable</span>

                  <b>
                    {selected.responsibleGuard
                      ? `${selected.responsibleGuard.firstName} ${selected.responsibleGuard.lastName}`
                      : '—'}
                  </b>
                </div>

                <div>
                  <span>
                    Servicios históricos
                  </span>

                  <b>
                    {selected._count?.services ||
                      0}
                  </b>
                </div>

              </div>


              <h3 className="subheading">
                Guardias asignados
              </h3>


              <div className="assigned-guards">

                {selected.members?.length ? (

                  selected.members.map(
                    (member) => (
                      <div key={member.guardId}>

                        <UserAvatar
                          src={
                            member.guard?.user
                              ?.photoUrl
                          }
                          name={
                            member.guard
                              ?.firstName
                          }
                          size={34}
                        />

                        <span>
                          <b>
                            {member.guard?.code}
                          </b>{' '}

                          {
                            member.guard
                              ?.firstName
                          }{' '}

                          {
                            member.guard
                              ?.lastName
                          }
                        </span>

                      </div>
                    )
                  )

                ) : (
                  <span>
                    Sin guardias asignados
                  </span>
                )}

              </div>

            </section>
          ) : null}

        </div>

      </section>


      {/* =======================================================
          MODAL CREAR / EDITAR
          ======================================================= */}

      <Modal
        open={Boolean(modal)}
        title={
          modal?.type === 'edit'
            ? 'Editar base operativa'
            : 'Nueva base operativa'
        }
        subtitle="La asignación aquí se sincroniza con patrol_members y la zona del guardia."
        onClose={() => setModal(null)}
        wide
      >

        <PatrolForm
          initial={modal?.patrol}
          guards={guards.data?.items || []}
          zones={zones.data || []}
          loading={save.isPending}
          onCancel={() => setModal(null)}
          onSubmit={(payload) =>
            save.mutate({
              initial: modal?.patrol,
              payload,
            })
          }
        />

      </Modal>

    </div>
  );
}