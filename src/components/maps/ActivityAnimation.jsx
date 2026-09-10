import { useEffect, useMemo, useState } from 'react';
import Lottie from 'lottie-react';
import { ShieldCheck } from 'lucide-react';

const animations = {
  default: '/animations/police_sheriff.json',
  walking: '/animations/policia_caminando.json',
  running: '/animations/policia_corriendo.json',
  stale: '/animations/policia_triste_2.json',
  offline: '/animations/policia_triste.json',
  watching: '/animations/policia_vigilando.json',
};

export default function ActivityAnimation({ guard }) {
  const [data, setData] = useState(null);
  const state = useMemo(() => {
    if (!guard) return 'default';
    if (guard.connectionStatus === 'SIN_COMUNICACION') return 'offline';
    if (guard.connectionStatus === 'DESACTUALIZADA' || guard.connectionStatus === 'SIN_DATOS') return 'stale';
    const speed = Number(guard.lastLocation?.speed || 0);
    if (speed > 2.4) return 'running';
    if (speed > 0.35) return 'walking';
    return 'watching';
  }, [guard]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(animations[state])
      .then((response) => {
        if (!response.ok) throw new Error('Animation not found');
        return response.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setData(null));
    return () => { cancelled = true; };
  }, [state]);

  return (
    <div className="activity-animation">
      {data ? <Lottie animationData={data} loop className="activity-animation__lottie" /> : <ShieldCheck size={42} />}
      <div>
        <small>Actividad actual</small>
        <strong>{state === 'running' ? 'Corriendo' : state === 'walking' ? 'En movimiento' : state === 'offline' ? 'Sin comunicación' : state === 'stale' ? 'Ubicación desactualizada' : state === 'watching' ? 'Vigilando' : 'Operativo'}</strong>
      </div>
    </div>
  );
}
