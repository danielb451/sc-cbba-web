import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignedRouteApi, guardApi } from '../api/endpoints.js';
import { apiError } from '../api/client.js';
import SectionHeader from '../components/SectionHeader.jsx';
import Modal from '../components/Modal.jsx';
import GeometryEditor from '../components/maps/GeometryEditor.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useToast } from '../context/ToastContext.jsx';

const empty = {
  name: '',
  description: '',
  guardIds: [],
  toleranceMeters: 50,
  active: true,
  geoJson: null,
};

function geometryKey(geoJson) {
  if (!geoJson) return 'null';
  if (typeof geoJson === 'string') return geoJson;
  try {
    return JSON.stringify(geoJson);
  } catch {
    return String(geoJson);
  }
}

function routeGroupKey(route) {
  return JSON.stringify([
    route.name || '',
    route.description || '',
    Number(route.toleranceMeters ?? 50),
    Boolean(route.active),
    geometryKey(route.geoJson),
  ]);
}

function groupRoutes(items = []) {
  const groups = new Map();

  items.forEach((route) => {
    const key = routeGroupKey(route);
    let group = groups.get(key);

    if (!group) {
      group = {
        key,
        name: route.name,
        description: route.description || '',
        toleranceMeters: route.toleranceMeters,
        active: route.active,
        geoJson: route.geoJson,
        assignments: [],
        guards: [],
      };
      groups.set(key, group);
    }

    group.assignments.push({
      id: route.id,
      guardId: route.guardId,
      guard: route.guard,
    });

    if (route.guard && !group.guards.some((guard) => guard.id === route.guard.id)) {
      group.guards.push(route.guard);
    }
  });

  return [...groups.values()];
}

