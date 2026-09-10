import { UserRound } from 'lucide-react';
import { assetUrl } from '../lib/format.js';

export default function UserAvatar({ src, name = 'Usuario', size = 44, className = '' }) {
  const url = assetUrl(src);
  return (
    <div className={`avatar ${className}`} style={{ width: size, height: size }} title={name}>
      {url ? (
        <img src={url} alt={name} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
      ) : null}
      <UserRound className="avatar__fallback" size={Math.round(size * 0.48)} />
    </div>
  );
}
