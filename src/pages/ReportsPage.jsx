import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Download,
  FileSpreadsheet,
  Printer,
  Search,
} from 'lucide-react';

import { guardApi, reportApi } from '../api/endpoints.js';
import { apiError } from '../api/client.js';

import SectionHeader from '../components/SectionHeader.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

import { dateTime, distance } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

import MonthlyIncidentZonesMap from '../components/maps/MonthlyIncidentZonesMap.jsx';

const reportTypes = [
  { key: 'map', label: 'Mapa' },
  { key: 'guards', label: 'Guardias' },
  { key: 'services', label: 'Servicios' },
  { key: 'incidents', label: 'Hechos' },
  { key: 'routes', label: 'Recorridos' },
];

function getCurrentMonth() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

function csvEscape(value) {
  const text =
    value == null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(rows, name) {
  if (!rows?.length) return;

  const keys = Object.keys(rows[0]).filter(
    (key) => typeof rows[0][key] !== 'object',
  );

  const csv = [
    keys.join(','),
    ...rows.map((row) =>
      keys
        .map((key) => csvEscape(row[key]))
        .join(','),
    ),
  ].join('\n');

  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8',
    }),
  );

  const link = document.createElement('a');

  link.href = url;
  link.download = name;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const toast = useToast();

  const [type, setType] = useState('guards');

  const [month, setMonth] = useState(
    getCurrentMonth,
  );

  const [filters, setFilters] = useState({
    from: '',
    to: '',
    guardId: '',
    priority: '',
    status: '',
  });

  const [result, setResult] = useState([]);

  const guards = useQuery({
    queryKey: ['guards', 'report-filter'],
    queryFn: () =>
      guardApi.list({
        limit: 500,
      }),
  });

  const generate = useMutation({
    mutationFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value,
        ),
      );

      if (type === 'guards') {
        return reportApi.guards(params);
      }

      if (type === 'services') {
        return reportApi.services(params);
      }

      if (type === 'incidents') {
        return reportApi.incidents(params);
      }

      if (type === 'routes') {
        return reportApi.routes(params);
      }

      return [];
    },

    onSuccess: (data) => {
      setResult(data || []);
    },

    onError: (error) => {
      toast.error(apiError(error));
    },
  });

  const chartData = useMemo(() => {
    if (type === 'guards') {
      return result
        .slice(0, 12)
        .map((row) => ({
          name: row.code,
          valor: row.services || 0,
        }));
    }

    if (type === 'routes') {
      return result
        .slice(0, 12)
        .map((row) => ({
          name:
            row.guard?.code ||
            row.serviceId?.slice(0, 5) ||
            'Servicio',
          valor: row.points || 0,
        }));
    }

    if (type === 'services') {
      return result
        .slice(0, 12)
        .map((row) => ({
          name:
            row.guard?.code ||
            'Guardia',

          valor:
            Math.round(
              ((row.distanceMeters || 0) /
                1000) *
                10,
            ) / 10,
        }));
    }

    if (type === 'incidents') {
      const grouped = {};

      result.forEach((row) => {
        const key =
          row.incidentType?.name || 'Otro';

        grouped[key] =
          (grouped[key] || 0) + 1;
      });

      return Object.entries(grouped)
        .map(([name, valor]) => ({
          name,
          valor,
        }))
        .slice(0, 12);
    }

    return [];
  }, [result, type]);

  const set =
    (key) =>
    (event) => {
      setFilters((current) => ({
        ...current,
        [key]: event.target.value,
      }));
    };

  const changeReportType = (newType) => {
    setType(newType);
    setResult([]);
  };

  return (
    <div>
      <SectionHeader
        title="Reportes"
        text="Consulta administrativa de guardias, servicios, hechos, recorridos y análisis geográfico de hechos por zona."
      />

      {/* TABS */}
      <div className="report-tabs">
        {reportTypes.map((item) => (
          <button
            key={item.key}
            className={
              type === item.key
                ? 'active'
                : ''
            }
            onClick={() =>
              changeReportType(item.key)
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ========================= */}
      {/* FILTROS MAPA */}
      {/* ========================= */}

      {type === 'map' ? (
        <section className="panel report-filters">
          <div className="form-field">
            <label>Mes</label>

            <input
              type="month"
              value={month}
              onChange={(event) =>
                setMonth(event.target.value)
              }
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingTop: 21,
            }}
          >
            <span
              style={{
                color: '#64748b',
                fontSize: 13,
              }}
            >
              El mapa se actualiza
              automáticamente al seleccionar
              otro mes.
            </span>
          </div>
        </section>
      ) : (
        /* ========================= */
        /* FILTROS REPORTES */
        /* ========================= */

        <section className="panel report-filters">
          <div className="form-field">
            <label>Desde</label>

            <input
              type="date"
              value={filters.from}
              onChange={set('from')}
            />
          </div>

          <div className="form-field">
            <label>Hasta</label>

            <input
              type="date"
              value={filters.to}
              onChange={set('to')}
            />
          </div>

          <div className="form-field">
            <label>Guardia</label>

            <select
              value={filters.guardId}
              onChange={set('guardId')}
            >
              <option value="">
                Todos
              </option>

              {guards.data?.items?.map(
                (guard) => (
                  <option
                    key={guard.id}
                    value={guard.id}
                  >
                    {guard.code} ·{' '}
                    {guard.firstName}{' '}
                    {guard.lastName}
                  </option>
                ),
              )}
            </select>
          </div>

          {type === 'incidents' ? (
            <>
              <div className="form-field">
                <label>Prioridad</label>

                <select
                  value={filters.priority}
                  onChange={set(
                    'priority',
                  )}
                >
                  <option value="">
                    Todas
                  </option>

                  <option value="BAJA">
                    BAJA
                  </option>

                  <option value="MEDIA">
                    MEDIA
                  </option>

                  <option value="ALTA">
                    ALTA
                  </option>

                  <option value="CRITICA">
                    CRITICA
                  </option>
                </select>
              </div>

              <div className="form-field">
                <label>Estado</label>

                <select
                  value={filters.status}
                  onChange={set(
                    'status',
                  )}
                >
                  <option value="">
                    Todos
                  </option>

                  <option value="REPORTADO">
                    REPORTADO
                  </option>

                  <option value="EN_REVISION">
                    EN_REVISION
                  </option>

                  <option value="ATENDIDO">
                    ATENDIDO
                  </option>

                  <option value="CERRADO">
                    CERRADO
                  </option>
                </select>
              </div>
            </>
          ) : null}

          <button
            className="button button--primary"
            onClick={() =>
              generate.mutate()
            }
            disabled={
              generate.isPending
            }
          >
            <Search size={18} />

            {generate.isPending
              ? 'Generando...'
              : 'Generar reporte'}
          </button>
        </section>
      )}

      {/* ================================= */}
      {/* MAPA MENSUAL DE HECHOS */}
      {/* ================================= */}

      {type === 'map' ? (
        <MonthlyIncidentZonesMap
          month={month}
        />
      ) : generate.isPending ? (
        <LoadingState label="Generando reporte..." />
      ) : result.length ? (
        <>
          {/* RESUMEN */}

          <section className="report-summary-grid">
            <article className="panel report-chart">
              <header>
                <h3>
                  Resumen visual
                </h3>

                <span>
                  {result.length}{' '}
                  registros
                </span>
              </header>

              <div className="chart-box">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={chartData}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      stroke="#e8eaf3"
                    />

                    <XAxis
                      dataKey="name"
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="valor"
                      fill="#6540bd"
                      radius={[
                        8,
                        8,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            {/* ACCIONES */}

            <article className="panel report-actions">
              <FileSpreadsheet
                size={34}
              />

              <h3>
                Resultados listos
              </h3>

              <p>
                Exporta la consulta
                actual o utiliza la
                vista de impresión del
                navegador.
              </p>

              <button
                className="button button--secondary"
                onClick={() =>
                  downloadCsv(
                    result,
                    `sc-cbba-${type}.csv`,
                  )
                }
              >
                <Download size={18} />
                Exportar CSV
              </button>

              <button
                className="button button--ghost"
                onClick={() =>
                  window.print()
                }
              >
                <Printer size={18} />
                Imprimir
              </button>
            </article>
          </section>

          {/* TABLA */}

          <section className="panel table-panel">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  {type === 'guards' ? (
                    <tr>
                      <th>
                        Guardia
                      </th>
                      <th>
                        Estado
                      </th>
                      <th>
                        Servicios
                      </th>
                      <th>
                        Minutos
                      </th>
                      <th>
                        Hechos
                      </th>
                    </tr>
                  ) : type ===
                    'services' ? (
                    <tr>
                      <th>
                        Guardia
                      </th>
                      <th>
                        Inicio
                      </th>
                      <th>
                        Fin
                      </th>
                      <th>
                        Estado
                      </th>
                      <th>
                        Base
                      </th>
                      <th>
                        Zona
                      </th>
                      <th>
                        Distancia
                      </th>
                    </tr>
                  ) : type ===
                    'incidents' ? (
                    <tr>
                      <th>
                        Código
                      </th>
                      <th>
                        Tipo
                      </th>
                      <th>
                        Guardia
                      </th>
                      <th>
                        Fecha
                      </th>
                      <th>
                        Prioridad
                      </th>
                      <th>
                        Estado
                      </th>
                    </tr>
                  ) : (
                    <tr>
                      <th>
                        Servicio
                      </th>
                      <th>
                        Guardia
                      </th>
                      <th>
                        Inicio
                      </th>
                      <th>
                        Fin
                      </th>
                      <th>
                        Distancia
                      </th>
                      <th>
                        Puntos
                      </th>
                    </tr>
                  )}
                </thead>

                <tbody>
                  {result.map(
                    (row, index) => {
                      if (
                        type ===
                        'guards'
                      ) {
                        return (
                          <tr
                            key={
                              row.guardId
                            }
                          >
                            <td>
                              <b>
                                {
                                  row.code
                                }
                              </b>{' '}
                              ·{' '}
                              {row.name}
                            </td>

                            <td>
                              <StatusBadge
                                active={
                                  row.active
                                }
                              />
                            </td>

                            <td>
                              {
                                row.services
                              }
                            </td>

                            <td>
                              {Math.round(
                                row.totalMinutes ||
                                  0,
                              )}
                            </td>

                            <td>
                              {
                                row.incidents
                              }
                            </td>
                          </tr>
                        );
                      }

                      if (
                        type ===
                        'services'
                      ) {
                        return (
                          <tr
                            key={row.id}
                          >
                            <td>
                              {
                                row.guard
                                  ?.code
                              }{' '}
                              ·{' '}
                              {
                                row.guard
                                  ?.firstName
                              }{' '}
                              {
                                row.guard
                                  ?.lastName
                              }
                            </td>

                            <td>
                              {dateTime(
                                row.startedAt,
                              )}
                            </td>

                            <td>
                              {dateTime(
                                row.endedAt,
                              )}
                            </td>

                            <td>
                              <StatusBadge
                                value={
                                  row.status
                                }
                              />
                            </td>

                            <td>
                              {row.patrol
                                ?.name ||
                                row.patrol
                                  ?.code ||
                                '—'}
                            </td>

                            <td>
                              {row.zone
                                ?.name ||
                                '—'}
                            </td>

                            <td>
                              {distance(
                                row.distanceMeters,
                              )}
                            </td>
                          </tr>
                        );
                      }

                      if (
                        type ===
                        'incidents'
                      ) {
                        return (
                          <tr
                            key={row.id}
                          >
                            <td>
                              <b>
                                {
                                  row.code
                                }
                              </b>
                            </td>

                            <td>
                              {row
                                .incidentType
                                ?.name ||
                                '—'}
                            </td>

                            <td>
                              {row.guard
                                ?.code ||
                                '—'}{' '}
                              ·{' '}
                              {row.guard
                                ?.firstName ||
                                ''}{' '}
                              {row.guard
                                ?.lastName ||
                                ''}
                            </td>

                            <td>
                              {dateTime(
                                row.createdAt,
                              )}
                            </td>

                            <td>
                              <StatusBadge
                                value={
                                  row.priority
                                }
                              />
                            </td>

                            <td>
                              <StatusBadge
                                value={
                                  row.status
                                }
                              />
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={
                            row.serviceId ||
                            index
                          }
                        >
                          <td>
                            {row.serviceId
                              ? `${row.serviceId.slice(
                                  0,
                                  8,
                                )}...`
                              : '—'}
                          </td>

                          <td>
                            {row.guard
                              ?.code ||
                              '—'}{' '}
                            ·{' '}
                            {row.guard
                              ?.name ||
                              ''}
                          </td>

                          <td>
                            {dateTime(
                              row.startedAt,
                            )}
                          </td>

                          <td>
                            {dateTime(
                              row.endedAt,
                            )}
                          </td>

                          <td>
                            {distance(
                              row.distanceMeters,
                            )}
                          </td>

                          <td>
                            {row.points ??
                              0}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          title="Genera un reporte"
          text="Selecciona los filtros y pulsa “Generar reporte” para consultar información."
        />
      )}
    </div>
  );
}