import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Plus, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { catalogApi, guardApi, patrolApi } from '../api/endpoints.js';
import { apiError } from '../api/client.js';
import SectionHeader from '../components/SectionHeader.jsx';
import SearchInput from '../components/SearchInput.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import GuardForm from '../components/GuardForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { shortDate } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function GuardsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const guards = useQuery({ queryKey: ['guards', search], queryFn: () => guardApi.list({ search, limit: 500 }) });
  const patrols = useQuery({ queryKey: ['patrols'], queryFn: patrolApi.list });
  const zones = useQuery({ queryKey: ['zones'], queryFn: catalogApi.zones });

  const save = useMutation({
    mutationFn: async ({ initial, payload, photo }) => {
      const result = initial ? await guardApi.update(initial.id, payload) : await guardApi.create(payload);
      if (photo) await guardApi.photo(result.id, photo);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      queryClient.invalidateQueries({ queryKey: ['services', 'guards'] });
      queryClient.invalidateQueries({ queryKey: ['patrols'] });
      setModal(null);
      toast.success('Guardia guardado correctamente');
    },
    onError: (error) => toast.error(apiError(error)),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, active }) => guardApi.status(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      setConfirm(null);
      toast.success('Estado del guardia actualizado');
    },
    onError: (error) => toast.error(apiError(error)),
  });

  const items = guards.data?.items || [];

  return (
    <div>
      <SectionHeader title="Guardias" text="Administración de funcionarios, acceso móvil, asignación operativa y estado." actions={can('guards.manage') ? <button className="button button--primary" onClick={() => setModal({ type: 'create' })}><Plus size={18} /> Nuevo guardia</button> : null} />
      <div className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, correo, código GM o CI..." /><span className="toolbar__count">{guards.data?.pagination?.total || 0} guardias</span></div>

      <section className="panel table-panel">
        {guards.isLoading ? <LoadingState /> : items.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Guardia / email</th><th>Código</th><th>CI</th><th>Rango</th><th>Ingreso</th><th>Estado</th><th>Vista</th><th>Edición</th><th>Desactivar</th></tr></thead>
              <tbody>{items.map((guard) => (
                <tr key={guard.id}>
                  <td><div className="person-cell"><UserAvatar src={guard.user?.photoUrl} name={`${guard.firstName} ${guard.lastName}`} size={40} /><div><strong>{guard.firstName} {guard.lastName}</strong><small>{guard.email || guard.user?.email || 'Sin correo'}</small></div></div></td>
                  <td><b>{guard.code}</b></td><td>{guard.ci}</td><td>{guard.rank || '—'}</td><td>{shortDate(guard.hireDate)}</td><td><StatusBadge active={guard.active} /></td>
                  <td><button className="table-action" title="Ver perfil" onClick={() => navigate(`/guardias/${guard.id}`)}><Eye size={18} /></button></td>
                  <td><button className="table-action" title="Editar" disabled={!can('guards.manage')} onClick={() => setModal({ type: 'edit', guard })}><Pencil size={18} /></button></td>
                  <td><button className={`table-action ${guard.active ? 'table-action--danger' : 'table-action--success'}`} title={guard.active ? 'Desactivar' : 'Activar'} disabled={!can('guards.manage')} onClick={() => setConfirm(guard)}><ShieldOff size={18} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState title="No se encontraron guardias" text="Cambia los filtros o registra el primer guardia." />}
      </section>

      <Modal open={Boolean(modal)} title={modal?.type === 'edit' ? 'Editar guardia' : 'Nuevo guardia'} subtitle="Los datos de acceso móvil se guardan en users y el perfil operativo en guards." onClose={() => setModal(null)} wide>
        <GuardForm initial={modal?.guard} patrols={patrols.data || []} zones={zones.data || []} loading={save.isPending} onCancel={() => setModal(null)} onSubmit={(payload, photo) => save.mutate({ initial: modal?.guard, payload, photo })} />
      </Modal>

      <ConfirmDialog open={Boolean(confirm)} title={confirm?.active ? 'Desactivar guardia' : 'Activar guardia'} text={confirm ? `${confirm.firstName} ${confirm.lastName} (${confirm.code}) ${confirm.active ? 'dejará de poder iniciar sesión y servicios.' : 'volverá a quedar habilitado.'}` : ''} confirmLabel={confirm?.active ? 'Desactivar' : 'Activar'} danger={confirm?.active} loading={changeStatus.isPending} onClose={() => setConfirm(null)} onConfirm={() => changeStatus.mutate({ id: confirm.id, active: !confirm.active })} />
    </div>
  );
}
