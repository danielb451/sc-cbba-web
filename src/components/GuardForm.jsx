import { useEffect, useMemo, useState } from 'react';

const EMPTY = {
  code: '', ci: '', firstName: '', lastName: '', phone: '', email: '', address: '', position: 'Guardia Municipal', rank: '',
  username: '', password: '', birthDate: '', hireDate: '', patrolId: '', assignedZoneId: '', active: true,
};

export default function GuardForm({ initial, patrols = [], zones = [], onSubmit, onCancel, loading = false }) {
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    if (!initial) {
      setForm(EMPTY);
      setPhoto(null);
      return;
    }
    setForm({
      ...EMPTY,
      code: initial.code || '',
      ci: initial.ci || '',
      firstName: initial.firstName || '',
      lastName: initial.lastName || '',
      phone: initial.phone || '',
      email: initial.email || initial.user?.email || '',
      address: initial.address || '',
      position: initial.position || 'Guardia Municipal',
      rank: initial.rank || '',
      username: initial.user?.username || '',
      birthDate: initial.birthDate?.slice?.(0, 10) || '',
      hireDate: initial.hireDate?.slice?.(0, 10) || '',
      patrolId: initial.patrolMembers?.[0]?.patrol?.id || '',
      assignedZoneId: initial.assignedZone?.id || '',
      active: initial.active ?? true,
    });
    setPhoto(null);
  }, [initial]);

  const availablePatrols = useMemo(() => patrols.filter((p) => p.status === 'ACTIVA' || p.id === form.patrolId), [patrols, form.patrolId]);
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      position: form.position || 'Guardia Municipal',
      rank: form.rank || null,
      birthDate: form.birthDate || null,
      hireDate: form.hireDate || null,
      patrolId: form.patrolId || null,
      assignedZoneId: form.assignedZoneId || null,
    };
    if (initial && !payload.password) delete payload.password;
    onSubmit?.(payload, photo);
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="form-field"><label>Código GM *</label><input value={form.code} onChange={set('code')} required /></div>
      <div className="form-field"><label>CI *</label><input value={form.ci} onChange={set('ci')} required /></div>
      <div className="form-field"><label>Nombres *</label><input value={form.firstName} onChange={set('firstName')} required /></div>
      <div className="form-field"><label>Apellidos *</label><input value={form.lastName} onChange={set('lastName')} required /></div>
      <div className="form-field"><label>Teléfono</label><input value={form.phone} onChange={set('phone')} /></div>
      <div className="form-field"><label>Correo</label><input type="email" value={form.email} onChange={set('email')} /></div>
      <div className="form-field form-field--full"><label>Dirección</label><input value={form.address} onChange={set('address')} /></div>
      <div className="form-field"><label>Cargo</label><input value={form.position} onChange={set('position')} /></div>
      <div className="form-field"><label>Rango / grado</label><input value={form.rank} onChange={set('rank')} placeholder="Guardia I" /></div>
      <div className="form-field"><label>Fecha de nacimiento</label><input type="date" value={form.birthDate} onChange={set('birthDate')} /></div>
      <div className="form-field"><label>Fecha de ingreso</label><input type="date" value={form.hireDate} onChange={set('hireDate')} /></div>
      <div className="form-field"><label>Usuario móvil *</label><input value={form.username} onChange={set('username')} required /></div>
      <div className="form-field"><label>{initial ? 'Nueva contraseña móvil' : 'Contraseña móvil *'}</label><input type="password" value={form.password} onChange={set('password')} required={!initial} minLength={8} placeholder={initial ? 'Dejar vacío para conservar' : 'Mínimo 8 caracteres'} /></div>
      <div className="form-field"><label>Patrulla / Base</label><select value={form.patrolId} onChange={set('patrolId')}><option value="">Sin base</option>{availablePatrols.map((p) => <option value={p.id} key={p.id}>{p.code} · {p.name || 'Base operativa'}</option>)}</select></div>
      <div className="form-field"><label>Zona de patrullaje</label><select value={form.assignedZoneId} onChange={set('assignedZoneId')}><option value="">Heredar de la base / Sin zona</option>{zones.filter((z) => z.active).map((z) => <option value={z.id} key={z.id}>{z.name}</option>)}</select></div>
      <div className="form-field form-field--full"><label>Fotografía</label><input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} /><small>La imagen se almacena en users.photo_url. Máximo 5 MB.</small></div>
      <label className="check-field form-field--full"><input type="checkbox" checked={form.active} onChange={set('active')} /> Guardia activo</label>
      <div className="form-actions form-field--full"><button type="button" className="button button--ghost" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={loading}>{loading ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear guardia'}</button></div>
    </form>
  );
}
