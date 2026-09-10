import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { catalogApi, userApi } from '../api/endpoints.js';
import { apiError } from '../api/client.js';
import SectionHeader from '../components/SectionHeader.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import Modal from '../components/Modal.jsx';
import UserForm from '../components/UserForm.jsx';
import { dateTime } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

export default function UsersPage(){
  const toast=useToast(); const qc=useQueryClient(); const [modal,setModal]=useState(null);
  const users=useQuery({queryKey:['users'],queryFn:userApi.list}); const roles=useQuery({queryKey:['roles'],queryFn:catalogApi.roles});
  const save=useMutation({mutationFn:async({initial,payload,photo})=>{const result=initial?await userApi.update(initial.id,payload):await userApi.create(payload);if(photo)await userApi.photo(result.id,photo);return result},onSuccess:()=>{qc.invalidateQueries({queryKey:['users']});setModal(null);toast.success('Usuario administrativo guardado')},onError:e=>toast.error(apiError(e))});
  return <div><SectionHeader title="Usuarios" text="Cuentas administrativas para administradores, supervisores y operadores. Los guardias se gestionan desde Guardias." actions={<button className="button button--primary" onClick={()=>setModal({type:'create'})}><Plus size={18}/> Nuevo usuario</button>}/>
    <section className="panel table-panel">{users.isLoading?<LoadingState/>:users.data?.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Editar</th></tr></thead><tbody>{users.data.map(u=><tr key={u.id}><td><div className="person-cell"><UserAvatar src={u.photoUrl} name={u.username} size={42}/><div><strong>{u.username}</strong><small>Usuario administrativo</small></div></div></td><td>{u.email||'—'}</td><td><b>{u.role?.name}</b></td><td><StatusBadge active={u.active}/></td><td>{dateTime(u.lastLoginAt)}</td><td><button className="table-action" onClick={()=>setModal({type:'edit',user:u})}><Pencil size={18}/></button></td></tr>)}</tbody></table></div>:<EmptyState title="Sin usuarios administrativos"/>}</section>
    <Modal open={Boolean(modal)} title={modal?.type==='edit'?'Editar usuario':'Nuevo usuario administrativo'} subtitle="La fotografía se almacena en users.photo_url para que también pueda verse en el menú lateral." onClose={()=>setModal(null)}><UserForm initial={modal?.user} roles={roles.data||[]} loading={save.isPending} onCancel={()=>setModal(null)} onSubmit={(payload,photo)=>save.mutate({initial:modal?.user,payload,photo})}/></Modal>
  </div>;
}
