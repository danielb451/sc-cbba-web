import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileImage, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { incidentApi } from '../api/endpoints.js';
import { apiError } from '../api/client.js';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import IncidentDetailMap from '../components/maps/IncidentDetailMap.jsx';
import { assetUrl, dateTime } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['incident', id], queryFn: () => incidentApi.get(id) });
  const [form, setForm] = useState({ status: 'REPORTADO', supervisorNotes: '' });

  useEffect(() => {
    if (query.data) setForm({ status: query.data.status, supervisorNotes: query.data.supervisorNotes || '' });
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => incidentApi.status(id, form),
    onSuccess: (data) => {
      queryClient.setQueryData(['incident', id], data);
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Gestión del supervisor actualizada');
    },
    onError: (error) => toast.error(apiError(error)),
  });

  if (query.isLoading) return <LoadingState label="Cargando detalle del hecho..." />;
  const item = query.data;
  if (!item) return <EmptyState title="Hecho no encontrado" />;
  const zone = item.service?.zone || item.service?.patrol?.zone;

  return (
    <div>
      <button className="back-button" onClick={() => navigate('/hechos')}><ArrowLeft size={17}/> Volver a Hechos</button>
      <section className="incident-detail-heading panel">
        <div className="incident-detail-heading__icon"><ShieldCheck size={30}/></div>
        <div><span>{item.code}</span><h1>{item.incidentType?.name || 'Hecho registrado'}</h1><p>{dateTime(item.createdAt)}</p></div>
        <div className="incident-detail-heading__badges"><StatusBadge value={item.priority}/><StatusBadge value={item.status}/></div>
      </section>

      <section className="incident-detail-grid">
        <div className="incident-detail-main">
          <article className="panel content-panel"><header><h3>Descripción</h3></header><p className="incident-description">{item.description}</p></article>
          <article className="panel content-panel"><header><h3>Ubicación y jurisdicción</h3></header><IncidentDetailMap incident={item} height={390}/><div className="location-reference"><MapPin size={18}/><div><strong>{item.approximateAddress || 'Sin dirección de referencia'}</strong><span>{zone?.name || 'Sin zona asignada'} · Lat {Number(item.latitude).toFixed(6)}, Lng {Number(item.longitude).toFixed(6)}</span></div></div></article>
          <article className="panel content-panel"><header><h3>Evidencia multimedia</h3><span>{item.media?.length || 0} archivos</span></header>{item.media?.length ? <div className="media-grid">{item.media.map((media) => media.type === 'VIDEO' ? <video key={media.id} src={assetUrl(media.url)} controls/> : <a href={assetUrl(media.url)} target="_blank" rel="noreferrer" key={media.id}><img src={assetUrl(media.url)} alt="Evidencia del hecho"/></a>)}</div> : <EmptyState title="Sin evidencia" text="Este hecho no contiene fotografías o videos." action={<FileImage size={22}/>} />}</article>
        </div>

        <aside className="incident-detail-side">
          <article className="panel reporter-card"><header><h3>Reportado por</h3></header><div className="reporter-card__identity"><UserAvatar src={item.guard?.user?.photoUrl} name={item.guard?.firstName} size={58}/><div><strong>{item.guard?.firstName} {item.guard?.lastName}</strong><span>{item.guard?.code}</span><small>{item.guard?.rank || item.guard?.position || 'Guardia Municipal'}</small></div></div><div className="detail-list"><span><UserRound/>Servicio <b>{item.service?.id?.slice(0,8)}...</b></span><span><MapPin/>Base <b>{item.service?.patrol?.name || item.service?.patrol?.code || 'Sin base'}</b></span><span><ShieldCheck/>Zona <b>{zone?.name || 'Sin zona'}</b></span></div></article>
          <article className="panel supervisor-card"><header><h3>Gestión del supervisor</h3></header><label className="form-field"><span>Estado del hecho</span><select value={form.status} disabled={!can('incidents.manage')} onChange={(e)=>setForm({...form,status:e.target.value})}><option>REPORTADO</option><option>EN_REVISION</option><option>ATENDIDO</option><option>CERRADO</option></select></label><label className="form-field"><span>Observaciones del supervisor</span><textarea rows={7} value={form.supervisorNotes} disabled={!can('incidents.manage')} onChange={(e)=>setForm({...form,supervisorNotes:e.target.value})} placeholder="Describe acciones realizadas, derivación o cierre..."/></label>{can('incidents.manage') ? <button className="button button--primary button--full" onClick={()=>save.mutate()} disabled={save.isPending}>{save.isPending?'Actualizando...':'Actualizar hecho'}</button> : null}</article>
        </aside>
      </section>
    </div>
  );
}
