import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Braces, Plus, Save, ShieldCheck } from 'lucide-react';
import { catalogApi } from '../api/endpoints.js';
import { apiError } from '../api/client.js';
import SectionHeader from '../components/SectionHeader.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';

import GeometryEditor from '../components/maps/GeometryEditor.jsx';
const tabs = ['General', 'Zonas', 'Tipos de hechos', 'Roles y permisos'];

function parseValue(value) {
  const text = String(value).trim();
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text !== '' && !Number.isNaN(Number(text))) return Number(text);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export default function SettingsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('General');
  const [zoneModal, setZoneModal] = useState(null);
  const [typeModal, setTypeModal] = useState(null);
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: catalogApi.settings,
  });
  const zones = useQuery({ queryKey: ['zones'], queryFn: catalogApi.zones });
  const types = useQuery({
    queryKey: ['incident-types'],
    queryFn: catalogApi.incidentTypes,
  });
  const roles = useQuery({ queryKey: ['roles'], queryFn: catalogApi.roles });
  const [settingValues, setSettingValues] = useState({});
  useEffect(() => {
    if (settings.data)
      setSettingValues(
        Object.fromEntries(
          settings.data.map((s) => [
            s.key,
            typeof s.value === 'object'
              ? JSON.stringify(s.value)
              : String(s.value),
          ]),
        ),
      );
  }, [settings.data]);
  const saveSetting = useMutation({
    mutationFn: ({ key, description }) =>
      catalogApi.updateSetting(key, {
        value:
          key === 'system.name'
            ? settingValues[key]
            : parseValue(settingValues[key]),
        description,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['runtime-settings'] });
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Configuración actualizada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const saveZone = useMutation({
    mutationFn: ({ initial, payload }) =>
      initial
        ? catalogApi.updateZone(initial.id, payload)
        : catalogApi.createZone(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      qc.invalidateQueries({ queryKey: ['locations'] });
      qc.invalidateQueries({ queryKey: ['patrols'] });
      setZoneModal(null);
      toast.success('Zona guardada');
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const saveType = useMutation({
    mutationFn: ({ initial, payload }) =>
      initial
        ? catalogApi.updateIncidentType(initial.id, payload)
        : catalogApi.createIncidentType(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident-types'] });
      setTypeModal(null);
      toast.success('Tipo de hecho guardado');
    },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <div>
      <SectionHeader
        title="Configuración"
        text="Parámetros generales, zonas geográficas, catálogo de hechos y consulta de roles/permisos."
      />
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'General' ? (
        <section className="settings-grid">
          {settings.isLoading ? (
            <LoadingState />
          ) : settings.data?.length ? (
            settings.data.map((s) => (
              <article className="panel setting-card" key={s.id}>
                <div>
                  <h3>{s.label}</h3>
                  <p>{s.description || 'Sin descripción'}</p>
                </div>
                <input
                  aria-label={s.label}
                  type={s.key === 'system.name' ? 'text' : 'number'}
                  min={1}
                  max={s.key === 'INCIDENT_HOTSPOT_HOURS' ? 8760 : 86400}
                  value={settingValues[s.key] ?? ''}
                  onChange={(e) =>
                    setSettingValues((v) => ({ ...v, [s.key]: e.target.value }))
                  }
                />
                <button
                  className="button button--secondary"
                  disabled={saveSetting.isPending}
                  onClick={() =>
                    saveSetting.mutate({
                      key: s.key,
                      description: s.description,
                    })
                  }
                >
                  <Save size={16} /> Guardar
                </button>
              </article>
            ))
          ) : (
            <EmptyState title="Sin parámetros" />
          )}
        </section>
      ) : null}
      {tab === 'Zonas' ? (
        <>
          <div className="tab-actions">
            <button
              className="button button--primary"
              onClick={() => setZoneModal({ type: 'create' })}
            >
              <Plus size={17} /> Nueva zona
            </button>
          </div>
          <section className="cards-grid">
            {zones.data?.map((z) => (
              <button
                className="panel zone-card"
                key={z.id}
                onClick={() => setZoneModal({ type: 'edit', zone: z })}
              >
                <div>
                  <ShieldCheck size={23} />
                  <h3>{z.name}</h3>
                </div>
                <p>{z.description || 'Sin descripción'}</p>
                <footer>
                  <StatusBadge active={z.active} />
                  <span>
                    {z.geoJson ? 'GeoJSON configurado' : 'Sin geometría'}
                  </span>
                </footer>
              </button>
            ))}
          </section>
        </>
      ) : null}
      {tab === 'Tipos de hechos' ? (
        <>
          <div className="tab-actions">
            <button
              className="button button--primary"
              onClick={() => setTypeModal({ type: 'create' })}
            >
              <Plus size={17} /> Nuevo tipo
            </button>
          </div>
          <section className="panel table-panel">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {types.data?.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setTypeModal({ type: 'edit', item: t })}
                      className="clickable-row"
                    >
                      <td>
                        <b>{t.name}</b>
                      </td>
                      <td>{t.description || '—'}</td>
                      <td>
                        <StatusBadge active={t.active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
      {tab === 'Roles y permisos' ? (
        <section className="roles-grid">
          {roles.isLoading ? (
            <LoadingState />
          ) : (
            roles.data?.map((r) => (
              <article className="panel role-card" key={r.id}>
                <header>
                  <ShieldCheck size={24} />
                  <div>
                    <h3>{r.name}</h3>
                    <p>{r.description}</p>
                  </div>
                </header>
                <div className="permission-chips">
                  {r.permissions?.map((p) => (
                    <span key={p.permission.id}>{p.permission.key}</span>
                  ))}
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}
      <ZoneModal
        open={Boolean(zoneModal)}
        initial={zoneModal?.zone}
        zones={zones.data || []}
        loading={saveZone.isPending}
        onClose={() =>
          setZoneModal(null)
        }
        onSave={(payload) =>
          saveZone.mutate({
            initial: zoneModal?.zone,
            payload,
          })
        }
      />
      <TypeModal
        open={Boolean(typeModal)}
        initial={typeModal?.item}
        loading={saveType.isPending}
        onClose={() => setTypeModal(null)}
        onSave={(payload) =>
          saveType.mutate({ initial: typeModal?.item, payload })
        }
      />
    </div>
  );
}

function ZoneModal({open,initial,zones = [],onClose,onSave,loading,}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    active: true,
    geoJson: null,
  });
  useEffect(() => {
    setForm(
      initial
        ? {
            name: initial.name || '',
            description: initial.description || '',
            active: initial.active ?? true,
            geoJson: initial.geoJson || null,
          }
        : { name: '', description: '', active: true, geoJson: null },
    );
  }, [initial, open]);

  const referenceZones =
    useMemo(() => {
      return zones.filter(
        (zone) =>
          zone.id !== initial?.id &&
          zone.active !== false &&
          Boolean(zone.geoJson),
      );
    }, [zones, initial?.id]);

  const submit = (e) => {
    e.preventDefault();
    onSave({
      name: form.name,
      description: form.description || null,
      active: form.active,
      geoJson: form.geoJson,
    });
  };
  return (
    <Modal
      open={open}
      title={initial ? 'Editar zona' : 'Nueva zona'}
      subtitle="Marca los límites de la zona y ajusta sus puntos sobre el mapa."
      onClose={onClose}
      wide
    >
      <form className="form-grid" onSubmit={submit}>
        <div className="form-field">
          <label>Nombre *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <label className="check-field">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />{' '}
          Zona activa
        </label>
        <div className="form-field form-field--full">
          <label>Descripción</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="form-field form-field--full">
          <label>Delimitar jurisdicción en el mapa</label>
          <GeometryEditor
            key={`${open}-${initial?.id || 'new'}`}
            value={form.geoJson}
            referenceZones={referenceZones}
            onChange={(geoJson) =>
              setForm({
                ...form,
                geoJson,
              })
            }
          />
        </div>
        <div className="form-actions form-field--full">
          <button
            type="button"
            className="button button--ghost"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button button--primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar zona'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function TypeModal({ open, initial, onClose, onSave, loading }) {
  const [form, setForm] = useState({ name: '', description: '', active: true });
  useEffect(
    () =>
      setForm(
        initial
          ? {
              name: initial.name || '',
              description: initial.description || '',
              active: initial.active ?? true,
            }
          : { name: '', description: '', active: true },
      ),
    [initial, open],
  );
  return (
    <Modal
      open={open}
      title={initial ? 'Editar tipo de hecho' : 'Nuevo tipo de hecho'}
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...form, description: form.description || null });
        }}
      >
        <div className="form-field form-field--full">
          <label>Nombre *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="form-field form-field--full">
          <label>Descripción</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <label className="check-field form-field--full">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />{' '}
          Tipo activo
        </label>
        <div className="form-actions form-field--full">
          <button
            type="button"
            className="button button--ghost"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button button--primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar tipo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
