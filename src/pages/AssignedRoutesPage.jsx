import { useState } from 'react';
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
  guardId: '',
  toleranceMeters: 50,
  active: true,
  geoJson: null,
};
export default function AssignedRoutesPage() {
  const qc = useQueryClient(),
    toast = useToast();
  const [form, setForm] = useState(null);
  const routes = useQuery({
    queryKey: ['assigned-routes'],
    queryFn: assignedRouteApi.list,
  });
  const guards = useQuery({
    queryKey: ['guards', 'all-route-options'],
    queryFn: async () => {
      let page = 1,
        items = [];
      while (true) {
        const data = await guardApi.list({ page, limit: 100 });
        items.push(...data.items);
        if (data.items.length < 100) break;
        page++;
      }
      return items;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['assigned-routes'] });
    qc.invalidateQueries({ queryKey: ['locations'] });
  };
  const save = useMutation({
    mutationFn: () => {
      const { id, ...payload } = form;
      return id
        ? assignedRouteApi.update(id, payload)
        : assignedRouteApi.create(payload);
    },
    onSuccess: () => {
      refresh();
      setForm(null);
      toast.success('Ruta asignada guardada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: assignedRouteApi.remove,
    onSuccess: () => {
      refresh();
      toast.success('Ruta eliminada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <div>
      <SectionHeader
        title="Rutas asignadas"
        text="Define el recorrido de cada guardia. Al activar una ruta se desactiva su asignación anterior."
        actions={
          <button
            className="button button--primary"
            onClick={() => setForm({ ...empty })}
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
                  <th>Guardia</th>
                  <th>Tolerancia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {routes.data?.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.name}</b>
                      <br />
                      {r.description}
                    </td>
                    <td>
                      {r.guard.code} · {r.guard.firstName} {r.guard.lastName}
                    </td>
                    <td>{r.toleranceMeters} m</td>
                    <td>{r.active ? 'Activa' : 'Inactiva'}</td>
                    <td>
                      <button
                        className="button button--secondary"
                        onClick={() =>
                          setForm({
                            id: r.id,
                            ...Object.fromEntries(
                              Object.keys(empty).map((k) => [
                                k,
                                r[k] ?? empty[k],
                              ]),
                            ),
                          })
                        }
                      >
                        Editar
                      </button>{' '}
                      <button
                        className="button button--ghost"
                        disabled={remove.isPending}
                        onClick={() =>
                          window.confirm(`¿Eliminar la ruta «${r.name}»?`) &&
                          remove.mutate(r.id)
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!routes.data?.length && (
              <p>No hay rutas asignadas. Crea la primera para comenzar.</p>
            )}
          </div>
        </section>
      )}
      <Modal
        open={!!form}
        title={form?.id ? 'Editar ruta asignada' : 'Nueva ruta asignada'}
        wide
        onClose={() => setForm(null)}
      >
        {form && (
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.geoJson || form.geoJson.coordinates.length < 2)
                return toast.error('Dibuja al menos dos puntos');
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="form-field">
              Guardia
              <select aria-label="Guardia"
                required
                value={form.guardId}
                onChange={(e) => setForm({ ...form, guardId: e.target.value })}
              >
                <option value="">Seleccionar guardia</option>
                {guards.data
                  ?.filter((g) => g.active || g.id === form.guardId)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} · {g.firstName} {g.lastName}
                    </option>
                  ))}
              </select>
              {guards.isError && (
                <span role="alert">No se pudieron cargar los guardias.</span>
              )}
            </label>
            <label className="form-field">
              Tolerancia de desvío (metros)
              <input
                required
                type="number"
                min={5}
                max={1000}
                value={form.toleranceMeters}
                onChange={(e) =>
                  setForm({ ...form, toleranceMeters: Number(e.target.value) })
                }
              />
              <small>
                Distancia máxima permitida entre el GPS y el trazado.
              </small>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Ruta activa
            </label>
            <label className="form-field form-field--full">
              Descripción
              <textarea
                maxLength={2000}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
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
