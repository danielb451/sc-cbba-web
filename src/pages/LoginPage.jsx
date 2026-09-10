import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, LogIn, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiError } from '../api/client.js';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ login: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(form.login, form.password);
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-page__shape login-page__shape--a" />
      <div className="login-page__shape login-page__shape--b" />
      <section className="login-info">
        <div className="login-brands">
          <div className="login-brand">
            <BrandLogo src="/branding/logo_alcaldia_cbba.png" alt="Alcaldía de Cochabamba" className="login-brand__logo" />
            <div><b>ALCALDÍA DE</b><strong>COCHABAMBA</strong></div>
          </div>
          <span className="login-brands__divider" />
          <div className="login-brand">
            <BrandLogo src="/branding/logo_dsc.png" alt="Dirección de Seguridad Ciudadana" className="login-brand__logo" />
            <div><strong>SEGURIDAD<br />CIUDADANA</strong><small>CENTRO DE OPERACIONES</small></div>
          </div>
        </div>
        <div className="login-info__copy">
          <div className="eyebrow"><span /> CENTRO DE OPERACIONES</div>
          <h1>Seguridad Ciudadana <em>Cochabamba</em></h1>
          <p className="login-info__tagline">PREVENCIÓN · ATENCIÓN · UNA CIUDAD MÁS SEGURA</p>
          <blockquote>“Ciudad segura, comunidad más fuerte”</blockquote>
        </div>
        <div className="login-skyline" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </section>

      <section className="login-panel-wrap">
        <div className="login-watermark"><ShieldCheck size={160} /></div>
        <form className="login-card" onSubmit={submit}>
          <h2>Bienvenido</h2>
          <p>Ingresa con tus credenciales asignadas por administración.</p>
          <label className="floating-field">
            <span><UserRound size={18} /> Usuario o correo</span>
            <input autoFocus autoComplete="username" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="Usuario o correo" required />
          </label>
          <label className="floating-field floating-field--password">
            <span><LockKeyhole size={18} /> Contraseña</span>
            <input type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Contraseña" required />
            <button type="button" onClick={() => setShow((value) => !value)} aria-label="Mostrar contraseña">{show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
          </label>
          <button className="button button--login" disabled={loading}><LogIn size={20} /> {loading ? 'INGRESANDO...' : 'INICIAR SESIÓN'}</button>
          <div className="login-card__separator"><span /> <i /> <span /></div>
          <small>Acceso exclusivo para personal autorizado de la Dirección de Seguridad Ciudadana.</small>
        </form>
      </section>
    </main>
  );
}
