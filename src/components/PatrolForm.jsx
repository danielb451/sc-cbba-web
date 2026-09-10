import { useEffect, useState } from 'react';

const EMPTY = { code: '', name: '', zoneId: '', responsibleGuardId: '', startTime: '', endTime: '', address: '', latitude: '', longitude: '', description: '', status: 'ACTIVA', memberIds: [] };

export default function PatrolForm({ initial, guards = [], zones = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(EMPTY);
  useEffect(() => {
    if (!initial) return setForm(EMPTY);
    setForm({
      code: initial.code || '', name: initial.name || '', zoneId: initial.zoneId || '', responsibleGuardId: initial.responsibleGuardId || '',
      startTime: initial.startTime || '', endTime: initial.endTime || '', address: initial.address || '', latitude: initial.latitude ?? '', longitude: initial.longitude ?? '',
      description: initial.description || '', status: initial.status || 'ACTIVA', memberIds: initial.members?.map((m)=>m.guardId) || [],
    });
  }, [initial]);
  const set=(key)=>(e)=>setForm(v=>({...v,[key]:e.target.value}));
  const toggleMember=(id)=>setForm(v=>({...v,memberIds:v.memberIds.includes(id)?v.memberIds.filter(x=>x!==id):[...v.memberIds,id]}));
  const submit=(e)=>{e.preventDefault();onSubmit?.({...form,zoneId:form.zoneId||null,responsibleGuardId:form.responsibleGuardId||null,startTime:form.startTime||null,endTime:form.endTime||null,address:form.address||null,latitude:form.latitude===''?null:Number(form.latitude),longitude:form.longitude===''?null:Number(form.longitude),description:form.description||null});};
  return <form className="form-grid" onSubmit={submit}>
    <div className="form-field"><label>Código de base *</label><input required value={form.code} onChange={set('code')} placeholder="BASE-001"/></div>
    <div className="form-field"><label>Nombre *</label><input required value={form.name} onChange={set('name')} placeholder="EPI Central / Base Central"/></div>
    <div className="form-field"><label>Zona / jurisdicción</label><select value={form.zoneId} onChange={set('zoneId')}><option value="">Sin zona</option>{zones.filter(z=>z.active).map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
    <div className="form-field"><label>Responsable</label><select value={form.responsibleGuardId} onChange={set('responsibleGuardId')}><option value="">Sin responsable</option>{guards.filter(g=>g.active).map(g=><option key={g.id} value={g.id}>{g.code} · {g.firstName} {g.lastName}</option>)}</select></div>
    <div className="form-field"><label>Horario inicio</label><input type="time" value={form.startTime} onChange={set('startTime')}/></div>
    <div className="form-field"><label>Horario fin</label><input type="time" value={form.endTime} onChange={set('endTime')}/></div>
    <div className="form-field form-field--full"><label>Dirección de la base</label><input value={form.address} onChange={set('address')} placeholder="Dirección de referencia"/></div>
    <div className="form-field"><label>Latitud</label><input type="number" step="0.0000001" value={form.latitude} onChange={set('latitude')} placeholder="-17.39"/></div>
    <div className="form-field"><label>Longitud</label><input type="number" step="0.0000001" value={form.longitude} onChange={set('longitude')} placeholder="-66.15"/></div>
    <div className="form-field form-field--full"><label>Descripción</label><textarea rows={3} value={form.description} onChange={set('description')} placeholder="Cobertura, observaciones y referencia operativa..."/></div>
    <div className="form-field"><label>Estado</label><select value={form.status} onChange={set('status')}><option>ACTIVA</option><option>INACTIVA</option></select></div>
    <div className="form-field form-field--full"><label>Guardias asignados</label><div className="member-picker">{guards.map(g=><label key={g.id}><input type="checkbox" checked={form.memberIds.includes(g.id)} onChange={()=>toggleMember(g.id)}/><span><b>{g.code}</b> {g.firstName} {g.lastName}</span></label>)}</div><small>El responsable se agrega automáticamente como miembro de la base.</small></div>
    <div className="form-actions form-field--full"><button type="button" className="button button--ghost" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={loading}>{loading?'Guardando...':initial?'Guardar cambios':'Crear base'}</button></div>
  </form>;
}
