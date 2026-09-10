import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
export default function NotFoundPage(){return <EmptyState title="Página no encontrada" text="La ruta solicitada no existe." action={<Link className="button button--primary" to="/">Volver al inicio</Link>}/>}