export default function AssignedRoutesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState(null);

  const routes = useQuery({
    queryKey: ['assigned-routes'],
    queryFn: assignedRouteApi.list,
  });

  const guards = useQuery({
    queryKey: ['guards', 'all-route-options'],
    queryFn: async () => {
      let page = 1;
      const items = [];

      while (true) {
        const data = await guardApi.list({ page, limit: 100 });
        items.push(...data.items);
        if (data.items.length < 100) break;
        page += 1;
      }

      return items;
    },
  });

  const groupedRoutes = useMemo(() => groupRoutes(routes.data || []), [routes.data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['assigned-routes'] });
    qc.invalidateQueries({ queryKey: ['locations'] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const {
        assignments = [],
        guardIds = [],
        groupKey: _groupKey,
        ...sharedPayload
      } = form;

      const selectedGuardIds = [...new Set(guardIds)].filter(Boolean);
      const existingByGuard = new Map(
        assignments.map((assignment) => [assignment.guardId, assignment]),
      );
      const selectedSet = new Set(selectedGuardIds);
      const operations = [];

      selectedGuardIds.forEach((guardId) => {
        const existing = existingByGuard.get(guardId);
        const payload = { ...sharedPayload, guardId };

        operations.push(
          existing
            ? assignedRouteApi.update(existing.id, payload)
            : assignedRouteApi.create(payload),
        );
      });

      assignments
        .filter((assignment) => !selectedSet.has(assignment.guardId))
        .forEach((assignment) => {
          operations.push(assignedRouteApi.remove(assignment.id));
        });

      await Promise.all(operations);
      return { count: selectedGuardIds.length };
    },
    onSuccess: ({ count }) => {
      refresh();
      setForm(null);
      toast.success(
        count === 1
          ? 'Ruta asignada a 1 guardia'
          : `Ruta asignada a ${count} guardias`,
      );
    },
    onError: (error) => toast.error(apiError(error)),
  });

  const remove = useMutation({
    mutationFn: async (assignments) => {
      await Promise.all(
        assignments.map((assignment) => assignedRouteApi.remove(assignment.id)),
      );
    },
    onSuccess: () => {
      refresh();
      toast.success('Ruta eliminada para todos los guardias asignados');
    },
    onError: (error) => toast.error(apiError(error)),
  });

  const toggleGuard = (guardId) => {
    setForm((current) => ({
      ...current,
      guardIds: current.guardIds.includes(guardId)
        ? current.guardIds.filter((id) => id !== guardId)
        : [...current.guardIds, guardId],
    }));
  };

  const openEdit = (group) => {
    setForm({
      groupKey: group.key,
      assignments: group.assignments,
      name: group.name,
      description: group.description || '',
      guardIds: group.assignments.map((assignment) => assignment.guardId),
      toleranceMeters: group.toleranceMeters ?? 50,
      active: group.active !== false,
      geoJson: group.geoJson,
    });
  };

  const activeGuards = guards.data?.filter(
    (guard) => guard.active || form?.guardIds?.includes(guard.id),
  );

  return (
    <div>
      <SectionHeader
        title="Rutas asignadas"
        text="Define recorridos y asígnalos a uno o varios guardias. Al activar una ruta se desactiva la asignación activa anterior de cada guardia seleccionado."
        actions={
          <button
            className="button button--primary"
            onClick={() => setForm({ ...empty, guardIds: [], assignments: [] })}
          >
            Nueva ruta
          </button>
        }
      />

      {routes.isLoading ? (
        <LoadingState />
      ) : routes.isError ? (
        <p role="alert">{apiError(routes.error)}</p>
      ) : (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th>Guardias</th>
                  <th>Tolerancia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {groupedRoutes.map((route) => (
                  <tr key={route.key}>
                    <td>
                      <b>{route.name}</b>
                      <br />
                      {route.description}
                    </td>
                    <td>
                      {route.guards.map((guard) => (
                        <div key={guard.id}>
                          {guard.code} · {guard.firstName} {guard.lastName}
                        </div>
                      ))}
                    </td>
                    <td>{route.toleranceMeters} m</td>
                    <td>{route.active ? 'Activa' : 'Inactiva'}</td>
                    <td>
                      <button
                        className="button button--secondary"
                        onClick={() => openEdit(route)}
                      >
                        Editar
                      </button>{' '}
                      <button
                        className="button button--ghost"
                        disabled={remove.isPending}
                        onClick={() =>
                          window.confirm(
                            `¿Eliminar la ruta «${route.name}» para ${route.assignments.length} guardia(s)?`,
                          ) && remove.mutate(route.assignments)
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!groupedRoutes.length && (
              <p>No hay rutas asignadas. Crea la primera para comenzar.</p>
            )}
          </div>
        </section>
      )}

      <Modal
        open={!!form}
        title={form?.assignments?.length ? 'Editar ruta asignada' : 'Nueva ruta asignada'}
        wide
        onClose={() => setForm(null)}
      >
        {form && (
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();

              if (!form.guardIds.length) {
                return toast.error('Selecciona al menos un guardia');
              }

              if (!form.geoJson || form.geoJson.coordinates?.length < 2) {
                return toast.error('Dibuja al menos dos puntos');
              }

              save.mutate();
            }}
          >
            <label className="form-field">
              Nombre de la ruta
              <input
                required
                minLength={2}
                maxLength={120}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>

            <label className="form-field">
              Tolerancia de desvío (metros)
              <input
                required
                type="number"
                min={5}
                max={1000}
                value={form.toleranceMeters}
                onChange={(event) =>
                  setForm({
                    ...form,
                    toleranceMeters: Number(event.target.value),
                  })
                }
              />
              <small>Distancia máxima permitida entre el GPS y el trazado.</small>
            </label>

            <div className="form-field form-field--full">
              <label>Guardias *</label>
              <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() =>
                    setForm({
                      ...form,
                      guardIds: (guards.data || [])
                        .filter((guard) => guard.active)
                        .map((guard) => guard.id),
                    })
                  }
                >
                  Seleccionar activos
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setForm({ ...form, guardIds: [] })}
                >
                  Limpiar selección
                </button>
              </div>
              <div className="member-picker">
                {(activeGuards || []).map((guard) => (
                  <label key={guard.id}>
                    <input
                      type="checkbox"
                      checked={form.guardIds.includes(guard.id)}
                      onChange={() => toggleGuard(guard.id)}
                    />
                    <span>
                      <b>{guard.code}</b> {guard.firstName} {guard.lastName}
                    </span>
                  </label>
                ))}
              </div>
              <small>
                {form.guardIds.length} guardia(s) seleccionado(s). La misma ruta
                se asignará a todos ellos.
              </small>
              {guards.isError && (
                <span role="alert">No se pudieron cargar los guardias.</span>
              )}
            </div>

            <label className="check-field">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm({ ...form, active: event.target.checked })
                }
              />
              Ruta activa
            </label>

            <label className="form-field form-field--full">
              Descripción
              <textarea
                maxLength={2000}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>

            <div className="form-field--full">
              <GeometryEditor
                mode="LineString"
                value={form.geoJson}
                onChange={(geoJson) => setForm({ ...form, geoJson })}
              />
            </div>

            <div className="form-actions form-field--full">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setForm(null)}
              >
                Cancelar
              </button>
              <button
                className="button button--primary"
                disabled={save.isPending || guards.isLoading}
              >
                {save.isPending ? 'Guardando…' : 'Guardar ruta'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
