import { MapPin, ShieldCheck } from 'lucide-react';
import BrandLogo from './BrandLogo.jsx';

export default function PageHero({ title = 'Centro de Operaciones', subtitle = 'Seguridad Ciudadana Cochabamba', compact = false, live = false }) {
  return (
    <section className={`page-hero ${compact ? 'page-hero--compact' : ''}`}>
      <div className="page-hero__content">
        <div className="eyebrow"><span /> CENTRO DE OPERACIONES {live ? <b className="live-pill">● TIEMPO REAL</b> : null}</div>
        <h1>{title}</h1>
        <h2>{subtitle}</h2>
        <p>Prevención · Atención · Tecnología · Una ciudad más segura</p>
      </div>
      <div className="page-hero__visual" aria-hidden="true">
        <div className="radar-ring radar-ring--1" />
        <div className="radar-ring radar-ring--2" />
        <div className="hero-pin"><MapPin size={26} /></div>
        <div className="hero-shield"><ShieldCheck size={35} /></div>
        <BrandLogo src="/branding/logo_alcaldia_cbba.png" alt="Alcaldía de Cochabamba" className="page-hero__watermark" />
      </div>
    </section>
  );
}
