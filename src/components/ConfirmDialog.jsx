import Modal from './Modal.jsx';

export default function ConfirmDialog({ open, title = 'Confirmar acción', text, confirmLabel = 'Confirmar', danger = false, onConfirm, onClose, loading = false }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="confirm-text">{text}</p>
      <div className="form-actions">
        <button className="button button--ghost" onClick={onClose} disabled={loading}>Cancelar</button>
        <button className={`button ${danger ? 'button--danger' : 'button--primary'}`} onClick={onConfirm} disabled={loading}>
          {loading ? 'Procesando...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
