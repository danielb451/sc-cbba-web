import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function BrandLogo({ src, alt, className = '', fallback = 'shield' }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`brand-logo-fallback ${className}`} aria-label={alt}>
        <ShieldCheck size={fallback === 'small' ? 24 : 34} />
      </div>
    );
  }
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}
