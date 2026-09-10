import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Sin registros', text = 'Todavía no existen datos para mostrar.', action = null }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon"><Inbox size={30} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
