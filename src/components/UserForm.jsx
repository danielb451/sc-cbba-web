import { useEffect, useState } from 'react';

const EMPTY={username:'',email:'',password:'',roleId:'',active:true};
export default function UserForm({initial,roles=[],onSubmit,onCancel,loading}){
  const [form,setForm]=useState(EMPTY); const [photo,setPhoto]=useState(null);
  useEffect(()=>{setForm(initial?{username:initial.username||'',email:initial.email||'',password:'',roleId:initial.role?.id||'',active:initial.active??true}:EMPTY);setPhoto(null)},[initial]);
  const set=k=>e=>setForm(v=>({...v,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const submit=e=>{e.preventDefault();const payload={...form,email:form.email||null};if(initial&&!payload.password)delete payload.password;onSubmit?.(payload,photo)};
  return <form className="form-grid" onSubmit={submit}>
    <div className="form-field"><label>Usuario *</label><input required value={form.username} onChange={set('username')}/></div>
    <div className="form-field"><label>Correo</label><input type="email" value={form.email} onChange={set('email')}/></div>
    <div className="form-field"><label>{initial?'Nueva contraseña':'Contraseña *'}</label><input type="password" minLength={8} required={!initial} value={form.password} onChange={set('password')} placeholder={initial?'Dejar vacío para conservar':'Mínimo 8 caracteres'}/></div>
    <div className="form-field"><label>Rol *</label><select required value={form.roleId} onChange={set('roleId')}><option value="">Seleccionar</option>{roles.filter(r=>r.name!=='GUARDIA').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
    <div className="form-field form-field--full"><label>Fotografía</label><input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files?.[0]||null)}/><small>Se guardará en users.photo_url.</small></div>
    <label className="check-field form-field--full"><input type="checkbox" checked={form.active} onChange={set('active')}/> Usuario activo</label>
    <div className="form-actions form-field--full"><button type="button" className="button button--ghost" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={loading}>{loading?'Guardando...':initial?'Guardar cambios':'Crear usuario'}</button></div>
  </form>;
}
