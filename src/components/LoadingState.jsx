export default function LoadingState({ label = 'Cargando...', fullscreen = false }) {
  return (
    <div className={`loading-state ${fullscreen ? 'loading-state--fullscreen' : ''}`}>
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}
